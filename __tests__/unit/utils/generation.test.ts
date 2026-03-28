import { isGenerating } from '@utils/generation'

describe('generation', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
  })

  describe('isGenerating', () => {
    it('returns true when generation is in progress', () => {
      const result = isGenerating({ generationStartTime: mockNow - 60000 })

      expect(result).toBe(true)
    })

    it('returns false when generation has timed out', () => {
      const result = isGenerating({ generationStartTime: mockNow - 400000 })

      expect(result).toBe(false)
    })

    it('returns false when generation data is undefined', () => {
      const result = isGenerating(undefined)

      expect(result).toBe(false)
    })

    it('uses custom timeout when provided', () => {
      const result = isGenerating({ generationStartTime: mockNow - 60000 }, 30000)

      expect(result).toBe(false)
    })
  })
})
