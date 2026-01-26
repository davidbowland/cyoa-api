import { cyoaGame, cyoaNarrative } from '../__mocks__'
import { serializeCyoaChoice, serializeCyoaGame } from '@utils/serialize'

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
        initialChoiceId: 'start',
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
        initialChoiceId: 'start',
      })
    })
  })

  describe('serializeCyoaChoice', () => {
    it('should return serialized choice with combined narrative', () => {
      const result = serializeCyoaChoice(cyoaNarrative, false, 100, 0)

      expect(result).toEqual({
        narrative:
          'You carefully tiptoe past the sleeping beast...\n\nYou find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
        choice: 'You see a sleeping dragon. What do you do?',
        options: [
          {
            name: 'Sneak past quietly',
            narrative: 'You carefully tiptoe past the sleeping beast...',
          },
          { name: 'Wake the dragon', narrative: 'You loudly call out to wake the dragon...' },
        ],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 100,
      })
    })

    it('should use losing narrative when game is lost', () => {
      const result = serializeCyoaChoice(cyoaNarrative, true, 0, 0)

      expect(result.narrative).toBe(
        'You carefully tiptoe past the sleeping beast...\n\nThe dragon awakens and you are defeated.',
      )
    })

    it('should handle narrative without selected option', () => {
      const result = serializeCyoaChoice(cyoaNarrative, false, 100, 5)

      expect(result.narrative).toBe(
        'You find yourself standing before a massive sleeping dragon...',
      )
    })

    it('should handle narrative without optional image field', () => {
      const narrativeWithoutImage = { ...cyoaNarrative, image: undefined }
      const result = serializeCyoaChoice(narrativeWithoutImage, false, 100, 0)

      expect(result.image).toBeUndefined()
    })
  })
})
