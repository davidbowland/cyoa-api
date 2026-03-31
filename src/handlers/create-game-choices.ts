import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createGameChoicesFunctionName, maxRetryAttempts } from '../config'
import { createGameChoices } from '../services/create-game-choices'
import { resetChoicesGenerationStarted, setChoicesGenerationStarted } from '../services/dynamodb'
import { CreateGameChoicesEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createGameChoicesHandler = async (event: CreateGameChoicesEvent): Promise<void> => {
  const { gameId, attempt = 1, generationStartedAt } = event
  log('Received game choices event', { gameId, attempt })

  let currentTimestamp: number
  if (generationStartedAt === undefined) {
    currentTimestamp = await setChoicesGenerationStarted(gameId)
  } else {
    const result = await resetChoicesGenerationStarted(gameId, generationStartedAt)
    if (result === false) {
      log('Game choices generation superseded, bailing', { gameId, attempt })
      return
    }
    currentTimestamp = result
  }

  try {
    const { gameId: createdGameId } = await createGameChoices(gameId)
    log('Game choices created successfully', { gameId: createdGameId })
  } catch (error: unknown) {
    if (attempt < maxRetryAttempts) {
      logError('Game choices creation failed, retrying', { error, gameId, attempt })
      const command = new InvokeCommand({
        FunctionName: createGameChoicesFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          gameId,
          attempt: attempt + 1,
          generationStartedAt: currentTimestamp,
        }),
      })
      await lambda.send(command)
    } else {
      logError('Game choices creation failed, giving up', { error, gameId, attempt })
    }
  }
}
