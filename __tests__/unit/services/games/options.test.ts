import { calculateResourcesToAdd, calculateResourcesForOptions } from '@services/games/options'

describe('games/options', () => {
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0.5)
  })

  describe('calculateResourcesToAdd', () => {
    it('should calculate resources for first choice', () => {
      const result = calculateResourcesToAdd(0, 7, 0.1, 0.5)

      expect(result).toBe(0.1)
    })

    it('should calculate resources for middle choice', () => {
      const result = calculateResourcesToAdd(3, 7, 0.1, 0.5)

      expect(result).toBeCloseTo(0.271, 2)
    })

    it('should calculate resources for last choice', () => {
      const result = calculateResourcesToAdd(6, 7, 0.1, 0.5)

      expect(result).toBeCloseTo(0.443, 2)
    })
  })

  describe('calculateResourcesForOptions', () => {
    it('should calculate resources for descending game', () => {
      const options = [
        { name: 'Option 1', rank: 1, consequence: 'Result 1' },
        { name: 'Option 2', rank: 2, consequence: 'Result 2' },
      ]

      const result = calculateResourcesForOptions(options, 7, 100, 0, 0.3)

      expect(result).toEqual([
        expect.objectContaining({
          name: 'Option 1',
          rank: 1,
          resourcesToAdd: expect.any(Number),
        }),
        expect.objectContaining({
          name: 'Option 2',
          rank: 2,
          resourcesToAdd: expect.any(Number),
        }),
      ])
      expect(result[0].resourcesToAdd).toBeLessThan(0)
      expect(result[1].resourcesToAdd).toBeLessThan(0)
    })

    it('should calculate resources for ascending game', () => {
      const options = [
        { name: 'Option 1', rank: 1, consequence: 'Result 1' },
        { name: 'Option 2', rank: 2, consequence: 'Result 2' },
      ]

      const result = calculateResourcesForOptions(options, 7, 0, 100, 0.3)

      expect(result[0].resourcesToAdd).toBeGreaterThan(0)
      expect(result[1].resourcesToAdd).toBeGreaterThan(0)
    })

    it('should handle minimum range of 1', () => {
      const options = [{ name: 'Option 1', rank: 1, consequence: 'Result 1' }]

      const result = calculateResourcesForOptions(options, 100, 9, 10, 0.1)

      expect(result[0].resourcesToAdd).toBe(1)
    })
  })
})
