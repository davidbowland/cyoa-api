import {
  promptIdInventoryImage,
  promptIdCoverImage,
  promptIdNarrativeImage,
  promptIdResourceImage,
  s3AssetsDomain,
} from '../config'
import { CyoaInventory, GameId, ImageGenerationOptions, ImagePrompt, NarrativeId } from '../types'
import { log, logError } from '../utils/logging'
import { slugify } from '../utils/slugify'
import { generateImage } from './bedrock'
import { getPromptById } from './dynamodb'
import { putS3Object } from './s3'

export const generateGameCoverImage = async (
  gameId: GameId,
  imageDescription: string,
): Promise<string | undefined> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptIdCoverImage)
  const negativePromptConfig = negativePrompt.config
  const negativeText = negativePrompt.contents

  const imageGenerationOptions: ImageGenerationOptions = {
    quality: negativePromptConfig.quality,
    cfgScale: negativePromptConfig.cfgScale,
    height: negativePromptConfig.height,
    width: negativePromptConfig.width,
    seed: negativePromptConfig.seed,
    negativeText,
  }

  try {
    log('Generating cover image for game', { gameId, imageDescription })

    const { imageData } = await generateImage(
      imageDescription,
      negativePromptConfig.model,
      imageGenerationOptions,
    )
    const imageKey = `images/${gameId}/cover.png`

    await putS3Object(imageKey, Buffer.from(imageData), {
      'Content-Type': 'image/png',
      'game-id': gameId,
      'image-type': 'cover',
    })

    log('Cover image generated and saved for game', {
      gameId,
      imageKey,
      imageSizeBytes: imageData.length,
    })

    return `https://${s3AssetsDomain}/images/${gameId}/cover.png`
  } catch (error: unknown) {
    log('Failed to generate cover image for game', {
      gameId,
      imageDescription,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return undefined
  }
}

export const generateInventoryImages = async (
  gameId: GameId,
  inventory: Array<{ name: string }>,
): Promise<Array<CyoaInventory>> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptIdInventoryImage)
  const negativePromptConfig = negativePrompt.config
  const negativeText = negativePrompt.contents

  const imageGenerationOptions: ImageGenerationOptions = {
    quality: negativePromptConfig.quality,
    cfgScale: negativePromptConfig.cfgScale,
    height: negativePromptConfig.height,
    width: negativePromptConfig.width,
    seed: negativePromptConfig.seed,
    negativeText,
  }

  const inventoryWithImages = []

  for (const item of inventory) {
    try {
      log('Generating image for inventory item', { gameId, itemName: item.name })

      const { imageData } = await generateImage(
        item.name,
        negativePromptConfig.model,
        imageGenerationOptions,
      )
      const imageKey = `images/${gameId}/inventory/${slugify(item.name)}.png`

      await putS3Object(imageKey, Buffer.from(imageData), {
        'Content-Type': 'image/png',
        'game-id': gameId,
        'item-name': item.name,
      })

      inventoryWithImages.push({
        name: item.name,
        image: `https://${s3AssetsDomain}/images/${gameId}/inventory/${slugify(item.name)}.png`,
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

export const generateGameCoverImageForGame = async (
  gameId: GameId,
  imageDescription: string,
): Promise<{ image?: string }> => {
  try {
    const coverImagePath = await generateGameCoverImage(gameId, imageDescription)
    if (coverImagePath) {
      log('Generated cover image for game', { gameId, coverImagePath })
      return { image: coverImagePath }
    }
    return {}
  } catch (error: unknown) {
    logError('Error generating game cover image', {
      gameId,
      error,
    })
    return {}
  }
}

export const generateInventoryImagesForGame = async (
  gameId: GameId,
  inventory: Array<{ name: string }>,
): Promise<{ inventory: Array<CyoaInventory> }> => {
  try {
    const inventoryWithImages = await generateInventoryImages(gameId, inventory)
    log('Generated images for inventory items', {
      gameId,
      inventoryCount: inventoryWithImages.length,
    })
    return { inventory: inventoryWithImages }
  } catch (error: unknown) {
    logError('Error generating inventory images', {
      gameId,
      error,
    })
    return { inventory }
  }
}

export const generateNarrativeImage = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  imageDescription: string,
): Promise<string | undefined> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptIdNarrativeImage)
  const negativePromptConfig = negativePrompt.config
  const negativeText = negativePrompt.contents

  const imageGenerationOptions: ImageGenerationOptions = {
    quality: negativePromptConfig.quality,
    cfgScale: negativePromptConfig.cfgScale,
    height: negativePromptConfig.height,
    width: negativePromptConfig.width,
    seed: negativePromptConfig.seed,
    negativeText,
  }

  try {
    log('Generating narrative image', { gameId, narrativeId, imageDescription })

    const { imageData } = await generateImage(
      imageDescription,
      negativePromptConfig.model,
      imageGenerationOptions,
    )
    const imageKey = `images/${gameId}/${narrativeId}.png`

    await putS3Object(imageKey, Buffer.from(imageData), {
      'Content-Type': 'image/png',
      'game-id': gameId,
      'narrative-id': narrativeId,
      'image-type': 'narrative',
    })

    log('Narrative image generated and saved', {
      gameId,
      narrativeId,
      imageKey,
      imageSizeBytes: imageData.length,
    })

    return `https://${s3AssetsDomain}/images/${gameId}/${narrativeId}.png`
  } catch (error: unknown) {
    log('Failed to generate narrative image', {
      gameId,
      narrativeId,
      imageDescription,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return undefined
  }
}

export const generateNarrativeImageForNarrative = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  imageDescription: string,
): Promise<{ image?: string }> => {
  try {
    const narrativeImagePath = await generateNarrativeImage(gameId, narrativeId, imageDescription)
    if (narrativeImagePath) {
      log('Generated narrative image', { gameId, narrativeId, narrativeImagePath })
      return { image: narrativeImagePath }
    }
    return {}
  } catch (error: unknown) {
    logError('Error generating narrative image', {
      gameId,
      narrativeId,
      error,
    })
    return {}
  }
}
export const generateResourceImage = async (
  gameId: GameId,
  imageDescription: string,
): Promise<string | undefined> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptIdResourceImage)
  const negativePromptConfig = negativePrompt.config
  const negativeText = negativePrompt.contents

  const imageGenerationOptions: ImageGenerationOptions = {
    quality: negativePromptConfig.quality,
    cfgScale: negativePromptConfig.cfgScale,
    height: negativePromptConfig.height,
    width: negativePromptConfig.width,
    seed: negativePromptConfig.seed,
    negativeText,
  }

  try {
    log('Generating resource image', { gameId, imageDescription })

    const { imageData } = await generateImage(
      imageDescription,
      negativePromptConfig.model,
      imageGenerationOptions,
    )
    const imageKey = `images/${gameId}/resource.png`

    await putS3Object(imageKey, Buffer.from(imageData), {
      'Content-Type': 'image/png',
      'game-id': gameId,
      'image-type': 'resource',
    })

    log('Resource image generated and saved', {
      gameId,
      imageKey,
      imageSizeBytes: imageData.length,
    })

    return `https://${s3AssetsDomain}/images/${gameId}/resource.png`
  } catch (error: unknown) {
    log('Failed to generate resource image', {
      gameId,
      imageDescription,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return undefined
  }
}

export const generateResourceImageForGame = async (
  gameId: GameId,
  imageDescription: string,
): Promise<{ resourceImage?: string }> => {
  try {
    const resourceImagePath = await generateResourceImage(gameId, imageDescription)
    if (resourceImagePath) {
      log('Generated resource image', { gameId, resourceImagePath })
      return { resourceImage: resourceImagePath }
    }
    return {}
  } catch (error: unknown) {
    logError('Error generating resource image', {
      gameId,
      error,
    })
    return {}
  }
}
