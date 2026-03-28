import { cyoaNarrative } from '../__mocks__'
import { applyLossView, getNarrativeIdByIndex } from '@utils/narratives'

describe('narratives', () => {
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

  describe('applyLossView', () => {
    it('replaces title, narrative, choice, and options with losing equivalents', () => {
      const result = applyLossView(cyoaNarrative)

      expect(result.chapterTitle).toBe('Defeat')
      expect(result.narrative).toBe('The dragon awakens and you are defeated.')
      expect(result.choice).toBeUndefined()
      expect(result.options).toEqual([])
    })

    it('preserves remaining fields', () => {
      const result = applyLossView(cyoaNarrative)

      expect(result.image).toBe(cyoaNarrative.image)
      expect(result.inventory).toEqual(cyoaNarrative.inventory)
      expect(result.optionNarratives).toEqual(cyoaNarrative.optionNarratives)
    })
  })
})
