import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createGameFunctionName, maxRetryAttempts } from '../config'
import { createGame } from '../services/create-games'
import { CreateGameEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createGameHandler = async (event: CreateGameEvent = {}): Promise<void> => {
  const attempt = event.attempt ?? 1
  try {
    const { gameId } = await createGame()
    log('Game created successfully', { gameId })
  } catch (error: unknown) {
    if (attempt < maxRetryAttempts) {
      logError('Game creation failed, retrying', { error, attempt })
      const command = new InvokeCommand({
        FunctionName: createGameFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({ attempt: attempt + 1 }),
      })
      await lambda.send(command)
    } else {
      logError('Game creation failed, giving up', { error, attempt })
    }
  }
}
