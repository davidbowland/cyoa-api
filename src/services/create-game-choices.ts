import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createGameChoicesFunctionName } from '../config'
import { CyoaGame, GameId } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'
import { getGameGenerationData, setChoicesGenerationStarted, setGameById } from './dynamodb'
import { generateGameChoices } from './games/choices'
import { queueNarrativeGeneration } from './narratives'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const queueGameChoicesGeneration = async (gameId: GameId): Promise<void> => {
  const generationStartedAt = await setChoicesGenerationStarted(gameId)
  const command = new InvokeCommand({
    FunctionName: createGameChoicesFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId, generationStartedAt }),
  })
  await lambda.send(command)
  log('Game choices generation queued', { gameId })
}

export const createGameChoices = async (
  gameId: GameId,
): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const { gameData, storyType, inspirationAuthor, choiceCount, image, inventory, resourceImage } =
    await getGameGenerationData(gameId)

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
}
