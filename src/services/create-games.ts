import { choiceCounts } from '../assets/configurations'
import { CyoaGame, GameId } from '../types'
import { log, logError } from '../utils/logging'
import { getRandomSample } from '../utils/random'
import { slugify } from '../utils/slugify'
import { getGameById, getGames, setGameById } from './dynamodb'
import { generateGameChoices } from './games/choices'
import {
  generateGameCoverImage,
  generateInventoryImages,
  generateResourceImage,
} from './games/game-image-generation'
import { generateGameOutline } from './games/outlines'
import { queueNarrativeGeneration } from './narratives'

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
  coverImageDescription: string,
  resourceImageDescription: string,
): Promise<CyoaGame> => {
  const coverImageData = await generateGameCoverImage(gameId, coverImageDescription)
  const inventoryImageData = await generateInventoryImages(gameId, game.inventory)
  const resourceImageData = await generateResourceImage(gameId, resourceImageDescription)

  return {
    ...game,
    image: coverImageData,
    inventory: inventoryImageData,
    resourceImage: resourceImageData,
  }
}

export const createGame = async (): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const existingGames = await getGames()
  const existingGameTitles = existingGames.map((existingGame) => existingGame.game.title)

  const choiceCount = getRandomSample(choiceCounts, 1)[0]

  const {
    game: partialGame,
    imageDescription,
    inspirationAuthor,
    resourceImageDescription,
    storyType,
  } = await generateGameOutline(existingGameTitles, choiceCount)

  const gameId: GameId = slugify(partialGame.title)
  await validateGameId(gameId)

  for (let index = 0; index < 2; index++) {
    try {
      const game = await generateGameChoices(partialGame, storyType, inspirationAuthor, choiceCount)

      const gameWithImages = await generateGameImages(
        gameId,
        game,
        imageDescription,
        resourceImageDescription,
      )

      await setGameById(gameId, gameWithImages)

      try {
        await queueNarrativeGeneration(gameId, game, 0)
      } catch (error: unknown) {
        logError('Error creating initial narrative', {
          gameId,
          error,
        })
      }

      return { game: gameWithImages, gameId }
    } catch (error: unknown) {
      log('Game options creation failed, retrying', { error })
    }
  }
  throw 'Game options creation failed after 2 attempts'
}
