import {
  cyoaGamePromptOutput,
  createNarrativePromptOutput,
  narrativeGenerationData,
} from '../__mocks__'
import { CyoaGame } from '@types'
import { formatCyoaGame, formatNarrative } from '@utils/formatting'

describe('formatting', () => {
  describe('formatCyoaGame', () => {
    it('should format valid game prompt output', () => {
      const result = formatCyoaGame(cyoaGamePromptOutput)

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
        choicePoints: [
          {
            inventoryToIntroduce: ['Magic Wand'],
            keyInformationToIntroduce: ['The wizard knows ancient spells'],
            redHerringsToIntroduce: ['There might be goblins nearby'],
            inventoryOrInformationConsumed: [],
            choice: 'You encounter the wizard. What do you do?',
            options: [
              { name: 'Ask for help', resourcesToAdd: 5 },
              { name: 'Challenge the wizard', resourcesToAdd: -15 },
            ],
          },
        ],
      })
      expect(result.imageDescription).toBe('A mystical forest scene')
    })

    it('should throw error for invalid game prompt output', () => {
      const invalidInput = { ...cyoaGamePromptOutput, title: '' }

      expect(() => formatCyoaGame(invalidInput as any)).toThrow()
    })

    it('should throw error for missing required fields', () => {
      const { title: _, ...incompleteInput } = cyoaGamePromptOutput

      expect(() => formatCyoaGame(incompleteInput)).toThrow()
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
      choicePoints: [],
      initialNarrativeId: 'start',
    }

    it('should format valid narrative prompt output', () => {
      const result = formatNarrative(createNarrativePromptOutput, narrativeGenerationData, mockGame)

      expect(result).toEqual({
        narrative: {
          narrative: 'You find yourself standing before a massive sleeping dragon...',
          recap:
            'After asking the wizard for help, you received a magic wand and learned about the dragon.',
          chapterTitle: "The Dragon's Lair",
          choice: 'You see a sleeping dragon. What do you do?',
          options: [
            { name: 'Sneak past quietly', resourcesToAdd: 0 },
            { name: 'Wake the dragon', resourcesToAdd: -20 },
          ],
          inventory: [
            { name: 'Sword', image: 'sword-image.jpg' },
            { name: 'Magic Wand' },
            { name: 'Health Potion' },
          ],
          currentResourceValue: 75,
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
        options: [{ name: 'Invalid option' }], // Missing resourcesToAdd
      }

      expect(() =>
        formatNarrative(invalidOptionsInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should throw error for empty option name', () => {
      const emptyNameInput = {
        ...createNarrativePromptOutput,
        options: [{ name: '', resourcesToAdd: 0 }],
      }

      expect(() =>
        formatNarrative(emptyNameInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })

    it('should throw error for empty required strings', () => {
      const emptyStringInput = {
        ...createNarrativePromptOutput,
        choice: '',
      }

      expect(() =>
        formatNarrative(emptyStringInput as any, narrativeGenerationData, mockGame),
      ).toThrow()
    })
  })
})
