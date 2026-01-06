import { CreateGamePromptOutput } from '@types'
import { formatCyoaGame } from '@utils/formatting'

describe('formatting', () => {
  describe('formatCyoaGame', () => {
    const validInput: CreateGamePromptOutput = {
      choicePoints: [
        {
          choice: 'What do you do?',
          inventoryOrInformationConsumed: [],
          inventoryToIntroduce: ['Sword'],
          keyInformationToIntroduce: ['Important clue'],
          options: [
            { name: 'Fight', resourcesToAdd: -10 },
            { name: 'Run', resourcesToAdd: 0 },
          ],
          redHerringsToIntroduce: ['False clue'],
        },
      ],
      characters: [{ imageDescription: 'A brave hero', name: 'Hero', voice: 'heroic' }],
      description: 'A test adventure game',
      inventory: [{ imageDescription: 'A sharp sword', name: 'Sword' }],
      keyInformation: ['Important clue 1', 'Important clue 2'],
      lossResourceThreshold: 0,
      outline: 'Test outline',
      redHerrings: ['False clue 1', 'False clue 2'],
      resourceName: 'Health',
      startingResourceValue: 100,
      title: 'Test Adventure',
      titleImageDescription: 'Epic adventure scene',
    }

    it('should format valid input correctly', () => {
      const result = formatCyoaGame(validInput)

      expect(result.game).toEqual({
        choicePoints: [
          {
            choice: 'What do you do?',
            inventoryOrInformationConsumed: [],
            inventoryToIntroduce: ['Sword'],
            keyInformationToIntroduce: ['Important clue'],
            options: [
              { name: 'Fight', resourcesToAdd: -10 },
              { name: 'Run', resourcesToAdd: 0 },
            ],
            redHerringsToIntroduce: ['False clue'],
          },
        ],
        characters: [{ imageDescription: 'A brave hero', name: 'Hero', voice: 'heroic' }],
        description: 'A test adventure game',
        inventory: [{ imageDescription: 'A sharp sword', name: 'Sword' }],
        keyInformation: ['Important clue 1', 'Important clue 2'],
        lossResourceThreshold: 0,
        outline: 'Test outline',
        redHerrings: ['False clue 1', 'False clue 2'],
        resourceName: 'Health',
        startingResourceValue: 100,
        title: 'Test Adventure',
      })
      expect(result.imageDescription).toBe('Epic adventure scene')
    })

    it('should throw error when title is missing', () => {
      const invalidInput = { ...validInput, title: undefined }

      expect(() => formatCyoaGame(invalidInput)).toThrow()
    })

    it('should throw error when title is wrong type', () => {
      const invalidInput = { ...validInput, title: 123 as any }

      expect(() => formatCyoaGame(invalidInput)).toThrow()
    })

    it('should throw error when startingResourceValue is wrong type', () => {
      const invalidInput = { ...validInput, startingResourceValue: 'invalid' as any }

      expect(() => formatCyoaGame(invalidInput)).toThrow()
    })

    it('should handle empty arrays for optional array fields', () => {
      const inputWithEmptyArrays = {
        ...validInput,
        characters: [],
        choicePoints: [],
        inventory: [],
        keyInformation: [],
        redHerrings: [],
      }

      const result = formatCyoaGame(inputWithEmptyArrays)

      expect(result.game.characters).toEqual([])
      expect(result.game.choicePoints).toEqual([])
      expect(result.game.inventory).toEqual([])
      expect(result.game.keyInformation).toEqual([])
      expect(result.game.redHerrings).toEqual([])
    })

    it('should extract imageDescription from titleImageDescription', () => {
      const inputWithDifferentImage = {
        ...validInput,
        titleImageDescription: 'Different image description',
      }

      const result = formatCyoaGame(inputWithDifferentImage)

      expect(result.imageDescription).toBe('Different image description')
    })
  })
})
