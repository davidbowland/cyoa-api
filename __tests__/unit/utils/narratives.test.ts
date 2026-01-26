import { narrativeGenerationData } from '../__mocks__'
import { getNarrativeIdByIndex, isGenerating } from '@utils/narratives'

describe('narratives', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
  })

  describe('getNarrativeIdByIndex', () => {
    it('returns narrative ID for index 0', () => {
      const result = getNarrativeIdByIndex(0)

      expect(result).toBe('narrative-0')
    })

    it('returns narrative ID for index 5', () => {
      const result = getNarrativeIdByIndex(5)

      expect(result).toBe('narrative-5')
    })
  })

  describe('isGenerating', () => {
    it('returns true when generation is in progress', () => {
      const generatingData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 60000,
      }

      const result = isGenerating(generatingData)

      expect(result).toBe(true)
    })

    it('returns false when generation has timed out', () => {
      const timedOutData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 400000,
      }

      const result = isGenerating(timedOutData)

      expect(result).toBe(false)
    })

    it('returns false when generation data is undefined', () => {
      const result = isGenerating(undefined)

      expect(result).toBe(false)
    })

    it('uses custom timeout when provided', () => {
      const generatingData = {
        ...narrativeGenerationData,
        generationStartTime: mockNow - 60000,
      }

      const result = isGenerating(generatingData, 30000)

      expect(result).toBe(false)
    })
  })
})
