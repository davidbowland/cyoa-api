import { cyoaGame } from '../__mocks__'
import { calculateCurrentResourceValue, isGameLost, parseChoiceId } from '@utils/choices'

describe('choices', () => {
  describe('parseChoiceId', () => {
    it('parses initial choice ID', () => {
      const result = parseChoiceId('start')

      expect(result).toEqual({
        choicePointIndex: 0,
        latestOptionSelected: undefined,
        narrativeId: 'narrative-0',
        selectedOptionIndices: [],
      })
    })

    it('parses first level choice ID', () => {
      const result = parseChoiceId('start-0')

      expect(result).toEqual({
        choicePointIndex: 1,
        latestOptionSelected: 0,
        narrativeId: 'narrative-1',
        selectedOptionIndices: [0],
      })
    })

    it('parses deep choice ID', () => {
      const result = parseChoiceId('start-0-1-2')

      expect(result).toEqual({
        choicePointIndex: 3,
        latestOptionSelected: 2,
        narrativeId: 'narrative-3',
        selectedOptionIndices: [0, 1, 2],
      })
    })
  })

  describe('calculateCurrentResourceValue', () => {
    it('calculates resource value for no selections', () => {
      const result = calculateCurrentResourceValue(cyoaGame, [])

      expect(result).toBe(100)
    })

    it('calculates resource value after selecting first option', () => {
      const result = calculateCurrentResourceValue(cyoaGame, [0])

      expect(result).toBe(90)
    })

    it('calculates resource value after selecting second option', () => {
      const result = calculateCurrentResourceValue(cyoaGame, [1])

      expect(result).toBe(80)
    })
  })

  describe('isGameLost', () => {
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
  })
})
