import {
  createNarrativePromptOutput,
  cyoaGame,
  cyoaNarrative,
  gameId,
  narrativeGenerationData,
  narrativeId,
  prompt,
} from '../__mocks__'
import * as bedrockService from '@services/bedrock'
import * as dynamodbService from '@services/dynamodb'
import { createNarrative, startNarrativeGeneration } from '@services/narratives'
import * as formattingUtils from '@utils/formatting'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/formatting')
const mockSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockSend(...args),
  })),
  InvokeCommand: jest.fn().mockImplementation((x) => x),
}))
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))
jest.mock('@utils/random', () => ({
  getRandomSample: jest.fn().mockImplementation((array, count) => array.slice(0, count)),
}))

describe('narratives', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
    jest.mocked(bedrockService).invokeModel.mockResolvedValue(createNarrativePromptOutput)
    jest.mocked(dynamodbService).getGameById.mockResolvedValue(cyoaGame)
    jest
      .mocked(dynamodbService)
      .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
    jest.mocked(dynamodbService).getPromptById.mockResolvedValue(prompt)
    jest.mocked(dynamodbService).setNarrativeById.mockResolvedValue({} as any)
    jest.mocked(dynamodbService).setNarrativeGenerationData.mockResolvedValue({} as any)
    jest.mocked(formattingUtils).formatNarrative.mockReturnValue(cyoaNarrative)
  })

  describe('startNarrativeGeneration', () => {
    it('should set generation data and invoke CreateNarrativeFunction', async () => {
      const generationDataWithoutTime = {
        recap: 'Previous events recap',
        currentResourceValue: 75,
        lastChoiceMade: 'Asked for help',
        currentInventory: ['Sword', 'Magic Wand'],
      }
      const currentChoice = {
        inventoryToIntroduce: ['Health Potion'],
        keyInformationToIntroduce: ['The dragon is sleeping'],
        redHerringsToIntroduce: ['Strange noises in the distance'],
        inventoryOrInformationConsumed: ['Old Map'],
        choice: 'You see a sleeping dragon. What do you do?',
        options: [
          { name: 'Sneak past quietly', resourcesToAdd: 0 },
          { name: 'Wake the dragon', resourcesToAdd: -20 },
        ],
      }

      await startNarrativeGeneration(gameId, narrativeId, generationDataWithoutTime, currentChoice)

      expect(dynamodbService.setNarrativeGenerationData).toHaveBeenCalledWith(gameId, narrativeId, {
        ...generationDataWithoutTime,
        inventoryToIntroduce: currentChoice.inventoryToIntroduce,
        keyInformationToIntroduce: currentChoice.keyInformationToIntroduce,
        redHerringsToIntroduce: currentChoice.redHerringsToIntroduce,
        inventoryOrInformationConsumed: currentChoice.inventoryOrInformationConsumed,
        nextChoice: currentChoice.choice,
        options: currentChoice.options,
        generationStartTime: mockNow,
      })
      expect(mockSend).toHaveBeenCalledWith({
        FunctionName: 'create-narrative-function',
        InvocationType: 'Event',
        Payload: JSON.stringify({ gameId, narrativeId }),
      })
    })
  })

  describe('createNarrative', () => {
    it('should create narrative with correct context and save result', async () => {
      const result = await createNarrative(gameId, narrativeId)

      expect(dynamodbService.getGameById).toHaveBeenCalledWith(gameId)
      expect(dynamodbService.getNarrativeById).toHaveBeenCalledWith(gameId, narrativeId)
      expect(dynamodbService.getPromptById).toHaveBeenCalledWith('create-game')
      expect(bedrockService.invokeModel).toHaveBeenCalledWith(prompt, {
        ...narrativeGenerationData,
        outline: cyoaGame.outline,
        resourceName: cyoaGame.resourceName,
        lossResourceThreshold: cyoaGame.lossResourceThreshold,
        inspirationWords: ['time', 'year', 'be', 'have', 'good', 'new'],
      })
      expect(formattingUtils.formatNarrative).toHaveBeenCalledWith(
        createNarrativePromptOutput,
        narrativeGenerationData,
      )
      expect(dynamodbService.setNarrativeById).toHaveBeenCalledWith(
        gameId,
        narrativeId,
        cyoaNarrative,
      )
      expect(result).toEqual(cyoaNarrative)
    })

    it('should throw error when generation data not found', async () => {
      jest.mocked(dynamodbService).getNarrativeById.mockResolvedValueOnce({})

      await expect(createNarrative(gameId, narrativeId)).rejects.toThrow(
        'Generation data not found',
      )
    })

    it('should handle missing optional fields in generated narrative', async () => {
      const partialOutput = {
        narrative: 'Test narrative',
      }
      const expectedFormattedResult = {
        narrative: 'Test narrative',
        recap: '',
        choice: '',
        options: [],
        inventory: [],
        currentResourceValue: 75,
      }
      jest.mocked(bedrockService).invokeModel.mockResolvedValueOnce(partialOutput)
      jest.mocked(formattingUtils).formatNarrative.mockReturnValueOnce(expectedFormattedResult)

      const result = await createNarrative(gameId, narrativeId)

      expect(formattingUtils.formatNarrative).toHaveBeenCalledWith(
        partialOutput,
        narrativeGenerationData,
      )
      expect(result).toEqual(expectedFormattedResult)
    })
  })
})
