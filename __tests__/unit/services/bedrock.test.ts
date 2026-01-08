import { generateImage } from '@services/bedrock'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: (...args) => mockSend(...args),
  })),
  InvokeModelCommand: jest.fn().mockImplementation((x) => x),
}))

jest.mock('@utils/logging', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('generateImage', () => {
  const mockSuccessResponse = {
    body: new TextEncoder().encode(
      JSON.stringify({
        images: [
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==',
        ],
      }),
    ),
  }

  beforeAll(() => {
    mockSend.mockResolvedValue(mockSuccessResponse)
  })

  it('should generate image with default parameters', async () => {
    const result = await generateImage('A test prompt')

    expect(mockSend).toHaveBeenCalledWith({
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: 'A test prompt' },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: 'standard',
          cfgScale: 8.0,
          height: 512,
          width: 512,
          seed: 0,
        },
      }),
      contentType: 'application/json',
      accept: '*/*',
      modelId: 'amazon.nova-canvas-v1:0',
    })

    expect(result.imageData).toBeInstanceOf(Uint8Array)
    expect(result.imageData.length).toBeGreaterThan(0)
  })

  it('should use custom options when provided', async () => {
    const options = {
      quality: 'premium' as const,
      cfgScale: 10.0,
      height: 1024,
      width: 1024,
      seed: 42,
    }

    await generateImage('Custom prompt', options)

    expect(mockSend).toHaveBeenCalledWith({
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: 'Custom prompt' },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: 'premium',
          cfgScale: 10.0,
          height: 1024,
          width: 1024,
          seed: 42,
        },
      }),
      contentType: 'application/json',
      accept: '*/*',
      modelId: 'amazon.nova-canvas-v1:0',
    })
  })

  it('should include negative text when provided', async () => {
    const options = { negativeText: 'no text, no deformed' }

    await generateImage('A beautiful landscape', options)

    expect(mockSend).toHaveBeenCalledWith({
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          negativeText: 'no text, no deformed',
          text: 'A beautiful landscape',
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: 'standard',
          cfgScale: 8.0,
          height: 512,
          width: 512,
          seed: 0,
        },
      }),
      contentType: 'application/json',
      accept: '*/*',
      modelId: 'amazon.nova-canvas-v1:0',
    })
  })

  it('should handle missing response body', async () => {
    mockSend.mockResolvedValueOnce({ body: null })

    await expect(generateImage('Test prompt')).rejects.toThrow()
  })

  it('should handle missing image data in response', async () => {
    const invalidResponse = {
      body: new TextEncoder().encode(JSON.stringify({ images: [] })),
    }
    mockSend.mockResolvedValueOnce(invalidResponse)

    await expect(generateImage('Test prompt')).rejects.toThrow()
  })

  it('should handle AWS SDK errors', async () => {
    const awsError = new Error('AWS service error')
    mockSend.mockRejectedValueOnce(awsError)

    await expect(generateImage('Test prompt')).rejects.toThrow('AWS service error')
  })

  it('should handle JSON parsing errors', async () => {
    const invalidJsonResponse = {
      body: new TextEncoder().encode('invalid json'),
    }
    mockSend.mockResolvedValueOnce(invalidJsonResponse)

    await expect(generateImage('Test prompt')).rejects.toThrow()
  })
})
