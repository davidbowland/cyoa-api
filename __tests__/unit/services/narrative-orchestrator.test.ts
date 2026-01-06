import { cyoaGame, cyoaNarrative, gameId, narrativeGenerationData, narrativeId } from '../__mocks__'
import * as dynamodb from '@services/dynamodb'
import { ensureNarrativeExists } from '@services/narrative-orchestrator'
import * as narratives from '@services/narratives'

jest.mock('@services/dynamodb')
jest.mock('@services/narratives')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('narrative-orchestrator', () => {
  beforeAll(() => {
    jest.mocked(dynamodb).getNarrativeById.mockResolvedValue({ narrative: undefined })
    jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValue([])
    jest.mocked(narratives).isGenerating.mockReturnValue(false)
    jest.mocked(narratives).startNarrativeGeneration.mockResolvedValue()
  })

  describe('ensureNarrativeExists', () => {
    it('returns existing narrative when available', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })

      const result = await ensureNarrativeExists(gameId, narrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'ready',
        narrative: cyoaNarrative,
      })
    })

    it('returns generating status when narrative is being generated', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        generationData: narrativeGenerationData,
      })
      jest.mocked(narratives).isGenerating.mockReturnValueOnce(true)

      const result = await ensureNarrativeExists(gameId, narrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('starts generation for initial narrative when not found', async () => {
      const initialNarrativeId = 'start'
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await ensureNarrativeExists(gameId, initialNarrativeId, cyoaGame)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
      expect(narratives.startNarrativeGeneration).toHaveBeenCalled()
    })

    it('starts generation for continuation narrative when not found', async () => {
      const continuationId = 'start-0'
      const gameWithMultipleChoices = {
        ...cyoaGame,
        choicePoints: [
          cyoaGame.choicePoints[0],
          {
            inventoryToIntroduce: ['Health Potion'],
            keyInformationToIntroduce: ['The dragon is sleeping'],
            redHerringsToIntroduce: ['Strange noises'],
            inventoryOrInformationConsumed: ['Old Map'],
            choice: 'What do you do next?',
            options: [
              { name: 'Continue forward', resourcesToAdd: 0 },
              { name: 'Turn back', resourcesToAdd: 5 },
            ],
          },
        ],
      }

      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValueOnce({}) // Current narrative not found
        .mockResolvedValueOnce({ narrative: cyoaNarrative }) // Previous narrative found
      jest.mocked(narratives).startNarrativeGeneration.mockResolvedValueOnce()

      const result = await ensureNarrativeExists(gameId, continuationId, gameWithMultipleChoices)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
      expect(narratives.startNarrativeGeneration).toHaveBeenCalled()
    })

    it('returns not_found when generation fails', async () => {
      const continuationId = 'start-0'
      const gameWithMultipleChoices = {
        ...cyoaGame,
        choicePoints: [
          cyoaGame.choicePoints[0],
          {
            inventoryToIntroduce: ['Health Potion'],
            keyInformationToIntroduce: ['The dragon is sleeping'],
            redHerringsToIntroduce: ['Strange noises'],
            inventoryOrInformationConsumed: ['Old Map'],
            choice: 'What do you do next?',
            options: [
              { name: 'Continue forward', resourcesToAdd: 0 },
              { name: 'Turn back', resourcesToAdd: 5 },
            ],
          },
        ],
      }

      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValueOnce({}) // Current narrative not found
        .mockResolvedValueOnce({ narrative: cyoaNarrative }) // Previous narrative found
      jest
        .mocked(narratives)
        .startNarrativeGeneration.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await ensureNarrativeExists(gameId, continuationId, gameWithMultipleChoices)

      expect(result).toEqual({
        status: 'not_found',
      })
    })

    it('ensures upcoming narratives are generated when returning existing narrative', async () => {
      const narrativeWithOptions = {
        ...cyoaNarrative,
        options: [
          { name: 'Option 1', resourcesToAdd: 5 },
          { name: 'Option 2', resourcesToAdd: -10 },
        ],
      }

      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: narrativeWithOptions,
      })
      jest
        .mocked(dynamodb)
        .getNarrativesByIds.mockResolvedValueOnce([
          { narrativeId: `${narrativeId}-0` },
          { narrativeId: `${narrativeId}-1` },
        ])
      jest.mocked(narratives).startNarrativeGeneration.mockResolvedValue()

      const result = await ensureNarrativeExists(gameId, narrativeId, cyoaGame)

      expect(result.status).toBe('ready')
      expect(dynamodb.getNarrativesByIds).toHaveBeenCalledWith(gameId, [
        `${narrativeId}-0`,
        `${narrativeId}-1`,
      ])
      expect(narratives.startNarrativeGeneration).toHaveBeenCalledTimes(2)
    })

    it('skips generation for upcoming narratives that already exist or are generating', async () => {
      const narrativeWithOptions = {
        ...cyoaNarrative,
        options: [{ name: 'Option 1', resourcesToAdd: 5 }],
      }

      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        narrative: narrativeWithOptions,
      })
      jest.mocked(dynamodb).getNarrativesByIds.mockResolvedValueOnce([
        { narrativeId: `${narrativeId}-0`, narrative: cyoaNarrative }, // Already exists
      ])

      const result = await ensureNarrativeExists(gameId, narrativeId, cyoaGame)

      expect(result.status).toBe('ready')
      expect(narratives.startNarrativeGeneration).not.toHaveBeenCalled()
    })
  })
})
