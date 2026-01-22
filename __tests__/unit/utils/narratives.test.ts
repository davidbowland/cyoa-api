import { cyoaGame, cyoaNarrative } from '../__mocks__'
import {
  parseNarrativeId,
  determineRequiredNarratives,
  isGameLost,
  isGameWon,
  calculateCurrentResourceValue,
} from '@utils/narratives'

describe('narratives', () => {
  describe('parseNarrativeId', () => {
    it('parses initial narrative ID', () => {
      const result = parseNarrativeId('start')

      expect(result).toEqual({
        choicePointIndex: 0,
        selectedOptionIndices: [],
        storageKey: 'choice-0',
        lastNarrativeId: undefined,
      })
    })

    it('parses first level continuation ID', () => {
      const result = parseNarrativeId('start-0')

      expect(result).toEqual({
        choicePointIndex: 1,
        selectedOptionIndices: [0],
        storageKey: 'choice-1',
        lastNarrativeId: 'start',
      })
    })

    it('parses deep continuation ID', () => {
      const result = parseNarrativeId('start-0-1-2')

      expect(result).toEqual({
        choicePointIndex: 3,
        selectedOptionIndices: [0, 1, 2],
        storageKey: 'choice-3',
        lastNarrativeId: 'start-0-1',
      })
    })
  })

  describe('determineRequiredNarratives', () => {
    it('sorts options by rank when determining narrative IDs', () => {
      const narrativeWithUnsortedOptions = {
        ...cyoaNarrative,
        options: [
          { name: 'Worst option', rank: 3, resourcesToAdd: -20 },
          { name: 'Best option', rank: 1, resourcesToAdd: 10 },
          { name: 'Middle option', rank: 2, resourcesToAdd: 0 },
        ],
      }

      const result = determineRequiredNarratives(narrativeWithUnsortedOptions, 'start')

      expect(result).toEqual(['start-1', 'start-2', 'start-0'])
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
          { name: 'Option 1', rank: 2, resourcesToAdd: 5 },
          { name: 'Option 2', rank: 1, resourcesToAdd: -10 },
        ],
      }

      const result = determineRequiredNarratives(narrativeWithOptions, 'start-0-1')

      expect(result).toEqual(['start-0-1-1', 'start-0-1-0'])
    })
  })

  describe('calculateCurrentResourceValue', () => {
    it('calculates resource value for initial narrative', () => {
      const result = calculateCurrentResourceValue(cyoaGame, 'start')
      expect(result).toBe(100)
    })

    it('calculates resource value after one choice', () => {
      const result = calculateCurrentResourceValue(cyoaGame, 'start-0')
      expect(result).toBe(90) // 100 + (-10)
    })

    it('calculates resource value after multiple choices', () => {
      const gameWithMultipleChoices = {
        ...cyoaGame,
        choicePoints: [
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Option 1', rank: 1, consequence: 'Result 1', resourcesToAdd: -10 },
              { name: 'Option 2', rank: 2, consequence: 'Result 2', resourcesToAdd: -20 },
            ],
          },
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Option 3', rank: 1, consequence: 'Result 3', resourcesToAdd: 5 },
              { name: 'Option 4', rank: 2, consequence: 'Result 4', resourcesToAdd: -15 },
            ],
          },
        ],
      }

      const result = calculateCurrentResourceValue(gameWithMultipleChoices, 'start-0-1')
      expect(result).toBe(75) // 100 + (-10) + (-15)
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
