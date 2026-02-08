import {
  cyoaGame,
  endingNarrativePromptOutput,
  narrativeGenerationData,
  prompt,
} from '../../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import {
  formatEndingNarrative,
  generateEndingNarrativeContent,
} from '@services/narratives/ending-narrative-content'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('narratives/ending-narrative-content', () => {
  beforeAll(() => {
    jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
    jest.mocked(bedrock).invokeModel.mockResolvedValue(endingNarrativePromptOutput)
  })

  describe('generateEndingNarrativeContent', () => {
    it('should generate ending narrative content successfully', async () => {
      const result = await generateEndingNarrativeContent(cyoaGame, narrativeGenerationData)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-ending-narrative')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(prompt, {
        inventoryAvailable: narrativeGenerationData.inventoryAvailable,
        existingNarrative: cyoaGame.winNarrative,
        previousNarrative: narrativeGenerationData.previousNarrative,
        previousChoice: narrativeGenerationData.previousChoice,
        previousOptions: narrativeGenerationData.previousOptions,
        outline: narrativeGenerationData.outline,
        lossNarrative: narrativeGenerationData.lossNarrative,
        inspirationAuthor: narrativeGenerationData.inspirationAuthor,
      })
      expect(result).toEqual({
        narrative: {
          narrative: 'You have successfully completed your quest and saved the kingdom!',
          chapterTitle: 'Victory',
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

  describe('formatEndingNarrative', () => {
    it('should format ending narrative correctly', () => {
      const result = formatEndingNarrative(endingNarrativePromptOutput)

      expect(result).toEqual({
        narrative: {
          narrative: 'You have successfully completed your quest and saved the kingdom!',
          chapterTitle: 'Victory',
          options: [],
          inventory: [],
          losingTitle: '',
          losingNarrative: '',
        },
        imageDescription: 'A triumphant hero standing in golden sunlight',
      })
    })

    it('should throw error when narrative is missing', () => {
      const invalidOutput = { ...endingNarrativePromptOutput, narrative: undefined }

      expect(() => formatEndingNarrative(invalidOutput)).toThrow()
    })

    it('should throw error when chapterTitle is missing', () => {
      const invalidOutput = { ...endingNarrativePromptOutput, chapterTitle: undefined }

      expect(() => formatEndingNarrative(invalidOutput)).toThrow()
    })

    it('should throw error when imageDescription is missing', () => {
      const invalidOutput = { ...endingNarrativePromptOutput, imageDescription: undefined }

      expect(() => formatEndingNarrative(invalidOutput)).toThrow()
    })

    it('should throw error when narrative is empty string', () => {
      const invalidOutput = { ...endingNarrativePromptOutput, narrative: '' }

      expect(() => formatEndingNarrative(invalidOutput)).toThrow()
    })
  })
})
