import { adjectives } from '../assets/adjectives'
import {
  choiceCounts,
  gameThemes,
  inventoryCounts,
  keyInformationCounts,
  lossConditions,
  redHerringCounts,
} from '../assets/configurations'
import { nouns } from '../assets/nouns'
import { verbs } from '../assets/verbs'
import {
  inspirationAdjectivesCount,
  inspirationNounsCount,
  inspirationVerbsCount,
  promptIdCreateChoices,
  promptIdCreateGame,
} from '../config'
import {
  Author,
  CreateChoicesPromptOutput,
  CreateGamePromptOutput,
  CyoaGame,
  GameId,
  GameTheme,
  TextPrompt,
} from '../types'
import { formatCreateChoicesOutput, formatCreateGameOutput } from '../utils/formatting'
import { log, logError } from '../utils/logging'
import { getRandomSample } from '../utils/random'
import { slugify } from '../utils/slugify'
import { invokeModel } from './bedrock'
import { getGameById, getGames, getPromptById, setGameById } from './dynamodb'
import {
  generateGameCoverImageForGame,
  generateInventoryImagesForGame,
  generateResourceImageForGame,
} from './image-generation'
import { startInitialNarrativeGeneration } from './narrative-generation-orchestrator'

const generateInspirationWords = (): string[] => {
  const inspirationNouns = getRandomSample([...nouns], inspirationNounsCount)
  const inspirationVerbs = getRandomSample([...verbs], inspirationVerbsCount)
  const inspirationAdjectives = getRandomSample([...adjectives], inspirationAdjectivesCount)
  return inspirationNouns.concat(inspirationVerbs).concat(inspirationAdjectives)
}

const generateGameOutline = async (
  existingGameTitles: string[],
  choiceCount: number,
): Promise<{
  gameOutput: CreateGamePromptOutput
  storyType: GameTheme
  inspirationAuthor: Author
}> => {
  const storyType = getRandomSample([...gameThemes], 1)[0]
  const lossCondition = getRandomSample([...lossConditions], 1)[0]
  const inventoryCount = getRandomSample([...inventoryCounts], 1)[0]
  const minimumResourceRange = choiceCount * 5
  const inspirationAuthor = getRandomSample(storyType.inspirationAuthors, 1)[0]

  const gameModelContext = {
    storyType,
    existingGameTitles,
    lossCondition,
    minimumResourceRange,
    inventoryCount,
    inspirationWords: generateInspirationWords(),
  }
  log('Creating game with context', { gameModelContext })

  const gamePrompt = await getPromptById<TextPrompt>(promptIdCreateGame)
  const gameOutput = await invokeModel<CreateGamePromptOutput>(gamePrompt, gameModelContext)
  Object.entries(gameOutput).map(([key, value]) =>
    log('Game generated', { [key]: JSON.stringify(value, null, 2) }),
  )

  return { gameOutput, storyType, inspirationAuthor }
}

const generateGameChoices = async (
  gameData: Partial<CyoaGame>,
  storyType: GameTheme,
  inspirationAuthor: Author,
  choiceCount: number,
): Promise<CreateChoicesPromptOutput> => {
  const lossCondition = getRandomSample([...lossConditions], 1)[0]
  const keyInformationCount = getRandomSample([...keyInformationCounts], 1)[0]
  const redHerringCount = getRandomSample([...redHerringCounts], 1)[0]

  const choicesModelContext = {
    resourceName: gameData.resourceName,
    startingResourceValue: gameData.startingResourceValue,
    lossResourceThreshold: gameData.lossResourceThreshold,
    lossCondition,
    choiceCount,
    keyInformationCount,
    redHerringCount,
    outline: gameData.outline,
    characters: gameData.characters?.map((c) => c.name),
    inventory: gameData.inventory?.map((i) => i.name),
    style: {
      name: storyType.name,
      description: storyType.description,
      inspirationAuthor: inspirationAuthor.name,
    },
    inspirationWords: generateInspirationWords(),
  }
  log('Creating choices with context', { choicesModelContext })

  const choicesPrompt = await getPromptById<TextPrompt>(promptIdCreateChoices)
  const choicesOutput = await invokeModel<CreateChoicesPromptOutput>(
    choicesPrompt,
    choicesModelContext,
  )
  Object.entries(choicesOutput).map(([key, value]) =>
    log('Choices generated', { [key]: JSON.stringify(value, null, 2) }),
  )

  return choicesOutput
}

const validateGameId = async (gameId: GameId): Promise<void> => {
  const gameIdExists = await getGameById(gameId)
    .then(() => true)
    .catch(() => false)
  if (gameIdExists) {
    log('Game ID already exists', { gameId })
    throw new Error('Game ID already exists')
  }
}

const generateGameImages = async (
  gameId: GameId,
  game: CyoaGame,
  imageDescription: string,
  resourceImageDescription: string,
): Promise<CyoaGame> => {
  const coverImageData = await generateGameCoverImageForGame(gameId, imageDescription)
  const inventoryImageData = await generateInventoryImagesForGame(gameId, game.inventory)
  const resourceImageData = await generateResourceImageForGame(gameId, resourceImageDescription)

  return {
    ...game,
    ...coverImageData,
    ...inventoryImageData,
    ...resourceImageData,
  }
}

export const createGame = async (): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const existingGames = await getGames()
  const existingGameTitles = existingGames.map((existingGame) => existingGame.game.title)

  const choiceCount = getRandomSample([...choiceCounts], 1)[0]

  const { gameOutput, storyType, inspirationAuthor } = await generateGameOutline(
    existingGameTitles,
    choiceCount,
  )
  const { game: partialGame, imageDescription, resourceImageDescription } =
    formatCreateGameOutput(gameOutput)

  const choicesOutput = await generateGameChoices(
    partialGame,
    storyType,
    inspirationAuthor,
    choiceCount,
  )
  const filteredChoicesOutput = {
    ...choicesOutput,
    redHerrings: choicesOutput.redHerrings?.filter(
      (item) => !choicesOutput.keyInformation?.includes(item),
    ),
  }

  const game = formatCreateChoicesOutput(filteredChoicesOutput, partialGame, inspirationAuthor)

  if (game.choicePoints.length !== choiceCount) {
    log('Wrong number of choice points', {
      expected: choiceCount,
      actual: game.choicePoints.length,
    })
    throw new Error('Wrong number of choice points')
  }

  const gameId: GameId = slugify(game.title)
  await validateGameId(gameId)

  const gameWithImages = await generateGameImages(
    gameId,
    game,
    imageDescription,
    resourceImageDescription,
  )

  await setGameById(gameId, gameWithImages)

  try {
    await startInitialNarrativeGeneration(gameId, gameWithImages)
  } catch (error: unknown) {
    logError('Error creating initial narrative', {
      gameId,
      error,
    })
  }

  return { game: gameWithImages, gameId }
}
