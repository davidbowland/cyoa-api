import { generateImage, invokeModel } from '@services/bedrock'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: (...args) => mockSend(...args),
  })),
  InvokeModelCommand: jest.fn().mockImplementation((x) => x),
}))

jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logDebug: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('invokeModel', () => {
  const mockPrompt = {
    contents: 'Test prompt with ${context}',
    config: {
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      anthropicVersion: 'bedrock-2023-05-31',
      maxTokens: 1000,
      temperature: 0.7,
      topK: 250,
    },
  }

  const mockSuccessResponse = {
    body: new TextEncoder().encode(
      JSON.stringify({
        content: [{ text: '{"result": "success"}' }],
      }),
    ),
  }

  beforeAll(() => {
    mockSend.mockResolvedValue(mockSuccessResponse)
  })

  it('should invoke model without context', async () => {
    const result = await invokeModel(mockPrompt)

    expect(mockSend).toHaveBeenCalledWith({
      body: new TextEncoder().encode(
        JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [{ content: 'Test prompt with ${context}', role: 'user' }],
          temperature: 0.7,
          top_k: 250,
        }),
      ),
      contentType: 'application/json',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    })

    expect(result).toEqual({ result: 'success' })
  })

  it('should invoke model with context replacement', async () => {
    const context = { gameId: 'test-game', status: 'active' }

    await invokeModel(mockPrompt, context)

    expect(mockSend).toHaveBeenCalledWith({
      body: new TextEncoder().encode(
        JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [
            { content: 'Test prompt with {"gameId":"test-game","status":"active"}', role: 'user' },
          ],
          temperature: 0.7,
          top_k: 250,
        }),
      ),
      contentType: 'application/json',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    })
  })

  it('should handle response with thinking tags', async () => {
    const responseWithThinking = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            { text: '<thinking>This is my thought process</thinking>{"result": "cleaned"}' },
          ],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(responseWithThinking)

    const result = await invokeModel(mockPrompt)

    expect(result).toEqual({ result: 'cleaned' })
  })

  it('should log and throw error when model response is not valid JSON', async () => {
    const invalidJsonResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: 'This is not valid JSON' }],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(invalidJsonResponse)

    await expect(invokeModel(mockPrompt)).rejects.toThrow()
  })
})

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
    const result = await generateImage('A test prompt', 'amazon.nova-canvas-v1:0')

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

    await generateImage('Custom prompt', 'custom-model-id', options)

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
      modelId: 'custom-model-id',
    })
  })

  it('should include negative text when provided', async () => {
    const options = { negativeText: 'no text, no deformed' }

    await generateImage('A beautiful landscape', 'test-model', options)

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
      modelId: 'test-model',
    })
  })

  it('should handle missing response body', async () => {
    mockSend.mockResolvedValueOnce({ body: null })

    await expect(generateImage('Test prompt', 'test-model')).rejects.toThrow()
  })

  it('should handle missing image data in response', async () => {
    const invalidResponse = {
      body: new TextEncoder().encode(JSON.stringify({ images: [] })),
    }
    mockSend.mockResolvedValueOnce(invalidResponse)

    await expect(generateImage('Test prompt', 'test-model')).rejects.toThrow()
  })

  it('should handle AWS SDK errors', async () => {
    const awsError = new Error('AWS service error')
    mockSend.mockRejectedValueOnce(awsError)

    await expect(generateImage('Test prompt', 'test-model')).rejects.toThrow('AWS service error')
  })

  it('should handle JSON parsing errors', async () => {
    const invalidJsonResponse = {
      body: new TextEncoder().encode('invalid json'),
    }
    mockSend.mockResolvedValueOnce(invalidJsonResponse)

    await expect(generateImage('Test prompt', 'test-model')).rejects.toThrow()
  })
})
