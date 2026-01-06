import { cyoaGame, cyoaNarrative, gameId, narrativeGenerationData } from '../__mocks__'
import {
  InitialNarrativeStrategy,
  ContinuationNarrativeStrategy,
  selectGenerationStrategy,
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
          lastChoiceMade: cyoaNarrative.options[0].name,
          currentInventory: cyoaNarrative.inventory,
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
})
