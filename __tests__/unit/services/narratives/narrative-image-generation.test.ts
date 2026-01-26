import * as imageGeneration from '@services/image-generation'
import { generateNarrativeImage } from '@services/narratives/narrative-image-generation'

jest.mock('@services/image-generation')
jest.mock('@utils/logging')

describe('narratives/narrative-image-generation', () => {
  const gameId = 'test-game'
  const narrativeId = 'test-narrative'

  beforeAll(() => {
    jest.mocked(imageGeneration).getImageGenerationData.mockResolvedValue({
      imageGenerationOptions: {
        quality: 'standard',
        cfgScale: 8,
        height: 1024,
        width: 1024,
        seed: 0,
        negativeText: 'No text, not deformed',
      },
      model: 'amazon.nova-canvas-v1:0',
    })
    jest
      .mocked(imageGeneration)
      .generateImageToS3.mockResolvedValue(
        'https://cyoa-assets.dbowland.com/images/test-game/test-narrative.png',
      )
  })

  describe('generateNarrativeImage', () => {
    it('should generate narrative image successfully', async () => {
      const imageDescription = 'A dark forest with mysterious shadows'

      const result = await generateNarrativeImage(gameId, narrativeId, imageDescription)

      expect(imageGeneration.getImageGenerationData).toHaveBeenCalledWith('narrative-image')
      expect(imageGeneration.generateImageToS3).toHaveBeenCalledWith(
        imageDescription,
        'images/test-game/test-narrative.png',
        expect.any(Object),
      )
      expect(result).toBe('https://cyoa-assets.dbowland.com/images/test-game/test-narrative.png')
    })

    it('should return undefined when image generation fails', async () => {
      jest
        .mocked(imageGeneration)
        .generateImageToS3.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await generateNarrativeImage(gameId, narrativeId, 'Test description')

      expect(result).toBeUndefined()
    })
  })
})
