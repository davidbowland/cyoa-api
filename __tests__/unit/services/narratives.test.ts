import { narrativeGenerationData } from '../__mocks__'
import { isGenerating } from '@services/narratives'

describe('narratives', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
  })

  describe('isGenerating', () => {
    it('returns true when generation is within timeout window', () => {
      const generationData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 60000, // 1 minute ago
      }

      const result = isGenerating(generationData)

      expect(result).toBe(true)
    })

    it('returns false when generation is outside timeout window', () => {
      const generationData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 400000, // 6.67 minutes ago (beyond 5 minute default)
      }

      const result = isGenerating(generationData)

      expect(result).toBe(false)
    })

    it('returns false when generationData is undefined', () => {
      const result = isGenerating(undefined)

      expect(result).toBe(false)
    })

    it('returns false when generationStartTime is undefined', () => {
      const generationData = {
        ...narrativeGenerationData,
        generationStartTime: undefined as any,
      }

      const result = isGenerating(generationData)

      expect(result).toBe(false)
    })

    it('respects custom timeout parameter', () => {
      const generationData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 120000, // 2 minutes ago
      }

      const resultWithShortTimeout = isGenerating(generationData, 60000) // 1 minute timeout
      const resultWithLongTimeout = isGenerating(generationData, 180000) // 3 minute timeout

      expect(resultWithShortTimeout).toBe(false)
      expect(resultWithLongTimeout).toBe(true)
    })
  })
})
