import { cyoaGame, cyoaNarrative } from '../__mocks__'
import { serializeCyoaGame, serializeCyoaNarrative } from '@utils/serialize'

describe('serialize', () => {
  describe('serializeCyoaGame', () => {
    it('should return serialized game with required fields', () => {
      const result = serializeCyoaGame(cyoaGame)

      expect(result).toEqual({
        description: 'A test adventure game',
        image: 'test-image.jpg',
        initialNarrativeId: 'start',
        lossResourceThreshold: 0,
        resourceName: 'Health',
        startingResourceValue: 100,
        title: 'Test Adventure',
      })
    })

    it('should handle game without optional image field', () => {
      const gameWithoutImage = { ...cyoaGame, image: undefined }
      const result = serializeCyoaGame(gameWithoutImage)

      expect(result).toEqual({
        description: 'A test adventure game',
        image: undefined,
        initialNarrativeId: 'start',
        lossResourceThreshold: 0,
        resourceName: 'Health',
        startingResourceValue: 100,
        title: 'Test Adventure',
      })
    })
  })

  describe('serializeCyoaNarrative', () => {
    it('should return serialized narrative with required fields', () => {
      const result = serializeCyoaNarrative(cyoaNarrative)

      expect(result).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
        choice: 'You see a sleeping dragon. What do you do?',
        options: [{ name: 'Sneak past quietly' }, { name: 'Wake the dragon' }],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 75,
      })
    })

    it('should handle narrative without optional image field', () => {
      const narrativeWithoutImage = { ...cyoaNarrative, image: undefined }
      const result = serializeCyoaNarrative(narrativeWithoutImage)

      expect(result).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: undefined,
        choice: 'You see a sleeping dragon. What do you do?',
        options: [{ name: 'Sneak past quietly' }, { name: 'Wake the dragon' }],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 75,
      })
    })
  })
})
