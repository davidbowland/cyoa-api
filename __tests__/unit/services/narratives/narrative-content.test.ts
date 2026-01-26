import {
  cyoaGame,
  createNarrativePromptOutput,
  endingNarrativePromptOutput,
  narrativeGenerationData,
  prompt,
} from '../../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import {
  generateEndingNarrativeContent,
  generateNarrativeContent,
} from '@services/narratives/narrative-content'
import * as randomUtils from '@utils/random'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/random')
jest.mock('@utils/logging')

describe('narratives/narrative-content', () => {
  beforeAll(() => {
    jest.mocked(randomUtils).getRandomSample.mockImplementation((array) => [...array])
    jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
    jest.mocked(bedrock).invokeModel.mockResolvedValue(createNarrativePromptOutput)
  })

  describe('generateNarrativeContent', () => {
    it('should generate narrative content successfully', async () => {
      const generationDataWithInventory = {
        ...narrativeGenerationData,
        inventoryAvailable: ['Sword'],
      }

      const result = await generateNarrativeContent(cyoaGame, generationDataWithInventory)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-narrative')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(prompt, {
        inventoryAvailable: ['Sword'],
        existingNarrative: generationDataWithInventory.existingNarrative,
        previousChoice: generationDataWithInventory.previousChoice,
        previousOptions: generationDataWithInventory.previousOptions,
        nextChoice: generationDataWithInventory.nextChoice,
        nextOptions: generationDataWithInventory.nextOptions,
        outline: generationDataWithInventory.outline,
        lossNarrative: generationDataWithInventory.lossNarrative,
        inspirationAuthor: generationDataWithInventory.inspirationAuthor,
      })
      expect(result).toEqual({
        narrative: {
          narrative: 'You find yourself standing before a massive sleeping dragon...',
          chapterTitle: "The Dragon's Lair",
          choice: 'You see a sleeping dragon. What do you do?',
          losingTitle: 'Defeat',
          losingNarrative: 'The dragon awakens and you are defeated.',
          inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
          options: [
            {
              name: 'Fight',
              narrative: 'You carefully tiptoe past the sleeping beast...',
            },
            {
              name: 'Run',
              narrative: 'You loudly call out to wake the dragon...',
            },
          ],
        },
        imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
      })
    })

    it('should throw error when choice point not found in game', async () => {
      const invalidGenerationData = {
        ...narrativeGenerationData,
        nextChoice: 'Non-existent choice',
      }

      await expect(generateNarrativeContent(cyoaGame, invalidGenerationData)).rejects.toThrow(
        'Choice point not found in game',
      )
    })

    it('should throw error for invalid narrative prompt output', async () => {
      const invalidOutput = { ...createNarrativePromptOutput, narrative: '' }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(invalidOutput)

      await expect(generateNarrativeContent(cyoaGame, narrativeGenerationData)).rejects.toThrow()
    })

    it('should filter inventory items that exist in game', async () => {
      const generationDataWithMissingInventory = {
        ...narrativeGenerationData,
        inventoryAvailable: ['Sword', 'Non-existent Item'],
      }

      const result = await generateNarrativeContent(cyoaGame, generationDataWithMissingInventory)

      expect(result.narrative.inventory).toEqual([{ name: 'Sword', image: 'sword-image.jpg' }])
    })
  })

  describe('generateEndingNarrativeContent', () => {
    it('should generate ending narrative content successfully', async () => {
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(endingNarrativePromptOutput)

      const result = await generateEndingNarrativeContent(cyoaGame, narrativeGenerationData)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-ending-narrative')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(prompt, {
        inventoryAvailable: narrativeGenerationData.inventoryAvailable,
        existingNarrative: cyoaGame.winNarrative,
        previousChoice: narrativeGenerationData.previousChoice,
        previousOptions: narrativeGenerationData.previousOptions,
        lossNarrative: narrativeGenerationData.lossNarrative,
        outline: narrativeGenerationData.outline,
        inspirationAuthor: narrativeGenerationData.inspirationAuthor,
      })
      expect(result).toEqual({
        narrative: {
          narrative: 'You have successfully completed your quest and saved the kingdom!',
          chapterTitle: 'Victory',
          choice: undefined,
          options: [],
          inventory: [],
          losingTitle: '',
          losingNarrative: '',
        },
        imageDescription: 'A triumphant hero standing in golden sunlight',
      })
    })

    it('should throw error for invalid ending narrative prompt output', async () => {
      const invalidOutput = { ...endingNarrativePromptOutput, narrative: '' }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(invalidOutput)

      await expect(
        generateEndingNarrativeContent(cyoaGame, narrativeGenerationData),
      ).rejects.toThrow()
    })
  })
})
