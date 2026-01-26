import { cyoaGame, cyoaNarrative } from '../__mocks__'
import { serializeCyoaGame, serializeCyoaNarrative } from '@utils/serialize'

describe('serialize', () => {
  describe('serializeCyoaGame', () => {
    it('should return serialized game with required fields', () => {
      const result = serializeCyoaGame(cyoaGame)

      expect(result).toEqual({
        description: 'A test adventure game',
        image: 'test-image.jpg',
        resourceName: 'Health',
        resourceImage: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/resource.png',
        startingResourceValue: 100,
        lossResourceThreshold: 0,
        title: 'Test Adventure',
        initialNarrativeId: 'start',
      })
    })

    it('should handle game without optional image fields', () => {
      const gameWithoutImages = { ...cyoaGame, image: undefined, resourceImage: undefined }
      const result = serializeCyoaGame(gameWithoutImages)

      expect(result).toEqual({
        description: 'A test adventure game',
        image: undefined,
        resourceName: 'Health',
        resourceImage: undefined,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
        title: 'Test Adventure',
        initialNarrativeId: 'start',
      })
    })
  })

  describe('serializeCyoaNarrative', () => {
    it('should return serialized narrative with required fields', () => {
      const result = serializeCyoaNarrative(cyoaNarrative, cyoaGame, 'start')

      expect(result).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
        choice: 'You see a sleeping dragon. What do you do?',
        options: [{ name: 'Sneak past quietly' }, { name: 'Wake the dragon' }],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 100,
      })
    })

    it('should handle narrative without optional image field', () => {
      const narrativeWithoutImage = { ...cyoaNarrative, image: undefined }
      const result = serializeCyoaNarrative(narrativeWithoutImage, cyoaGame, 'start')

      expect(result).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: undefined,
        choice: 'You see a sleeping dragon. What do you do?',
        options: [{ name: 'Sneak past quietly' }, { name: 'Wake the dragon' }],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 100,
      })
    })

    it('should combine selected option consequence with narrative', () => {
      const result = serializeCyoaNarrative(cyoaNarrative, cyoaGame, 'start-0')

      expect(result.narrative).toBe(
        'You fight bravely\n\nYou find yourself standing before a massive sleeping dragon...',
      )
      expect(result.currentResourceValue).toBe(90) // 100 + (-10)
    })

    it('should calculate resource value correctly for multiple choices', () => {
      const gameWithMultipleChoices = {
        ...cyoaGame,
        choicePoints: [
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Option 1', rank: 1, consequence: 'Result 1', resourcesToAdd: -10 },
              { name: 'Option 2', rank: 2, consequence: 'Result 2', resourcesToAdd: -20 },
            ],
          },
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Option 3', rank: 1, consequence: 'Result 3', resourcesToAdd: 5 },
              { name: 'Option 4', rank: 2, consequence: 'Result 4', resourcesToAdd: -15 },
            ],
          },
        ],
      }

      const result = serializeCyoaNarrative(cyoaNarrative, gameWithMultipleChoices, 'start-0-1')

      expect(result.currentResourceValue).toBe(75) // 100 + (-10) + (-15)
      expect(result.narrative).toBe(
        'Result 4\n\nYou find yourself standing before a massive sleeping dragon...',
      )
    })
  })
})
