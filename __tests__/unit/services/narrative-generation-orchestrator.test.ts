import {
  cyoaGame,
  cyoaNarrative,
  endingNarrativePromptOutput,
  gameId,
  narrativeGenerationData,
  narrativeId,
  prompt,
  createNarrativePromptOutput,
} from '../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import * as imageGeneration from '@services/image-generation'
import {
  ensureNarrativeExists,
  createNarrative,
  startInitialNarrativeGeneration,
} from '@services/narrative-generation-orchestrator'
import * as narrativeStrategies from '@services/narrative-strategies'
import * as sqs from '@services/sqs'
import * as narrativeUtils from '@utils/narratives'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/image-generation')
jest.mock('@services/narrative-strategies')
jest.mock('@services/sqs')
jest.mock('@utils/narratives')
jest.mock('@utils/logging')

describe('narrative-generation-orchestrator', () => {
  const mockNow = 1640995200000
  const testNarrativeId = 'start-0'
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0.5)
    Date.now = jest.fn().mockReturnValue(mockNow)
    jest.mocked(narrativeStrategies).selectGenerationStrategy.mockReturnValue({
      buildContext: jest.fn().mockReturnValue({
        recap: 'The game is starting.',
        currentResourceValue: 100,
        lastChoiceMade: '',
        currentInventory: [],
      }),
      shouldGenerate: jest.fn().mockReturnValue(true),
    })
    jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValue({
      lastNarrativeId: 'start',
      optionId: 0,
      choicePointIndex: 0,
    })
    jest.mocked(narrativeUtils).determineRequiredNarratives.mockReturnValue([])
  })

  describe('ensureNarrativeExists', () => {
    beforeAll(() => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValue({
        narrative: undefined,
        generationData: undefined,
      })
      jest.mocked(dynamodb).setNarrativeGenerationData.mockResolvedValue(undefined)
      jest.mocked(sqs).addToQueue.mockResolvedValue({} as any)
    })

    it('returns existing narrative when available', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
      expect(dynamodb.getNarrativesByIds).toHaveBeenCalled()
    })

    it('returns existing narrative and ensures upcoming narratives', async () => {
      const upcomingNarrativeIds = ['start-0-1', 'start-0-2']
      jest
        .mocked(narrativeUtils)
        .determineRequiredNarratives.mockReturnValueOnce(upcomingNarrativeIds)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValue({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 0, // Use index 0 since that's what exists in the mock
      })

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
      expect(dynamodb.getNarrativesByIds).toHaveBeenCalledWith(gameId, upcomingNarrativeIds)
      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledTimes(2) // Once for each upcoming narrative
    })

    it('handles undefined choice when ensuring upcoming narratives', async () => {
      const narrativeWithoutChoice = { ...cyoaNarrative, choice: undefined }
      const upcomingNarrativeIds = ['start-0-1']
      jest
        .mocked(narrativeUtils)
        .determineRequiredNarratives.mockReturnValueOnce(upcomingNarrativeIds)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: narrativeWithoutChoice,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValue({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 0,
      })

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: narrativeWithoutChoice,
      })
      expect(dynamodb.setNarrativeGenerationData).not.toHaveBeenCalled()
    })

    it('skips upcoming narratives that are already generating', async () => {
      const upcomingNarrativeIds = ['start-0-1']
      jest
        .mocked(narrativeUtils)
        .determineRequiredNarratives.mockReturnValueOnce(upcomingNarrativeIds)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([
        {
          narrativeId: 'start-0-1',
          generationData: { ...narrativeGenerationData, generationStartTime: mockNow - 60000 },
        },
      ])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
      // Should not call setNarrativeGenerationData for the generating narrative
      expect(dynamodb.setNarrativeGenerationData).not.toHaveBeenCalled()
    })

    it('skips upcoming narratives that already exist', async () => {
      const upcomingNarrativeIds = ['start-0-1']
      jest
        .mocked(narrativeUtils)
        .determineRequiredNarratives.mockReturnValueOnce(upcomingNarrativeIds)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([
        {
          narrativeId: 'start-0-1',
          narrative: cyoaNarrative,
        },
      ])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
      // Should not call setNarrativeGenerationData for the existing narrative
      expect(dynamodb.setNarrativeGenerationData).not.toHaveBeenCalled()
    })

    it('returns generating status when generation is in progress', async () => {
      const generatingData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 60000, // 1 minute ago
      }
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: generatingData,
      })

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('starts new narrative generation when none exists', async () => {
      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledWith(
        gameId,
        testNarrativeId,
        expect.objectContaining({
          generationStartTime: mockNow,
          nextChoice: cyoaGame.choicePoints[0].choice,
          options: cyoaGame.choicePoints[0].options,
        }),
      )
      expect(sqs.addToQueue).toHaveBeenCalledWith({
        messageType: 'narrative-generation',
        gameId,
        narrativeId: testNarrativeId,
        uuid: `${gameId}-${testNarrativeId}`,
      })
      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('returns not_found status when generation fails', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: undefined,
      })
      jest
        .mocked(dynamodb)
        .setNarrativeGenerationData.mockRejectedValueOnce(new Error('DynamoDB error'))

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'not_found',
      })
    })

    it('generates narrative even when currentChoice is undefined', async () => {
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValueOnce({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 999,
      })

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('skips upcoming narrative generation when currentChoice is undefined', async () => {
      const upcomingNarrativeIds = ['start-999-1'] // Choice point 999 doesn't exist
      jest
        .mocked(narrativeUtils)
        .determineRequiredNarratives.mockReturnValueOnce(upcomingNarrativeIds)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValue({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 999, // Non-existent choice point index
      })

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
    })
  })

  describe('createNarrative', () => {
    beforeAll(() => {
      jest.mocked(dynamodb).getGameById.mockResolvedValue(cyoaGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValue({
        narrative: undefined,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
      jest.mocked(dynamodb).setNarrativeById.mockResolvedValue(undefined)
      jest.mocked(bedrock).invokeModel.mockResolvedValue(createNarrativePromptOutput)
      jest.mocked(imageGeneration).generateNarrativeImageForNarrative.mockResolvedValue({
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
    })

    it('creates narrative successfully', async () => {
      const result = await createNarrative(gameId, narrativeId)

      expect(dynamodb.getGameById).toHaveBeenCalledWith(gameId)
      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith(gameId, narrativeId)
      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          ...narrativeGenerationData,
          outline: cyoaGame.outline,
          resourceName: cyoaGame.resourceName,
          lossResourceThreshold: cyoaGame.lossResourceThreshold,
          inspirationWords: expect.any(Array),
        }),
      )
      expect(dynamodb.setNarrativeById).toHaveBeenCalledWith(gameId, narrativeId, {
        ...cyoaNarrative,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
      expect(result).toEqual(cyoaNarrative)
    })

    it('generates narrative image when imageDescription is provided', async () => {
      await createNarrative(gameId, narrativeId)

      expect(imageGeneration.generateNarrativeImageForNarrative).toHaveBeenCalledWith(
        gameId,
        narrativeId,
        'A dark cave with a massive sleeping dragon surrounded by treasure',
      )
    })

    it('throws error when generation data not found', async () => {
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(cyoaGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: undefined,
      })

      await expect(createNarrative(gameId, narrativeId)).rejects.toThrow(
        'Generation data not found',
      )
    })

    it('creates win narrative when game is won', async () => {
      const winGame = { ...cyoaGame, choicePoints: [] } // Empty choicePoints means game is won
      const expectedNarrative = {
        narrative: 'You have successfully completed your quest and saved the kingdom!',
        recap: 'Previous events recap',
        chapterTitle: 'Victory',
        choice: undefined,
        options: [],
        inventory: [],
        currentResourceValue: 75,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      }

      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(winGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: narrativeGenerationData,
      })
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValueOnce({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 1, // Greater than winGame.choicePoints.length (0)
      })
      jest.mocked(narrativeUtils).isGameWon.mockReturnValueOnce(true)
      jest.mocked(narrativeUtils).isGameLost.mockReturnValueOnce(false)
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(endingNarrativePromptOutput)

      const result = await createNarrative(gameId, narrativeId)

      expect(result).toEqual(expectedNarrative)
    })

    it('creates loss narrative when game is lost', async () => {
      const lossGenerationData = { ...narrativeGenerationData, currentResourceValue: 0 }
      const expectedNarrative = {
        narrative: 'You have successfully completed your quest and saved the kingdom!',
        recap: 'Previous events recap',
        chapterTitle: 'Victory',
        choice: undefined,
        options: [],
        inventory: [],
        currentResourceValue: 0,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      }

      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(cyoaGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: lossGenerationData,
      })
      jest.mocked(narrativeUtils).parseNarrativeId.mockReturnValueOnce({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 0, // Less than cyoaGame.choicePoints.length (1)
      })
      jest.mocked(narrativeUtils).isGameWon.mockReturnValueOnce(false)
      jest.mocked(narrativeUtils).isGameLost.mockReturnValueOnce(true)
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(endingNarrativePromptOutput)

      const result = await createNarrative(gameId, narrativeId)

      expect(result).toEqual(expectedNarrative)
    })
  })

  describe('startInitialNarrativeGeneration', () => {
    beforeAll(() => {
      jest.mocked(dynamodb).setNarrativeGenerationData.mockResolvedValue(undefined)
      jest.mocked(sqs).addToQueue.mockResolvedValue({} as any)
    })

    it('starts initial narrative generation successfully', async () => {
      await startInitialNarrativeGeneration(gameId, cyoaGame)

      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledWith(
        gameId,
        'start',
        expect.objectContaining({
          generationStartTime: mockNow,
          nextChoice: cyoaGame.choicePoints[0].choice,
          options: cyoaGame.choicePoints[0].options,
        }),
      )
      expect(sqs.addToQueue).toHaveBeenCalledWith({
        messageType: 'narrative-generation',
        gameId,
        narrativeId: 'start',
        uuid: `${gameId}-start`,
      })
    })

    it('throws error when generation fails', async () => {
      const error = new Error('DynamoDB error')
      jest.mocked(dynamodb).setNarrativeGenerationData.mockRejectedValueOnce(error)

      await expect(startInitialNarrativeGeneration(gameId, cyoaGame)).rejects.toThrow(
        'DynamoDB error',
      )
    })
  })
})
