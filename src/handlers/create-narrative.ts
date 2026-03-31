import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createNarrativeFunctionName, maxRetryAttempts } from '../config'
import { createNarrative } from '../services/create-narratives'
import {
  getNarrativeById,
  resetNarrativeGenerationStarted,
  setNarrativeGenerationStarted,
} from '../services/dynamodb'
import { CreateNarrativeEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createNarrativeHandler = async (event: CreateNarrativeEvent): Promise<void> => {
  const { gameId, narrativeId, attempt = 1, generationStartedAt } = event
  log('Received narrative event', { event })

  try {
    let currentTimestamp: number
    if (generationStartedAt === undefined) {
      currentTimestamp = await setNarrativeGenerationStarted(gameId, narrativeId)
    } else {
      const result = await resetNarrativeGenerationStarted(gameId, narrativeId, generationStartedAt)
      if (result === false) {
        log('Narrative generation superseded, bailing', { gameId, narrativeId, attempt })
        return
      }
      currentTimestamp = result
    }

    const { generationData } = await getNarrativeById(gameId, narrativeId)
    if (!generationData) {
      throw new Error('No generation data found')
    }

    try {
      await createNarrative(gameId, narrativeId, generationData)
      log('Narrative created successfully', { gameId, narrativeId })
    } catch (error: unknown) {
      if (attempt < maxRetryAttempts) {
        logError('Narrative creation failed, retrying', { error, gameId, narrativeId, attempt })
        const command = new InvokeCommand({
          FunctionName: createNarrativeFunctionName,
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId,
            narrativeId,
            attempt: attempt + 1,
            generationStartedAt: currentTimestamp,
          }),
        })
        await lambda.send(command)
      } else {
        logError('Narrative creation failed, giving up', { error, gameId, narrativeId, attempt })
      }
    }
  } catch (error: unknown) {
    logError('Failed to create narrative', { error, event })
    throw error
  }
}
