import { cyoaGame, cyoaNarrative } from '../__mocks__'
import {
  parseNarrativeId,
  determineRequiredNarratives,
  isInitialNarrative,
  isGameLost,
  isGameWon,
} from '@utils/narratives'

describe('narratives', () => {
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

  describe('isGameLost', () => {
    it('returns true when ascending game reaches loss threshold', () => {
      const ascendingGame = {
        ...cyoaGame,
        startingResourceValue: 10,
        lossResourceThreshold: 100,
      }

      const result = isGameLost(ascendingGame, 100)
      expect(result).toBe(true)
    })

    it('returns false when ascending game is below loss threshold', () => {
      const ascendingGame = {
        ...cyoaGame,
        startingResourceValue: 10,
        lossResourceThreshold: 100,
      }

      const result = isGameLost(ascendingGame, 50)
      expect(result).toBe(false)
    })

    it('returns true when descending game reaches loss threshold', () => {
      const descendingGame = {
        ...cyoaGame,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      }

      const result = isGameLost(descendingGame, 0)
      expect(result).toBe(true)
    })

    it('returns false when descending game is above loss threshold', () => {
      const descendingGame = {
        ...cyoaGame,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      }

      const result = isGameLost(descendingGame, 50)
      expect(result).toBe(false)
    })
  })

  describe('isGameWon', () => {
    it('returns true when choice point index exceeds available choice points', () => {
      const gameWithOneChoice = {
        ...cyoaGame,
        choicePoints: [cyoaGame.choicePoints[0]],
      }

      const result = isGameWon(gameWithOneChoice, 1)
      expect(result).toBe(true)
    })

    it('returns false when choice point index is within available choice points', () => {
      const gameWithTwoChoices = {
        ...cyoaGame,
        choicePoints: [cyoaGame.choicePoints[0], cyoaGame.choicePoints[0]],
      }

      const result = isGameWon(gameWithTwoChoices, 1)
      expect(result).toBe(false)
    })
  })
})
