import { CyoaGame, GameId } from '../types'
import { log, logError } from '../utils/logging'
import { getGameGenerationData, setGameById } from './dynamodb'
import { generateGameChoices } from './games/choices'
import { queueNarrativeGeneration } from './narratives'

export const createGameChoices = async (
  gameId: GameId,
): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const { gameData, storyType, inspirationAuthor, choiceCount, image, inventory, resourceImage } =
    await getGameGenerationData(gameId)

  for (let index = 0; index < 2; index++) {
    try {
      const game = await generateGameChoices(gameData, storyType, inspirationAuthor, choiceCount)

      const gameWithImages: CyoaGame = {
        ...game,
        image,
        inventory,
        resourceImage,
      }

      await setGameById(gameId, gameWithImages)

      try {
        await queueNarrativeGeneration(gameId, gameWithImages, 0)
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
