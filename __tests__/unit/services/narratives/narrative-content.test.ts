import {
  cyoaGame,
  createNarrativePromptOutput,
  narrativeGenerationData,
  prompt,
} from '../../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import {
  formatNarrative,
  formatOptionNarratives,
  generateNarrativeContent,
} from '@services/narratives/narrative-content'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('narratives/narrative-content', () => {
  beforeAll(() => {
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
      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-option-narrative')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(prompt, {
        inventoryAvailable: ['Sword'],
        existingNarrative: generationDataWithInventory.existingNarrative,
        previousNarrative: generationDataWithInventory.previousNarrative,
        previousChoice: generationDataWithInventory.previousChoice,
        previousOptions: generationDataWithInventory.previousOptions,
        nextChoice: generationDataWithInventory.nextChoice,
        nextOptions: generationDataWithInventory.nextOptions,
        outline: generationDataWithInventory.outline,
        lossNarrative: generationDataWithInventory.lossNarrative,
        inspirationAuthor: generationDataWithInventory.inspirationAuthor,
      })
      expect(bedrock.invokeModel).toHaveBeenCalledWith(prompt, {
        previousNarrative: generationDataWithInventory.previousNarrative,
        previousChoice: generationDataWithInventory.previousChoice,
        previousOptions: generationDataWithInventory.previousOptions,
        nextNarrative: 'You find yourself standing before a massive sleeping dragon...',
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

    it('should skip option narrative generation when previousOptions is falsy', async () => {
      const generationDataWithoutPreviousOptions = {
        ...narrativeGenerationData,
        previousOptions: undefined,
      }

      const result = await generateNarrativeContent(cyoaGame, generationDataWithoutPreviousOptions)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-narrative')
      expect(dynamodb.getPromptById).not.toHaveBeenCalledWith('create-option-narrative')
      expect(bedrock.invokeModel).toHaveBeenCalledTimes(1)
      expect(result.narrative.options).toEqual([])
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

  describe('formatNarrative', () => {
    it('should format narrative correctly with inventory', () => {
      const generationDataWithInventory = {
        ...narrativeGenerationData,
        inventoryAvailable: ['Sword'],
      }

      const result = formatNarrative(
        createNarrativePromptOutput,
        generationDataWithInventory,
        cyoaGame,
      )

      expect(result).toEqual({
        narrative: {
          narrative: 'You find yourself standing before a massive sleeping dragon...',
          chapterTitle: "The Dragon's Lair",
          choice: 'You see a sleeping dragon. What do you do?',
          losingTitle: 'Defeat',
          losingNarrative: 'The dragon awakens and you are defeated.',
          inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        },
        imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
      })
    })

    it('should filter out non-existent inventory items', () => {
      const generationDataWithInvalidInventory = {
        ...narrativeGenerationData,
        inventoryAvailable: ['Sword', 'Non-existent Item'],
      }

      const result = formatNarrative(
        createNarrativePromptOutput,
        generationDataWithInvalidInventory,
        cyoaGame,
      )

      expect(result.narrative.inventory).toEqual([{ name: 'Sword', image: 'sword-image.jpg' }])
    })

    it('should throw error when narrative is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, narrative: undefined }

      expect(() => formatNarrative(invalidOutput, narrativeGenerationData, cyoaGame)).toThrow()
    })

    it('should throw error when chapterTitle is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, chapterTitle: undefined }

      expect(() => formatNarrative(invalidOutput, narrativeGenerationData, cyoaGame)).toThrow()
    })

    it('should throw error when imageDescription is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, imageDescription: undefined }

      expect(() => formatNarrative(invalidOutput, narrativeGenerationData, cyoaGame)).toThrow()
    })

    it('should throw error when losingTitle is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, losingTitle: undefined }

      expect(() => formatNarrative(invalidOutput, narrativeGenerationData, cyoaGame)).toThrow()
    })

    it('should throw error when losingNarrative is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, losingNarrative: undefined }

      expect(() => formatNarrative(invalidOutput, narrativeGenerationData, cyoaGame)).toThrow()
    })
  })

  describe('formatOptionNarratives', () => {
    it('should format option narratives correctly', () => {
      const result = formatOptionNarratives(
        createNarrativePromptOutput,
        narrativeGenerationData,
        cyoaGame,
      )

      expect(result).toEqual({
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
      })
    })

    it('should throw error when choice point not found in game', () => {
      const invalidGenerationData = {
        ...narrativeGenerationData,
        nextChoice: 'Non-existent choice',
      }

      expect(() =>
        formatOptionNarratives(createNarrativePromptOutput, invalidGenerationData, cyoaGame),
      ).toThrow('Choice point not found in game')
    })

    it('should throw error when options array is missing', () => {
      const invalidOutput = { ...createNarrativePromptOutput, options: undefined }

      expect(() =>
        formatOptionNarratives(invalidOutput, narrativeGenerationData, cyoaGame),
      ).toThrow()
    })

    it('should throw error when option narrative is missing', () => {
      const invalidOutput = {
        ...createNarrativePromptOutput,
        options: [{ narrative: 'Valid narrative' }, {}],
      }

      expect(() =>
        formatOptionNarratives(invalidOutput, narrativeGenerationData, cyoaGame),
      ).toThrow()
    })

    it('should throw error when option narrative is empty string', () => {
      const invalidOutput = {
        ...createNarrativePromptOutput,
        options: [{ narrative: 'Valid narrative' }, { narrative: '' }],
      }

      expect(() =>
        formatOptionNarratives(invalidOutput, narrativeGenerationData, cyoaGame),
      ).toThrow()
    })
  })
})
