import { promptIdNarrativeImage } from '../../config'
import { GameId, NarrativeId } from '../../types'
import { log } from '../../utils/logging'
import { generateImageToS3, getImageGenerationData } from '../image-generation'

export const generateNarrativeImage = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  imageDescription: string,
): Promise<string | undefined> => {
  try {
    const imageKey = `images/${gameId}/${narrativeId}.png`
    const imageGenerationData = await getImageGenerationData(promptIdNarrativeImage)
    return await generateImageToS3(imageDescription, imageKey, imageGenerationData)
  } catch (error: unknown) {
    log('Failed to generate cover image', {
      gameId,
      imageDescription,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return undefined
  }
}
