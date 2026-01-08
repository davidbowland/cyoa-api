import { createNarrative } from '../services/narratives'
import { CreateNarrativeEvent } from '../types'
import { log, logError } from '../utils/logging'

export const createNarrativeHandler = async (event: CreateNarrativeEvent): Promise<void> => {
  log('Received event', { event })
  const { gameId, narrativeId } = event

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
}
