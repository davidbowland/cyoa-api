import {
  generateGameCoverImage,
  generateInventoryImages,
  generateResourceImage,
} from '@services/games/game-image-generation'
import * as imageGeneration from '@services/image-generation'

jest.mock('@services/image-generation')
jest.mock('@utils/logging')

describe('games/game-image-generation', () => {
  const gameId = 'test-game'

  beforeAll(() => {
    jest.mocked(imageGeneration).getImageGenerationData.mockResolvedValue({
      imageGenerationOptions: {
        quality: 'standard',
        cfgScale: 8,
        height: 512,
        width: 512,
        seed: 0,
        negativeText: 'No text, not deformed',
      },
      model: 'amazon.nova-canvas-v1:0',
    })
    jest
      .mocked(imageGeneration)
      .generateImageToS3.mockResolvedValue(
        'https://cyoa-assets.dbowland.com/images/test-game/test.png',
      )
  })

  describe('generateGameCoverImage', () => {
    it('should generate cover image successfully', async () => {
      const imageDescription = 'A mystical fantasy adventure scene'

      const result = await generateGameCoverImage(gameId, imageDescription)

      expect(imageGeneration.getImageGenerationData).toHaveBeenCalledWith('cover-image')
      expect(imageGeneration.generateImageToS3).toHaveBeenCalledWith(
        imageDescription,
        'images/test-game/cover.png',
        expect.any(Object),
      )
      expect(result).toBe('https://cyoa-assets.dbowland.com/images/test-game/test.png')
    })

    it('should return undefined when image generation fails', async () => {
      jest
        .mocked(imageGeneration)
        .generateImageToS3.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await generateGameCoverImage(gameId, 'Test description')

      expect(result).toBeUndefined()
    })
  })

  describe('generateInventoryImages', () => {
    it('should generate images for all inventory items', async () => {
      const inventory = [
        { name: 'Magic Sword', imageDescription: 'A glowing sword' },
        { name: 'Health Potion', imageDescription: 'A red potion' },
      ]

      const result = await generateInventoryImages(gameId, inventory)

      expect(imageGeneration.getImageGenerationData).toHaveBeenCalledWith('inventory-image')
      expect(imageGeneration.generateImageToS3).toHaveBeenCalledTimes(2)
      expect(result).toEqual([
        {
          name: 'Magic Sword',
          image: 'https://cyoa-assets.dbowland.com/images/test-game/test.png',
        },
        {
          name: 'Health Potion',
          image: 'https://cyoa-assets.dbowland.com/images/test-game/test.png',
        },
      ])
    })

    it('should skip items without imageDescription', async () => {
      const inventory = [
        { name: 'Magic Sword', imageDescription: 'A glowing sword' },
        { name: 'Plain Item' },
      ]

      const result = await generateInventoryImages(gameId, inventory)

      expect(imageGeneration.generateImageToS3).toHaveBeenCalledTimes(1)
      expect(result).toEqual([
        {
          name: 'Magic Sword',
          image: 'https://cyoa-assets.dbowland.com/images/test-game/test.png',
        },
        { name: 'Plain Item' },
      ])
    })

    it('should continue processing other items when one fails', async () => {
      jest
        .mocked(imageGeneration)
        .generateImageToS3.mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce('https://cyoa-assets.dbowland.com/images/test-game/test.png')

      const inventory = [
        { name: 'Failed Item', imageDescription: 'Will fail' },
        { name: 'Success Item', imageDescription: 'Will succeed' },
      ]

      const result = await generateInventoryImages(gameId, inventory)

      expect(result).toEqual([
        { name: 'Failed Item' },
        {
          name: 'Success Item',
          image: 'https://cyoa-assets.dbowland.com/images/test-game/test.png',
        },
      ])
    })
  })

  describe('generateResourceImage', () => {
    it('should generate resource image successfully', async () => {
      const imageDescription = 'A glowing magical energy crystal'

      const result = await generateResourceImage(gameId, imageDescription)

      expect(imageGeneration.getImageGenerationData).toHaveBeenCalledWith('resource-image')
      expect(imageGeneration.generateImageToS3).toHaveBeenCalledWith(
        imageDescription,
        'images/test-game/resource.png',
        expect.any(Object),
      )
      expect(result).toBe('https://cyoa-assets.dbowland.com/images/test-game/test.png')
    })

    it('should return undefined when image generation fails', async () => {
      jest
        .mocked(imageGeneration)
        .generateImageToS3.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await generateResourceImage(gameId, 'Test description')

      expect(result).toBeUndefined()
    })
  })
})
