import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

import { bedrockRegion } from '../config'
import { ImageGenerationOptions, ImageGenerationResponse, TextPrompt } from '../types'
import { logDebug, xrayCapture } from '../utils/logging'

const runtimeClient = xrayCapture(new BedrockRuntimeClient({ region: bedrockRegion }))

export const invokeModel = async <T>(
  prompt: TextPrompt,
  context?: Record<string, any>,
): Promise<T> => {
  const promptWithContext = context
    ? { ...prompt, contents: prompt.contents.replace('${context}', JSON.stringify(context)) }
    : prompt
  return invokeModelMessage(promptWithContext)
}

const removeThinkingTags = (input: string): string =>
  input.replace(/(^\s*<thinking>.*?<\/thinking>\s*|^\s*|\s*`(json)?\s*|\s*$)/gs, '',)

const invokeModelMessage = async <T>(prompt: TextPrompt): Promise<T> => {
  logDebug('Invoking model', { prompt })
  const messageBody = {
    anthropic_version: prompt.config.anthropicVersion,
    max_tokens: prompt.config.maxTokens,
    messages: [{ content: prompt.contents, role: 'user' }],
    temperature: prompt.config.temperature,
    top_k: prompt.config.topK,
  }
  logDebug('Received from model', {
    messageBody,
    messages: JSON.stringify(messageBody.messages, null, 2),
  })
  const command = new InvokeModelCommand({
    body: new TextEncoder().encode(JSON.stringify(messageBody)), // new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
    contentType: 'application/json',
    modelId: prompt.config.model,
  })
  const response = await runtimeClient.send(command)
  const modelResponse = JSON.parse(new TextDecoder().decode(response.body))
  logDebug('Model response', { modelResponse, text: modelResponse.content[0].text })
  return JSON.parse(removeThinkingTags(modelResponse.content[0].text))
}

export const generateImage = async (
  promptText: string,
  modelId: string,
  options: ImageGenerationOptions = {},
): Promise<ImageGenerationResponse> => {
  const {
    quality = 'standard',
    cfgScale = 8.0,
    height = 512,
    width = 512,
    seed = 0,
    negativeText,
  } = options

  logDebug('Generating image with Bedrock', {
    promptText,
    modelId,
    quality,
    dimensions: `${width}x${height}`,
    negativeText,
  })

  const negativeParams = negativeText ? { negativeText } : {}
  const input = {
    body: JSON.stringify({
      taskType: 'TEXT_IMAGE',
      textToImageParams: {
        ...negativeParams,
        text: promptText,
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        quality,
        cfgScale,
        height,
        width,
        seed,
      },
    }),
    contentType: 'application/json',
    accept: '*/*',
    modelId,
  }

  const command = new InvokeModelCommand(input)
  const response = await runtimeClient.send(command)
  const textDecoder = new TextDecoder('utf-8')
  const jsonString = textDecoder.decode(response.body)
  const parsedData = JSON.parse(jsonString)
  const base64Image = parsedData.images[0]
  const imageData = new Uint8Array(Buffer.from(base64Image, 'base64'))

  logDebug('Image generated successfully', { imageSizeBytes: imageData.length })

  return { imageData }
}
