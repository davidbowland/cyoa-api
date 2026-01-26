import { s3AssetsDomain } from '../config'
import { ImageGenerationData, ImageGenerationOptions, ImagePrompt } from '../types'
import { generateImage } from './bedrock'
import { getPromptById } from './dynamodb'
import { putS3Object } from './s3'

export const getImageGenerationData = async (promptId: string): Promise<ImageGenerationData> => {
  const negativePrompt = await getPromptById<ImagePrompt>(promptId)
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
  return { imageGenerationOptions, model: negativePromptConfig.model }
}

export const generateImageToS3 = async (
  imageDescription: string,
  imageKey: string,
  { imageGenerationOptions, model }: ImageGenerationData,
): Promise<string> => {
  const { imageData } = await generateImage(imageDescription, model, imageGenerationOptions)

  await putS3Object(imageKey, Buffer.from(imageData), {
    'Content-Type': 'image/png',
  })

  return `https://${s3AssetsDomain}/${imageKey}`
}
