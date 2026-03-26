import { createNarrative } from '../services/create-narratives'
import { getNarrativeById } from '../services/dynamodb'
import { CreateNarrativeEvent } from '../types'
import { log, logError } from '../utils/logging'

export const createNarrativeHandler = async (event: CreateNarrativeEvent): Promise<void> => {
  log('Received narrative event', { event })
  try {
    const { gameId, narrativeId } = event
    const { generationData } = await getNarrativeById(gameId, narrativeId)
    if (!generationData) {
      throw new Error('No generation data found')
    }

    for (let index = 0; index < 2; index++) {
      try {
        await createNarrative(gameId, narrativeId, generationData)
        log('Narrative created successfully', { gameId, narrativeId })
        return
      } catch (error: unknown) {
        if (index === 0) {
          logError('Narrative creation failed, retrying', { error, gameId, narrativeId })
        } else {
          log('Narrative creation failed, retrying', { error, gameId, narrativeId })
        }
      }
    }
  } catch (error: unknown) {
    logError('Failed to create narrative', { error, event })
    throw error
  }
}
