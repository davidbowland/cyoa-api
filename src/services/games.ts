import slugify from 'slugify'

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
  initialNarrativeId,
  inspirationAdjectivesCount,
  inspirationNounsCount,
  inspirationVerbsCount,
  promptIdCreateGame,
} from '../config'
import { CreateGamePromptOutput, CyoaGame, GameId } from '../types'
import { formatCyoaGame } from '../utils/formatting'
import { log, logError } from '../utils/logging'
import { getRandomSample } from '../utils/random'
import { invokeModel } from './bedrock'
import { getGameById, getGames, getPromptById, setGameById } from './dynamodb'
import { InitialNarrativeStrategy } from './narrative-strategies'
import { startNarrativeGeneration } from './narratives'

export const createGame = async (): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const existingGames = await getGames()
  const existingGameTitles = existingGames.map((existingGame) => existingGame.game.title)

  const storyType = getRandomSample([...gameThemes], 1)[0]
  const choiceCount = getRandomSample([...choiceCounts], 1)[0]
  const lossCondition = getRandomSample([...lossConditions], 1)[0]
  const inventoryCount = getRandomSample([...inventoryCounts], 1)[0]
  const keyInformationCount = getRandomSample([...keyInformationCounts], 1)[0]
  const redHerringCount = getRandomSample([...redHerringCounts], 1)[0]

  const inspirationNouns = getRandomSample([...nouns], inspirationNounsCount)
  const inspirationVerbs = getRandomSample([...verbs], inspirationVerbsCount)
  const inspirationAdjectives = getRandomSample([...adjectives], inspirationAdjectivesCount)

  const modelContext = {
    storyType,
    existingGameTitles,
    choiceCount,
    lossCondition,
    inventoryCount,
    keyInformationCount,
    redHerringCount,
    inspirationWords: inspirationNouns.concat(inspirationVerbs).concat(inspirationAdjectives),
  }
  log('Creating game with context', { modelContext })

  const prompt = await getPromptById(promptIdCreateGame)
  const generatedGame = await invokeModel<CreateGamePromptOutput>(prompt, modelContext)
  log('Game generated', { generatedGame: JSON.stringify(generatedGame, null, 2) })

  const { game } = formatCyoaGame(generatedGame) // imageDescription ignored for now

  if (game.choicePoints.length !== choiceCount) {
    log('Wrong number of choice points', { choiceCount, choicePoints: game.choicePoints })
    throw new Error('Wrong number of choice points')
  }

  const gameId: GameId = slugify(game.title).toLowerCase()
  const gameIdExists = await getGameById(gameId)
    .then(() => true)
    .catch(() => false)
  if (gameIdExists) {
    log('Game ID already exists', { gameId })
    throw new Error('Game ID already exists')
  }
  await setGameById(gameId, game)

  const narrativeContext = InitialNarrativeStrategy.buildContext({
    gameId,
    narrativeId: initialNarrativeId,
    game,
  })
  try {
    await startNarrativeGeneration(
      gameId,
      initialNarrativeId,
      narrativeContext,
      game.choicePoints[0],
    )
  } catch (error: unknown) {
    logError('Error creating narrative', {
      gameId,
      initialNarrativeId,
      narrativeContext,
      error,
    })
  }

  return { game, gameId }
}
