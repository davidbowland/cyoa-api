import { cyoaNarrative } from '../__mocks__'
import {
  parseNarrativeId,
  determineRequiredNarratives,
  isInitialNarrative,
} from '@utils/narratives'

describe('narrative-domain', () => {
  describe('parseNarrativeId', () => {
    it('parses initial narrative ID', () => {
      const result = parseNarrativeId('start')

      expect(result).toEqual({
        lastNarrativeId: '',
        optionId: NaN,
        choicePointIndex: 0,
      })
    })

    it('parses first level continuation ID', () => {
      const result = parseNarrativeId('start-0')

      expect(result).toEqual({
        lastNarrativeId: 'start',
        optionId: 0,
        choicePointIndex: 1,
      })
    })

    it('parses deep continuation ID', () => {
      const result = parseNarrativeId('start-0-1-2')

      expect(result).toEqual({
        lastNarrativeId: 'start-0-1',
        optionId: 2,
        choicePointIndex: 3,
      })
    })
  })

  describe('determineRequiredNarratives', () => {
    it('generates upcoming narrative IDs based on options', () => {
      const narrativeWithOptions = {
        ...cyoaNarrative,
        options: [
          { name: 'Option 1', resourcesToAdd: 5 },
          { name: 'Option 2', resourcesToAdd: -10 },
          { name: 'Option 3', resourcesToAdd: 0 },
        ],
      }

      const result = determineRequiredNarratives(narrativeWithOptions, 'start')

      expect(result).toEqual(['start-0', 'start-1', 'start-2'])
    })

    it('handles narrative with no options', () => {
      const narrativeWithoutOptions = {
        ...cyoaNarrative,
        options: [],
      }

      const result = determineRequiredNarratives(narrativeWithoutOptions, 'start')

      expect(result).toEqual([])
    })

    it('works with continuation narrative IDs', () => {
      const narrativeWithOptions = {
        ...cyoaNarrative,
        options: [
          { name: 'Option 1', resourcesToAdd: 5 },
          { name: 'Option 2', resourcesToAdd: -10 },
        ],
      }

      const result = determineRequiredNarratives(narrativeWithOptions, 'start-0-1')

      expect(result).toEqual(['start-0-1-0', 'start-0-1-1'])
    })
  })

  describe('isInitialNarrative', () => {
    it('returns true for initial narrative ID', () => {
      const result = isInitialNarrative('start')
      expect(result).toBe(true)
    })

    it('returns false for continuation narrative ID', () => {
      const result = isInitialNarrative('start-0')
      expect(result).toBe(false)
    })

    it('returns false for deep continuation narrative ID', () => {
      const result = isInitialNarrative('start-0-1-2')
      expect(result).toBe(false)
    })

    it('returns true for complex initial narrative ID without dashes', () => {
      const result = isInitialNarrative('complexgametitle')
      expect(result).toBe(true)
    })
  })
})
