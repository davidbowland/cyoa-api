import {
  cyoaGamePromptOutput,
  cyoaChoicesPromptOutput,
  createNarrativePromptOutput,
  endingNarrativePromptOutput,
  narrativeGenerationData,
} from '../__mocks__'
import { CyoaGame } from '@types'
import { formatCyoaGame, formatEndingNarrative, formatNarrative } from '@utils/formatting'
import * as randomUtils from '@utils/random'

jest.mock('@utils/random')

describe('formatting', () => {
  const mockMathRandom = jest.fn()

  const testAuthor = {
    name: 'Test Author',
    style: 'Test style',
  }

  beforeAll(() => {
    jest.mocked(randomUtils).getRandomSample.mockImplementation((array) => [...array])

    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0.5)
  })
  describe('formatCyoaGame', () => {
    it('should format valid game prompt output', () => {
      const result = formatCyoaGame(cyoaGamePromptOutput, cyoaChoicesPromptOutput, testAuthor)

      expect(result.game).toEqual({
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
        keyInformation: ['The dragon guards the treasure', 'The wizard knows ancient spells'],
        redHerrings: ['There might be goblins nearby', 'The forest has hidden traps'],
        resourceName: 'Magic Energy',
        startingResourceValue: 50,
        lossResourceThreshold: 5,
        initialNarrativeId: 'start',
        inspirationAuthor: testAuthor,
        choicePoints: [
          {
            keyInformationToIntroduce: ['The wizard knows ancient spells'],
            redHerringsToIntroduce: ['There might be goblins nearby'],
            inventoryAvailable: ['Magic Wand'],
            choiceNarrative: 'You meet a wise wizard in the forest',
            choice: 'You encounter the wizard. What do you do?',
            options: [
              {
                name: 'Ask for help',
                rank: 1,
                consequence: 'The wizard aids you',
                resourcesToAdd: expect.any(Number),
              },
              {
                name: 'Challenge the wizard',
                rank: 2,
                consequence: 'The wizard is offended',
                resourcesToAdd: expect.any(Number),
              },
            ],
          },
        ],
      })
      expect(result.imageDescription).toBe('A mystical forest scene')
      expect(result.resourceImageDescription).toBe('A glowing magical energy crystal')
    })

    it('should clamp resource range when difference is too small', () => {
      const inputWithSmallRange = {
        ...cyoaGamePromptOutput,
        startingResourceValue: 10,
        lossResourceThreshold: 8,
      }
      const choicesWithMultiplePoints = {
        ...cyoaChoicesPromptOutput,
        choicePoints: [
          cyoaChoicesPromptOutput.choicePoints[0],
          cyoaChoicesPromptOutput.choicePoints[0],
          cyoaChoicesPromptOutput.choicePoints[0],
        ], // 3 choice points, minRange = 15
      }

      const result = formatCyoaGame(inputWithSmallRange, choicesWithMultiplePoints, testAuthor)

      expect(result.game.startingResourceValue).toBe(0)
      expect(result.game.lossResourceThreshold).toBe(15)
    })

    it('should clamp resource range when ending is zero', () => {
      const inputWithZeroEnding = {
        ...cyoaGamePromptOutput,
        startingResourceValue: 2,
        lossResourceThreshold: 0,
      }
      const choicesWithTwoPoints = {
        ...cyoaChoicesPromptOutput,
        choicePoints: [
          cyoaChoicesPromptOutput.choicePoints[0],
          cyoaChoicesPromptOutput.choicePoints[0],
        ], // 2 choice points, minRange = 10
      }

      const result = formatCyoaGame(inputWithZeroEnding, choicesWithTwoPoints, testAuthor)

      expect(result.game.startingResourceValue).toBe(10)
      expect(result.game.lossResourceThreshold).toBe(0)
    })

    it('should not clamp when range is already sufficient', () => {
      const inputWithSufficientRange = {
        ...cyoaGamePromptOutput,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      }
      const choicesWithOnePoint = {
        ...cyoaChoicesPromptOutput,
        choicePoints: [cyoaChoicesPromptOutput.choicePoints[0]], // 1 choice point, minRange = 5
      }

      const result = formatCyoaGame(inputWithSufficientRange, choicesWithOnePoint, testAuthor)

      expect(result.game.startingResourceValue).toBe(100)
      expect(result.game.lossResourceThreshold).toBe(0)
    })

    it('should throw error for invalid game prompt output', () => {
      const invalidInput = { ...cyoaGamePromptOutput, title: '' }

      expect(() =>
        formatCyoaGame(invalidInput as any, cyoaChoicesPromptOutput, testAuthor),
      ).toThrow()
    })

    it('should throw error for missing required fields', () => {
      const { title: _, ...incompleteInput } = cyoaGamePromptOutput

      expect(() => formatCyoaGame(incompleteInput, cyoaChoicesPromptOutput, testAuthor)).toThrow()
    })
  })

  describe('formatNarrative', () => {
    const mockGame: CyoaGame = {
      title: 'Test Game',
      description: 'Test Description',
      outline: 'Test Outline',
      characters: [],
      inventory: [
        { name: 'Sword', image: 'sword-image.jpg' },
        { name: 'Magic Wand' },
        { name: 'Health Potion' },
      ],
      keyInformation: [],
      redHerrings: [],
      resourceName: 'Health',
      startingResourceValue: 100,
      lossResourceThreshold: 0,
      choicePoints: [
        {
          keyInformationToIntroduce: [],
          redHerringsToIntroduce: [],
          inventoryAvailable: [],
          choiceNarrative: 'Test narrative',
          choice: 'You see a sleeping dragon. What do you do?',
          options: [
            {
              name: 'Sneak past quietly',
              rank: 1,
              consequence: 'You move silently',
              resourcesToAdd: -7,
            },
            {
              name: 'Wake the dragon',
              rank: 2,
              consequence: 'The dragon awakens',
              resourcesToAdd: -19,
            },
          ],
        },
      ],
      initialNarrativeId: 'start',
      inspirationAuthor: {
        name: 'Test Author',
        style: 'Test style',
      },
    }

    it('should format valid narrative prompt output', () => {
      const result = formatNarrative(createNarrativePromptOutput, narrativeGenerationData, mockGame)

      expect(result).toEqual({
        narrative: {
          narrative: 'You find yourself standing before a massive sleeping dragon...',
          recap: 'Previous events recap',
          chapterTitle: "The Dragon's Lair",
          choice: 'You see a sleeping dragon. What do you do?',
          options: [
            {
              name: 'Sneak past quietly',
              rank: 1,
              consequence: 'You move silently',
              resourcesToAdd: -7,
            },
            {
              name: 'Wake the dragon',
              rank: 2,
              consequence: 'The dragon awakens',
              resourcesToAdd: -19,
            },
          ],
          inventory: [{ name: 'Sword', image: 'sword-image.jpg' }, { name: 'Magic Wand' }],
        },
        imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
      })
    })

    it('should throw error for invalid narrative prompt output', () => {
      const invalidInput = { ...createNarrativePromptOutput, narrative: '' }

      expect(() =>
        formatNarrative(invalidInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should throw error for missing required fields', () => {
      const { narrative: _, ...incompleteInput } = createNarrativePromptOutput

      expect(() => formatNarrative(incompleteInput, narrativeGenerationData, mockGame)).toThrow()
    })

    it('should throw error for invalid option structure', () => {
      const invalidOptionsInput = {
        ...createNarrativePromptOutput,
        options: [{ name: 'Invalid option' }], // Missing narrative
      }

      expect(() =>
        formatNarrative(invalidOptionsInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should throw error for empty option name', () => {
      const emptyNameInput = {
        ...createNarrativePromptOutput,
        options: [{ narrative: '' }],
      }

      expect(() =>
        formatNarrative(emptyNameInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should throw error for empty required strings', () => {
      const emptyStringInput = {
        ...createNarrativePromptOutput,
        narrative: '',
      }

      expect(() =>
        formatNarrative(emptyStringInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should use randomized options in narrative output', () => {
      const shuffledOptions = [
        {
          name: 'Wake the dragon',
          rank: 2,
          consequence: 'The dragon awakens',
          resourcesToAdd: -19,
        },
        {
          name: 'Sneak past quietly',
          rank: 1,
          consequence: 'You move silently',
          resourcesToAdd: -7,
        },
      ]
      jest.mocked(randomUtils).getRandomSample.mockReturnValueOnce(shuffledOptions)

      const result = formatNarrative(createNarrativePromptOutput, narrativeGenerationData, mockGame)

      expect(result.narrative.options).toEqual(shuffledOptions)
      expect(randomUtils.getRandomSample).toHaveBeenCalledWith(
        [
          {
            name: 'Sneak past quietly',
            rank: 1,
            consequence: 'You move silently',
            resourcesToAdd: -7,
          },
          {
            name: 'Wake the dragon',
            rank: 2,
            consequence: 'The dragon awakens',
            resourcesToAdd: -19,
          },
        ],
        2,
      )
    })
  })

  describe('formatEndingNarrative', () => {
    it('should format valid ending narrative prompt output', () => {
      const result = formatEndingNarrative(endingNarrativePromptOutput, narrativeGenerationData)

      expect(result).toEqual({
        narrative: {
          narrative: 'You have successfully completed your quest and saved the kingdom!',
          recap: 'Previous events recap',
          chapterTitle: 'Victory',
          choice: undefined,
          options: [],
          inventory: [],
        },
        imageDescription: 'A triumphant hero standing in golden sunlight',
      })
    })

    it('should throw error for invalid ending narrative prompt output', () => {
      const invalidInput = { ...endingNarrativePromptOutput, narrative: '' }

      expect(() => formatEndingNarrative(invalidInput as any, narrativeGenerationData)).toThrow()
    })

    it('should throw error for missing required fields', () => {
      const { narrative: _, ...incompleteInput } = endingNarrativePromptOutput

      expect(() => formatEndingNarrative(incompleteInput, narrativeGenerationData)).toThrow()
    })

    it('should throw error for empty chapter title', () => {
      const emptyTitleInput = {
        ...endingNarrativePromptOutput,
        chapterTitle: '',
      }

      expect(() => formatEndingNarrative(emptyTitleInput as any, narrativeGenerationData)).toThrow()
    })

    it('should throw error for empty image description', () => {
      const emptyImageInput = {
        ...endingNarrativePromptOutput,
        imageDescription: '',
      }

      expect(() => formatEndingNarrative(emptyImageInput as any, narrativeGenerationData)).toThrow()
    })
  })
})
