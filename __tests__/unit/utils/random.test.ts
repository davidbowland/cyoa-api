import { getRandomSample } from '@utils/random'

describe('getRandomSample', () => {
  const mockRandom = jest.fn()
  const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  beforeAll(() => {
    mockRandom.mockReturnValue(0)
    Math.random = mockRandom
  })

  it('should return first element when count is 1', () => {
    const result = getRandomSample([...testArray], 1)
    expect(result).toEqual([1])
  })

  it('should return correct number of elements', () => {
    const result = getRandomSample([...testArray], 3)
    expect(result).toHaveLength(3)
  })

  it('should return unique elements when withDuplicates is false', () => {
    const result = getRandomSample([1, 2, 3, 4, 5], 3, false)
    expect(result).toEqual([1, 5, 4])
  })

  it('should allow duplicates when withDuplicates is true', () => {
    const result = getRandomSample([...testArray], 3, true)
    expect(result).toEqual([1, 1, 1])
  })

  it('should respect the length parameter', () => {
    const result = getRandomSample([...testArray], 2, false, 3)
    expect(result).toEqual([1, 4])
  })

  it('should handle empty array', () => {
    const result = getRandomSample([], 1)
    expect(result).toEqual([undefined])
  })

  it('should handle requesting more elements than available without duplicates', () => {
    const result = getRandomSample([1, 2], 3, false)
    expect(result).toEqual([1, 2, 2])
  })

  it('should not mutate original array when withDuplicates is true', () => {
    const originalArray = [1, 2, 3, 4, 5]
    const arrayCopy = [...originalArray]
    getRandomSample(originalArray, 3, true)
    expect(originalArray).toEqual(arrayCopy)
  })

  it('should mutate array when withDuplicates is false', () => {
    const array = [1, 2, 3, 4, 5]
    getRandomSample(array, 2, false)
    expect(array).toEqual([5, 2, 3, 4, 5])
  })
})