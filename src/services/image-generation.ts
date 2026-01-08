import slugify from 'slugify'

import { promptIdImageNegative } from '../config'
import { CyoaInventory, GameId, ImageGenerationOptions, ImagePrompt } from '../types'
import { log } from '../utils/logging'
import { generateImage } from './bedrock'
import { getPromptById } from './dynamodb'
import { putS3Object } from './s3'

export const generateInventoryImages = async (
  gameId: GameId,
  inventory: Array<{ name: string }>,
): Promise<Array<CyoaInventory>> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptIdImageNegative)
  const negativePromptConfig = negativePrompt.config
  const negativeText = negativePrompt.contents

  const imageGenerationOptions: ImageGenerationOptions = {
    quality: negativePromptConfig.quality || 'standard',
    cfgScale: negativePromptConfig.cfgScale || 8,
    height: negativePromptConfig.height || 512,
    width: negativePromptConfig.width || 512,
    seed: negativePromptConfig.seed || 0,
    negativeText,
  }

  const inventoryWithImages = []

  for (const item of inventory) {
    try {
      log('Generating image for inventory item', { gameId, itemName: item.name })

      const { imageData } = await generateImage(item.name, imageGenerationOptions)
      const imageKey = `images/${gameId}/inventory/${slugify(item.name, { lower: true })}`

      await putS3Object(imageKey, Buffer.from(imageData), {
        'Content-Type': 'image/png',
        'game-id': gameId,
        'item-name': item.name,
      })

      inventoryWithImages.push({
        name: item.name,
        image: `${gameId}/inventory/${slugify(item.name, { lower: true })}`,
      })

      log('Image generated and saved for inventory item', {
        gameId,
        itemName: item.name,
        imageKey,
        imageSizeBytes: imageData.length,
      })
    } catch (error: unknown) {
      log('Failed to generate image for inventory item', {
        gameId,
        itemName: item.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Continue with other items even if one fails
      inventoryWithImages.push({
        name: item.name,
      })
    }
  }

  return inventoryWithImages
}
