import { cyoaGame, cyoaNarrative, gameId, narrativeGenerationData } from '../__mocks__'
import {
  InitialNarrativeStrategy,
  ContinuationNarrativeStrategy,
  selectGenerationStrategy,
  getBestOption,
} from '@services/narrative-strategies'

jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('narrative-strategies', () => {
  describe('InitialNarrativeStrategy', () => {
    describe('buildContext', () => {
      it('builds context for initial narrative', () => {
        const params = {
          gameId,
          narrativeId: 'start',
          game: cyoaGame,
        }

        const result = InitialNarrativeStrategy.buildContext(params)

        expect(result).toEqual({
          recap: 'The game is starting.',
          currentResourceValue: cyoaGame.startingResourceValue,
          lastChoiceMade: '',
          lastOptionSelected: '',
          bestOption: '',
          currentInventory: [],
        })
      })
    })

    describe('shouldGenerate', () => {
      it('returns true when no existing data', () => {
        const result = InitialNarrativeStrategy.shouldGenerate(undefined)
        expect(result).toBe(true)
      })

      it('returns false when narrative already exists', () => {
        const result = InitialNarrativeStrategy.shouldGenerate({ narrative: cyoaNarrative })
        expect(result).toBe(false)
      })

      it('returns false when currently generating', () => {
        const result = InitialNarrativeStrategy.shouldGenerate({
          generationData: { ...narrativeGenerationData, generationStartTime: Date.now() },
        })
        expect(result).toBe(false)
      })

      it('returns true when generation has timed out', () => {
        const result = InitialNarrativeStrategy.shouldGenerate({
          generationData: { ...narrativeGenerationData, generationStartTime: Date.now() - 400000 },
        })
        expect(result).toBe(true)
      })
    })
  })

  describe('ContinuationNarrativeStrategy', () => {
    describe('buildContext', () => {
      it('builds context for continuation narrative', () => {
        const params = {
          gameId,
          narrativeId: 'start-0',
          game: cyoaGame,
          lastNarrative: cyoaNarrative,
        }

        const result = ContinuationNarrativeStrategy.buildContext(params)

        expect(result).toEqual({
          recap: cyoaNarrative.recap,
          currentResourceValue:
            cyoaNarrative.currentResourceValue + cyoaNarrative.options[0].resourcesToAdd,
          lastChoiceMade: cyoaNarrative.choice,
          lastOptionSelected: cyoaNarrative.options[0].name,
          bestOption: 'Sneak past quietly',
          currentInventory: ['Sword'],
        })
      })

      it('handles missing last narrative', () => {
        const params = {
          gameId,
          narrativeId: 'start-0',
          game: cyoaGame,
        }

        const result = ContinuationNarrativeStrategy.buildContext(params)

        expect(result.recap).toBe('The game is starting.')
        expect(result.currentResourceValue).toBe(cyoaGame.startingResourceValue)
        expect(result.lastChoiceMade).toBe('')
        expect(result.lastOptionSelected).toBe('')
        expect(result.bestOption).toBe('')
        expect(result.currentInventory).toEqual([])
      })

      it('throws error when selected option does not exist', () => {
        const narrativeWithoutOption = {
          ...cyoaNarrative,
          options: [], // No options available
        }
        const params = {
          gameId,
          narrativeId: 'start-0',
          game: cyoaGame,
          lastNarrative: narrativeWithoutOption,
        }

        expect(() => ContinuationNarrativeStrategy.buildContext(params)).toThrow(
          'Selected option not found',
        )
      })
    })

    describe('shouldGenerate', () => {
      it('returns true when no existing data', () => {
        const result = ContinuationNarrativeStrategy.shouldGenerate(undefined)
        expect(result).toBe(true)
      })

      it('returns false when narrative already exists', () => {
        const result = ContinuationNarrativeStrategy.shouldGenerate({ narrative: cyoaNarrative })
        expect(result).toBe(false)
      })

      it('returns false when currently generating', () => {
        const result = ContinuationNarrativeStrategy.shouldGenerate({
          generationData: { ...narrativeGenerationData, generationStartTime: Date.now() },
        })
        expect(result).toBe(false)
      })
    })
  })

  describe('selectGenerationStrategy', () => {
    it('returns InitialNarrativeStrategy for initial narrative ID', () => {
      const result = selectGenerationStrategy('start')
      expect(result).toBe(InitialNarrativeStrategy)
    })

    it('returns ContinuationNarrativeStrategy for continuation narrative ID', () => {
      const result = selectGenerationStrategy('start-0')
      expect(result).toBe(ContinuationNarrativeStrategy)
    })

    it('returns ContinuationNarrativeStrategy for deep continuation narrative ID', () => {
      const result = selectGenerationStrategy('start-0-1-2')
      expect(result).toBe(ContinuationNarrativeStrategy)
    })
  })

  describe('getBestOption', () => {
    it('returns undefined for empty options array', () => {
      const result = getBestOption([])
      expect(result).toBeUndefined()
    })

    it('returns undefined for undefined options', () => {
      const result = getBestOption(undefined)
      expect(result).toBeUndefined()
    })

    it('returns the option with rank 1', () => {
      const options = [
        { name: 'Option 1', rank: 2, resourcesToAdd: 5 },
        { name: 'Option 2', rank: 1, resourcesToAdd: -10 },
        { name: 'Option 3', rank: 3, resourcesToAdd: 3 },
      ]
      const result = getBestOption(options)
      expect(result).toEqual({ name: 'Option 2', rank: 1, resourcesToAdd: -10 })
    })

    it('returns undefined when no option has rank 1', () => {
      const options = [
        { name: 'Option 1', rank: 2, resourcesToAdd: 5 },
        { name: 'Option 2', rank: 3, resourcesToAdd: -5 },
      ]
      const result = getBestOption(options)
      expect(result).toBeUndefined()
    })

    it('handles single option with rank 1', () => {
      const options = [{ name: 'Only Option', rank: 1, resourcesToAdd: 7 }]
      const result = getBestOption(options)
      expect(result).toEqual({ name: 'Only Option', rank: 1, resourcesToAdd: 7 })
    })
  })
})
