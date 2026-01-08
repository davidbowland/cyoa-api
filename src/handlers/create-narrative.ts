import { createNarrative } from '../services/narrative-generation-orchestrator'
import { SQSNarrativeEvent } from '../types'
import { log, logError } from '../utils/logging'

export const createNarrativeHandler = async (event: SQSNarrativeEvent): Promise<void> => {
  log('Received SQS event', { event })

  for (const record of event.Records) {
    try {
      const { gameId, narrativeId } = JSON.parse(record.body)

      for (let index = 0; index < 5; index++) {
        try {
          await createNarrative(gameId, narrativeId)
          log('Narrative created successfully', { gameId, narrativeId })
          break
        } catch (error: unknown) {
          if (index === 0) {
            logError('Narrative creation failed, retrying', { error, gameId, narrativeId })
          } else {
            log('Narrative creation failed, retrying', { error, gameId, narrativeId })
          }
        }
      }
    } catch (error: unknown) {
      logError('Failed to process narrative creation', { error, record: record.messageId })
    }
  }
}
