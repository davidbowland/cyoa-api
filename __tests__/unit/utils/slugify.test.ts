import { slugify } from '@utils/slugify'

describe('slugify', () => {
  it('should convert string to lowercase', () => {
    const result = slugify('Hello World')

    expect(result).toBe('hello-world')
  })

  it('should replace spaces with hyphens', () => {
    const result = slugify('multiple spaces here')

    expect(result).toBe('multiple-spaces-here')
  })

  it('should remove special characters', () => {
    const result = slugify('Hello: World! @#$%')

    expect(result).toBe('hello-world')
  })

  it('should handle colons specifically', () => {
    const result = slugify('Chapter: The Beginning')

    expect(result).toBe('chapter-the-beginning')
  })

  it('should handle multiple consecutive spaces', () => {
    const result = slugify('hello    world')

    expect(result).toBe('hello-world')
  })

  it('should handle numbers and letters', () => {
    const result = slugify('Game 123 Title')

    expect(result).toBe('game-123-title')
  })

  it('should handle empty string', () => {
    const result = slugify('')

    expect(result).toBe('')
  })

  it('should handle string with only special characters', () => {
    const result = slugify('!@#$%^&*()')

    expect(result).toBe('')
  })

  it('should preserve existing hyphens', () => {
    const result = slugify('pre-existing-hyphens')

    expect(result).toBe('pre-existing-hyphens')
  })
})
