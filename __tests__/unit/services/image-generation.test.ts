import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import { generateInventoryImages } from '@services/image-generation'
import * as s3 from '@services/s3'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/s3')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('generateInventoryImages', () => {
  const mockImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const mockPrompt = {
    config: {
      quality: 'standard',
      cfgScale: 8,
      height: 512,
      width: 512,
      seed: 0,
    },
    contents: 'No text, not deformed, no surreal',
  }

  const setupMocks = () => {
    jest.mocked(dynamodb.getPromptById).mockResolvedValue(mockPrompt)
    jest.mocked(bedrock.generateImage).mockResolvedValue({ imageData: mockImageData })
    jest.mocked(s3.putS3Object).mockResolvedValue({} as any)
  }

  describe('successful image generation', () => {
    beforeAll(() => {
      setupMocks()
    })

    it('should generate images for all inventory items', async () => {
      const gameId = 'test-game'
      const inventory = [{ name: 'Magic Sword' }, { name: 'Health Potion' }]

      const result = await generateInventoryImages(gameId, inventory)

      expect(result).toEqual([
        { name: 'Magic Sword', image: 'test-game/inventory/magic-sword' },
        { name: 'Health Potion', image: 'test-game/inventory/health-potion' },
      ])
    })

    it('should retrieve negative prompt configuration', async () => {
      const gameId = 'test-game'
      const inventory = [{ name: 'Test Item' }]

      await generateInventoryImages(gameId, inventory)

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('image-negative')
    })

    it('should generate images with correct options', async () => {
      const gameId = 'test-game'
      const inventory = [{ name: 'Test Item' }]

      await generateInventoryImages(gameId, inventory)

      expect(bedrock.generateImage).toHaveBeenCalledWith('Test Item', {
        quality: 'standard',
        cfgScale: 8,
        height: 512,
        width: 512,
        seed: 0,
        negativeText: 'No text, not deformed, no surreal',
      })
    })

    it('should save images to S3 with correct keys', async () => {
      const gameId = 'test-game'
      const inventory = [{ name: 'Magic Sword' }]

      await generateInventoryImages(gameId, inventory)

      expect(s3.putS3Object).toHaveBeenCalledWith(
        'images/test-game/inventory/magic-sword',
        Buffer.from(mockImageData),
        {
          'Content-Type': 'image/png',
          'game-id': 'test-game',
          'item-name': 'Magic Sword',
        },
      )
    })
  })

  describe('error handling', () => {
    beforeAll(() => {
      jest.mocked(dynamodb.getPromptById).mockResolvedValue(mockPrompt)
    })

    it('should continue processing other items when one fails', async () => {
      jest
        .mocked(bedrock.generateImage)
        .mockRejectedValueOnce(new Error('Image generation failed'))
        .mockResolvedValueOnce({ imageData: mockImageData })
      jest.mocked(s3.putS3Object).mockResolvedValue({} as any)

      const gameId = 'test-game'
      const inventory = [{ name: 'Failed Item' }, { name: 'Success Item' }]

      const result = await generateInventoryImages(gameId, inventory)

      expect(result).toEqual([
        { name: 'Failed Item' },
        { name: 'Success Item', image: 'test-game/inventory/success-item' },
      ])
    })

    it('should handle S3 upload failures', async () => {
      jest.mocked(bedrock.generateImage).mockResolvedValue({ imageData: mockImageData })
      jest.mocked(s3.putS3Object).mockRejectedValueOnce(new Error('S3 upload failed'))

      const gameId = 'test-game'
      const inventory = [{ name: 'Test Item' }]

      const result = await generateInventoryImages(gameId, inventory)

      expect(result).toEqual([{ name: 'Test Item' }])
    })
  })

  describe('with custom prompt configuration', () => {
    beforeAll(() => {
      const customPrompt = {
        config: {
          quality: 'premium',
          cfgScale: 10,
          height: 1024,
          width: 1024,
          seed: 42,
        },
        contents: 'Custom negative prompt',
      }
      jest.mocked(dynamodb.getPromptById).mockResolvedValue(customPrompt)
      jest.mocked(bedrock.generateImage).mockResolvedValue({ imageData: mockImageData })
      jest.mocked(s3.putS3Object).mockResolvedValue({} as any)
    })

    it('should use custom configuration from prompt', async () => {
      const gameId = 'test-game'
      const inventory = [{ name: 'Test Item' }]

      await generateInventoryImages(gameId, inventory)

      expect(bedrock.generateImage).toHaveBeenCalledWith('Test Item', {
        quality: 'premium',
        cfgScale: 10,
        height: 1024,
        width: 1024,
        seed: 42,
        negativeText: 'Custom negative prompt',
      })
    })
  })
})
