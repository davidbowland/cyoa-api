import { cyoaGamePromptOutput, prompt } from '../../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import { generateGameOutline } from '@services/games/outlines'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('games/outlines', () => {
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0)

    jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
    jest.mocked(bedrock).invokeModel.mockResolvedValue(cyoaGamePromptOutput)
  })

  describe('generateGameOutline', () => {
    it('should generate game outline successfully', async () => {
      const result = await generateGameOutline([], 7)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-game')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          storyType: expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
          }),
          existingGameTitles: [],
          lossCondition: expect.any(String),
          minimumResourceRange: 35,
          inventoryCount: expect.any(Number),
          inspirationWords: expect.any(Array),
        }),
      )
      expect(result).toEqual({
        game: {
          title: 'Generated Adventure',
          description: 'An AI-generated adventure game',
          outline: 'A journey through an enchanted forest',
          characters: [
            { name: 'Wizard', imageDescription: 'An old wise wizard', voice: 'mystical' },
            { name: 'Dragon', imageDescription: 'A fierce red dragon', voice: 'menacing' },
          ],
          inventory: [
            { name: 'Magic Wand', imageDescription: 'A glowing wooden wand' },
            { name: 'Health Potion', imageDescription: 'A red healing potion' },
          ],
          resourceName: 'Magic Energy',
          startingResourceValue: 50,
          lossResourceThreshold: 5,
        },
        imageDescription: 'A mystical forest scene',
        resourceImageDescription: 'A glowing magical energy crystal',
        storyType: expect.any(Object),
        inspirationAuthor: expect.any(Object),
      })
    })

    it('should include existing game titles in context', async () => {
      const existingTitles = ['Game 1', 'Game 2']

      await generateGameOutline(existingTitles, 7)

      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          existingGameTitles: existingTitles,
        }),
      )
    })

    it('should throw error for invalid game prompt output', async () => {
      const invalidOutput = { ...cyoaGamePromptOutput, title: '' }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(invalidOutput)

      await expect(generateGameOutline([], 7)).rejects.toThrow()
    })

    it('should throw error for missing required fields', async () => {
      const { title: _, ...incompleteOutput } = cyoaGamePromptOutput
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(incompleteOutput)

      await expect(generateGameOutline([], 7)).rejects.toThrow()
    })
  })
})
