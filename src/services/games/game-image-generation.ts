import { promptIdCoverImage, promptIdInventoryImage, promptIdResourceImage } from '../../config'
import { CyoaInventory, CyoaInventoryWithDescription, GameId } from '../../types'
import { log } from '../../utils/logging'
import { slugify } from '../../utils/slugify'
import { generateImageToS3, getImageGenerationData } from '../image-generation'

export const generateGameCoverImage = async (
  gameId: GameId,
  imageDescription: string,
): Promise<string | undefined> => {
  try {
    const imageKey = `images/${gameId}/cover.png`
    const imageGenerationData = await getImageGenerationData(promptIdCoverImage)
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

export const generateInventoryImages = async (
  gameId: GameId,
  inventory: Array<CyoaInventoryWithDescription>,
): Promise<Array<CyoaInventory>> => {
  const imageGenerationData = await getImageGenerationData(promptIdInventoryImage)
  const inventoryWithImages = []
  for (const item of inventory) {
    try {
      if (!item.imageDescription) {
        inventoryWithImages.push({
          name: item.name,
        })
        continue
      }

      const imageKey = `images/${gameId}/inventory/${slugify(item.name)}.png`
      const imageUrl = await generateImageToS3(item.imageDescription, imageKey, imageGenerationData)

      inventoryWithImages.push({
        name: item.name,
        image: imageUrl,
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

export const generateResourceImage = async (
  gameId: GameId,
  imageDescription: string,
): Promise<string | undefined> => {
  try {
    const imageKey = `images/${gameId}/resource.png`
    const imageGenerationData = await getImageGenerationData(promptIdResourceImage)
    return await generateImageToS3(imageDescription, imageKey, imageGenerationData)
  } catch (error: unknown) {
    log('Failed to generate resource image', {
      gameId,
      imageDescription,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return undefined
  }
}
