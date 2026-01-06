import { createNarrative } from '../services/narratives'
import { CreateNarrativeEvent } from '../types'
import { log, logError } from '../utils/logging'

export const createNarrativeHandler = async (event: CreateNarrativeEvent): Promise<void> => {
  log('Received event', { event })
  const { gameId, narrativeId } = event

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const narrative = await createNarrative(gameId, narrativeId)
      log('Narrative created successfully', { gameId, narrativeId, narrative })
      break
    } catch (error: unknown) {
      logError('Narrative creation failed, retrying', { error, gameId, narrativeId })
    }
  }
}
