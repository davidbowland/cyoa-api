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
      model: 'us.anthropic.claude-sonnet-4-6',
      anthropicVersion: 'bedrock-2023-05-31',
      maxTokens: 115000,
      thinkingBudgetTokens: 50000,
    },
  }

  const mockSuccessResponse = {
    body: new TextEncoder().encode(
      JSON.stringify({
        content: [
          { type: 'thinking', thinking: 'Reasoning about the response...' },
          { type: 'text', text: '{"result": "success"}' },
        ],
      }),
    ),
  }

  beforeAll(() => {
    mockSend.mockResolvedValue(mockSuccessResponse)
  })

  it('should invoke model with thinking config', async () => {
    const result = await invokeModel(mockPrompt)

    expect(mockSend).toHaveBeenCalledWith({
      body: new TextEncoder().encode(
        JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 115000,
          messages: [{ content: 'Test prompt with ${context}', role: 'user' }],
          thinking: { type: 'enabled', budget_tokens: 50000 },
        }),
      ),
      contentType: 'application/json',
      modelId: 'us.anthropic.claude-sonnet-4-6',
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
          max_tokens: 115000,
          messages: [
            { content: 'Test prompt with {"gameId":"test-game","status":"active"}', role: 'user' },
          ],
          thinking: { type: 'enabled', budget_tokens: 50000 },
        }),
      ),
      contentType: 'application/json',
      modelId: 'us.anthropic.claude-sonnet-4-6',
    })
  })

  it('should extract text block from response with thinking and text blocks', async () => {
    const multiBlockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            { type: 'thinking', thinking: 'Deep analysis of the game structure...' },
            { type: 'text', text: '{"title": "The Quest", "description": "An adventure"}' },
          ],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(multiBlockResponse)

    const result = await invokeModel(mockPrompt)

    expect(result).toEqual({ title: 'The Quest', description: 'An adventure' })
  })

  it('should throw when response has no text content block', async () => {
    const noTextBlockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: 'thinking', thinking: 'Only thinking, no text' }],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(noTextBlockResponse)

    await expect(invokeModel(mockPrompt)).rejects.toThrow('No text content block in model response')
  })

  it('should strip markdown code fences from response', async () => {
    const codeFenceResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            { type: 'thinking', thinking: 'Reasoning...' },
            { type: 'text', text: '```json\n{"result": "fenced"}\n```' },
          ],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(codeFenceResponse)

    const result = await invokeModel(mockPrompt)

    expect(result).toEqual({ result: 'fenced' })
  })

  it('should log and throw error when text block is not valid JSON', async () => {
    const invalidJsonResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            { type: 'thinking', thinking: 'Reasoning...' },
            { type: 'text', text: 'This is not valid JSON' },
          ],
        }),
      ),
    }
    mockSend.mockResolvedValueOnce(invalidJsonResponse)

    await expect(invokeModel(mockPrompt)).rejects.toThrow()
  })

  it('should not send temperature or top_k', async () => {
    await invokeModel(mockPrompt)

    const sentBody = JSON.parse(
      new TextDecoder().decode(
        (mockSend.mock.calls[mockSend.mock.calls.length - 1][0] as { body: Uint8Array }).body,
      ),
    )
    expect(sentBody).not.toHaveProperty('temperature')
    expect(sentBody).not.toHaveProperty('top_k')
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
