import { gameId, imagePrompt } from '../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import { generateImageToS3, getImageGenerationData } from '@services/image-generation'
import * as s3 from '@services/s3'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/s3')
jest.mock('@utils/logging', () => ({
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('image-generation', () => {
  const mockImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

  describe('getImageGenerationData', () => {
    beforeAll(() => {
      jest.mocked(dynamodb).getPromptById.mockResolvedValue(imagePrompt)
    })

    it('should retrieve image generation data from prompt', async () => {
      const result = await getImageGenerationData('test-prompt-id')

      expect(dynamodb.getPromptById).toHaveBeenCalledWith('test-prompt-id')
      expect(result).toEqual({
        imageGenerationOptions: {
          quality: 'standard',
          cfgScale: 8,
          height: 512,
          width: 512,
          seed: 0,
          negativeText: 'No text, not deformed, no surreal',
        },
        model: 'amazon.nova-canvas-v1:0',
      })
    })
  })

  describe('generateImageToS3', () => {
    const imageGenerationData = {
      imageGenerationOptions: {
        quality: 'standard' as const,
        cfgScale: 8,
        height: 512,
        width: 512,
        seed: 0,
        negativeText: 'No text',
      },
      model: 'amazon.nova-canvas-v1:0',
    }

    beforeAll(() => {
      jest.mocked(bedrock).generateImage.mockResolvedValue({ imageData: mockImageData })
      jest.mocked(s3).putS3Object.mockResolvedValue({} as any)
    })

    it('should generate image and upload to S3', async () => {
      const result = await generateImageToS3(
        'A test image description',
        `images/${gameId}/test.png`,
        imageGenerationData,
      )

      expect(bedrock.generateImage).toHaveBeenCalledWith(
        'A test image description',
        'amazon.nova-canvas-v1:0',
        imageGenerationData.imageGenerationOptions,
      )
      expect(s3.putS3Object).toHaveBeenCalledWith(
        `images/${gameId}/test.png`,
        Buffer.from(mockImageData),
        { 'Content-Type': 'image/png' },
      )
      expect(result).toBe(`https://cyoa-assets.dbowland.com/images/${gameId}/test.png`)
    })
  })
})
