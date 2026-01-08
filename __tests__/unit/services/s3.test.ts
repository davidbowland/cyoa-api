import { s3AssetsBucket } from '@config'
import { putS3Object } from '@services/s3'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn().mockImplementation((x) => x),
  S3Client: jest.fn(() => ({
    send: (...args) => mockSend(...args),
  })),
}))
jest.mock('@utils/logging', () => ({
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('S3', () => {
  describe('putS3Object', () => {
    it('should put object to S3 with correct parameters', async () => {
      const testKey = 'test-key'
      const testBody = 'test content'
      const testMetadata = { contentType: 'application/json' }
      const mockResponse = { ETag: 'test-etag' }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await putS3Object(testKey, testBody, testMetadata)

      expect(mockSend).toHaveBeenCalledWith({
        Body: testBody,
        Bucket: s3AssetsBucket,
        Key: testKey,
        Metadata: testMetadata,
      })
      expect(result).toBe(mockResponse)
    })

    it('should put object to S3 with empty metadata when not provided', async () => {
      const testKey = 'test-key'
      const testBody = 'test content'
      const mockResponse = { ETag: 'test-etag' }

      mockSend.mockResolvedValueOnce(mockResponse)

      await putS3Object(testKey, testBody)

      expect(mockSend).toHaveBeenCalledWith({
        Body: testBody,
        Bucket: s3AssetsBucket,
        Key: testKey,
        Metadata: {},
      })
    })

    it('should reject when promise rejects', async () => {
      const rejectReason = 'unable to put object'
      mockSend.mockRejectedValueOnce(rejectReason)

      await expect(putS3Object('test-key', 'test-body')).rejects.toEqual(rejectReason)
    })
  })
})
