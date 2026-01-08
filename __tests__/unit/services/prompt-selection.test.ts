import { cyoaGame } from '../__mocks__'
import { selectPromptId } from '@services/prompt-selection'

jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('prompt-selection', () => {
  describe('selectPromptId', () => {
    it('returns lose game prompt when ascending game reaches loss threshold', () => {
      const ascendingGame = {
        ...cyoaGame,
        startingResourceValue: 10,
        lossResourceThreshold: 100,
      }

      const result = selectPromptId(ascendingGame, 'start-0', 100)

      expect(result).toBe('lose-game')
    })

    it('returns lose game prompt when descending game reaches loss threshold', () => {
      const descendingGame = {
        ...cyoaGame,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      }

      const result = selectPromptId(descendingGame, 'start-0', 0)

      expect(result).toBe('lose-game')
    })

    it('returns win game prompt when no more choice points available', () => {
      const gameWithOneChoice = {
        ...cyoaGame,
        choicePoints: [cyoaGame.choicePoints[0]],
      }

      const result = selectPromptId(gameWithOneChoice, 'start-0', 50)

      expect(result).toBe('win-game')
    })

    it('returns create narrative prompt for normal gameplay', () => {
      const gameWithMultipleChoices = {
        ...cyoaGame,
        choicePoints: [cyoaGame.choicePoints[0], cyoaGame.choicePoints[0]],
      }

      const result = selectPromptId(gameWithMultipleChoices, 'start-0', 50)

      expect(result).toBe('create-narrative')
    })

    it('returns create narrative prompt for initial narrative', () => {
      const result = selectPromptId(cyoaGame, 'start', 50)

      expect(result).toBe('create-narrative')
    })

    it('prioritizes loss condition over win condition', () => {
      const gameWithOneChoice = {
        ...cyoaGame,
        startingResourceValue: 100,
        lossResourceThreshold: 0,
        choicePoints: [cyoaGame.choicePoints[0]],
      }

      const result = selectPromptId(gameWithOneChoice, 'start-0', 0)

      expect(result).toBe('lose-game')
    })
  })
})
