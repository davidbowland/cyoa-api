import { cyoaGame } from '../__mocks__'
import { serializeCyoaGame } from '@utils/serialize'

describe('serialize', () => {
  describe('serializeCyoaGame', () => {
    it('should return serialized game with required fields', () => {
      const result = serializeCyoaGame(cyoaGame)

      expect(result).toEqual({
        description: 'A test adventure game',
        image: 'test-image.jpg',
        initialNarrativeId: 'start',
        resourceName: 'Health',
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
        resourceName: 'Health',
        title: 'Test Adventure',
      })
    })

    it('should only include specified fields from CyoaGame', () => {
      const result = serializeCyoaGame(cyoaGame)

      expect(result).not.toHaveProperty('outline')
      expect(result).not.toHaveProperty('characters')
      expect(result).not.toHaveProperty('inventory')
      expect(result).not.toHaveProperty('keyInformation')
      expect(result).not.toHaveProperty('redHerrings')
      expect(result).not.toHaveProperty('startingResourceValue')
      expect(result).not.toHaveProperty('lossResourceThreshold')
      expect(result).not.toHaveProperty('choicePoints')
    })
  })
})
