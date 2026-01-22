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
import { determineRequiredNarratives, isGameLost, isGameWon } from '@utils/narratives'
import * as randomUtils from '@utils/random'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/image-generation')
jest.mock('@services/narrative-strategies')
jest.mock('@services/sqs')
jest.mock('@utils/logging')
jest.mock('@utils/random')

describe('narrative-generation-orchestrator', () => {
  const mockNow = 1640995200000
  const testNarrativeId = 'start'
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0.5)
    Date.now = jest.fn().mockReturnValue(mockNow)
    jest.mocked(randomUtils).getRandomSample.mockImplementation((array) => [...array])
    jest.mocked(narrativeStrategies).selectGenerationStrategy.mockReturnValue({
      buildContext: jest.fn().mockReturnValue({
        recap: 'The game is starting.',
        lastChoiceMade: '',
        lastOptionSelected: '',
        bestOption: '',
        currentInventory: [],
      }),
      shouldGenerate: jest.fn().mockReturnValue(true),
    })
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
      expect(dynamodb.getNarrativesByIds).toHaveBeenCalledWith(gameId, ['start-0', 'start-1'])
      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledTimes(2)
    })

    it('handles undefined choice when ensuring upcoming narratives', async () => {
      const narrativeWithoutChoice = { ...cyoaNarrative, choice: undefined }
      const upcomingNarrativeIds = ['start-0-1']
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: narrativeWithoutChoice,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: narrativeWithoutChoice,
      })
      expect(dynamodb.setNarrativeGenerationData).not.toHaveBeenCalled()
    })

    it('skips upcoming narratives that are already generating', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([
        {
          narrativeId: 'start-0',
          generationData: { ...narrativeGenerationData, generationStartTime: mockNow - 60000 },
        },
        {
          narrativeId: 'start-1',
          generationData: { ...narrativeGenerationData, generationStartTime: mockNow - 60000 },
        },
      ])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
      expect(dynamodb.setNarrativeGenerationData).not.toHaveBeenCalled()
    })

    it('skips upcoming narratives that already exist', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([
        {
          narrativeId: 'start-0',
          narrative: cyoaNarrative,
        },
        {
          narrativeId: 'start-1',
          narrative: cyoaNarrative,
        },
      ])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
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
          nextOptions: [
            { name: 'Fight', rank: 1, consequence: 'You fight bravely' },
            { name: 'Run', rank: 2, consequence: 'You flee the scene' },
          ],
          existingNarrative: cyoaGame.choicePoints[0].choiceNarrative,
          outline: cyoaGame.outline,
          inspirationAuthor: cyoaGame.inspirationAuthor,
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
      const gameWithNoChoices = { ...cyoaGame, choicePoints: [] }

      const result = await ensureNarrativeExists(gameId, testNarrativeId, gameWithNoChoices)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('skips upcoming narrative generation when currentChoice is undefined', async () => {
      const gameWithOneChoice = { ...cyoaGame, choicePoints: [cyoaGame.choicePoints[0]] }
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: cyoaNarrative,
        generationData: narrativeGenerationData,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([])

      const result = await ensureNarrativeExists(gameId, testNarrativeId, gameWithOneChoice)

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
          inventoryAvailable: narrativeGenerationData.inventoryAvailable,
          existingNarrative: narrativeGenerationData.existingNarrative,
          previousChoice: narrativeGenerationData.previousChoice,
          previousOptions: narrativeGenerationData.previousOptions,
          nextChoice: narrativeGenerationData.nextChoice,
          nextOptions: narrativeGenerationData.nextOptions,
          outline: narrativeGenerationData.outline,
          inspirationAuthor: narrativeGenerationData.inspirationAuthor,
        }),
      )
      expect(dynamodb.setNarrativeById).toHaveBeenCalledWith(gameId, narrativeId, {
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        recap: 'Previous events recap',
        chapterTitle: "The Dragon's Lair",
        choice: 'You see a sleeping dragon. What do you do?',
        options: cyoaGame.choicePoints[0].options,
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
      expect(result).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        recap: 'Previous events recap',
        chapterTitle: "The Dragon's Lair",
        choice: 'You see a sleeping dragon. What do you do?',
        options: cyoaGame.choicePoints[0].options,
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
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
      const winGame = { ...cyoaGame, choicePoints: [] }
      const expectedNarrative = {
        narrative: 'You have successfully completed your quest and saved the kingdom!',
        recap: 'Previous events recap',
        chapterTitle: 'Victory',
        choice: undefined,
        options: [],
        inventory: [],
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      }

      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(winGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: narrativeGenerationData,
      })
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(endingNarrativePromptOutput)

      const result = await createNarrative(gameId, narrativeId)

      expect(result).toEqual(expectedNarrative)
    })

    it('creates loss narrative when game is lost', async () => {
      const lossGame = {
        ...cyoaGame,
        startingResourceValue: 100,
        lossResourceThreshold: 100,
      }
      const lossGenerationData = { ...narrativeGenerationData }
      const expectedNarrative = {
        narrative: 'You have successfully completed your quest and saved the kingdom!',
        recap: 'Previous events recap',
        chapterTitle: 'Victory',
        choice: undefined,
        options: [],
        inventory: [],
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      }

      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(lossGame)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: undefined,
        generationData: lossGenerationData,
      })
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
          nextOptions: [
            { name: 'Fight', rank: 1, consequence: 'You fight bravely' },
            { name: 'Run', rank: 2, consequence: 'You flee the scene' },
          ],
          existingNarrative: cyoaGame.choicePoints[0].choiceNarrative,
          outline: cyoaGame.outline,
          inspirationAuthor: cyoaGame.inspirationAuthor,
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
