import { cyoaChoicesPromptOutput, prompt } from '../../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import { generateGameChoices } from '@services/games/choices'
import { Author, CyoaGameFormatted, GameTheme } from '@types'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('games/choices', () => {
  const mockMathRandom = jest.fn()
  const testAuthor: Author = { name: 'Test Author', style: 'Test style' }
  const testStoryType: GameTheme = {
    name: 'Classic Adventure',
    description: 'A classic adventure story',
    inspirationAuthors: [testAuthor],
  }
  const testGameData: CyoaGameFormatted = {
    title: 'Test Adventure',
    description: 'A test adventure game',
    outline: 'Test outline',
    characters: [{ name: 'Hero', voice: 'heroic' }],
    inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
    resourceName: 'Health',
    startingResourceValue: 100,
    lossResourceThreshold: 0,
  }

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0.5)

    jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
    jest.mocked(bedrock).invokeModel.mockResolvedValue(cyoaChoicesPromptOutput)
  })

  describe('generateGameChoices', () => {
    it('should generate game choices successfully', async () => {
      const result = await generateGameChoices(testGameData, testStoryType, testAuthor, 7)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-choices')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          resourceName: 'Health',
          startingResourceValue: 100,
          lossResourceThreshold: 0,
          choiceCount: 7,
          keyInformationCount: expect.any(Number),
          redHerringCount: expect.any(Number),
          outline: 'Test outline',
          characters: ['Hero'],
          inventory: ['Sword'],
          style: expect.objectContaining({
            name: 'Classic Adventure',
            inspirationAuthor: 'Test Author',
          }),
          inspirationWords: expect.any(Array),
        }),
      )
      expect(result).toEqual(
        expect.objectContaining({
          title: 'Test Adventure',
          keyInformation: ['The dragon guards the treasure', 'The wizard knows ancient spells'],
          redHerrings: ['There might be goblins nearby', 'The forest has hidden traps'],
          winNarrative: 'You have successfully completed your quest and saved the kingdom!',
          choicePoints: expect.arrayContaining([
            expect.objectContaining({
              choice: 'You encounter the wizard. What do you do?',
              options: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Ask for help',
                  rank: 1,
                  consequence: 'The wizard aids you',
                  resourcesToAdd: expect.any(Number),
                }),
              ]),
            }),
          ]),
        }),
      )
    })

    it('should filter out red herrings that are also in key information', async () => {
      const choicesWithOverlap = {
        ...cyoaChoicesPromptOutput,
        keyInformation: ['Important clue 1', 'Shared clue', 'Important clue 2'],
        redHerrings: ['False clue 1', 'Shared clue', 'False clue 2'],
      }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(choicesWithOverlap)

      const result = await generateGameChoices(testGameData, testStoryType, testAuthor, 7)

      expect(result.keyInformation).toEqual(['Important clue 1', 'Shared clue', 'Important clue 2'])
      expect(result.redHerrings).toEqual(['False clue 1', 'False clue 2'])
      expect(result.redHerrings).not.toContain('Shared clue')
    })

    it('should clamp resource range when difference is too small', async () => {
      const gameWithSmallRange = {
        ...testGameData,
        startingResourceValue: 10,
        lossResourceThreshold: 8,
      }

      const result = await generateGameChoices(gameWithSmallRange, testStoryType, testAuthor, 3)

      expect(result.startingResourceValue).toBe(0)
      expect(result.lossResourceThreshold).toBe(5)
    })

    it('should clamp resource range when ending is zero', async () => {
      const gameWithZeroEnding = {
        ...testGameData,
        startingResourceValue: 2,
        lossResourceThreshold: 0,
      }

      const result = await generateGameChoices(gameWithZeroEnding, testStoryType, testAuthor, 2)

      expect(result.startingResourceValue).toBe(5)
      expect(result.lossResourceThreshold).toBe(0)
    })

    it('should not clamp when range is already sufficient', async () => {
      const gameWithSufficientRange = {
        ...testGameData,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      }

      const result = await generateGameChoices(
        gameWithSufficientRange,
        testStoryType,
        testAuthor,
        1,
      )

      expect(result.startingResourceValue).toBe(100)
      expect(result.lossResourceThreshold).toBe(0)
    })

    it('should throw error for invalid choices prompt output', async () => {
      const invalidOutput = { ...cyoaChoicesPromptOutput, keyInformation: undefined }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(invalidOutput)

      await expect(
        generateGameChoices(testGameData, testStoryType, testAuthor, 7),
      ).rejects.toThrow()
    })
  })
})
