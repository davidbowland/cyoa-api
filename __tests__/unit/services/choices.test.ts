import { cyoaGame, cyoaNarrative, gameId, narrativeGenerationData } from '../__mocks__'
import { retrieveChoiceById } from '@services/choices'
import * as dynamodb from '@services/dynamodb'
import * as narratives from '@services/narratives'
import { ChoiceId } from '@types'

jest.mock('@services/dynamodb')
jest.mock('@services/narratives')
jest.mock('@utils/logging')

describe('choices', () => {
  const choiceId: ChoiceId = 'start-0'
  const gameWithTwoChoices = {
    ...cyoaGame,
    choicePoints: [cyoaGame.choicePoints[0], cyoaGame.choicePoints[0]],
  }
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
    jest.mocked(dynamodb).getGameById.mockResolvedValue(gameWithTwoChoices)
    jest.mocked(dynamodb).getNarrativeById.mockResolvedValue({ narrative: cyoaNarrative })
  })

  describe('retrieveChoiceById', () => {
    it('returns ending narrative when it exists', async () => {
      const endingChoiceId: ChoiceId = 'start-0-0'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })

      const result = await retrieveChoiceById(gameId, endingChoiceId)

      expect(result.status).toBe('ready')
      expect(result).toEqual({
        status: 'ready',
        choice: expect.objectContaining({
          narrative: expect.any(String),
          chapterTitle: "The Dragon's Lair",
        }),
      })
      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('returns not_found when trying to access narrative beyond ending', async () => {
      const beyondEndingChoiceId: ChoiceId = 'start-0-0-0'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, beyondEndingChoiceId)

      expect(result).toEqual({
        status: 'not_found',
        message: 'Choice not found',
      })
      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('returns not_found when option index is invalid', async () => {
      const invalidOptionChoiceId: ChoiceId = 'start-5'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, invalidOptionChoiceId)

      expect(result).toEqual({
        status: 'not_found',
        message: 'Choice not found',
      })
      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('queues generation for initial narrative when it does not exist', async () => {
      const initialChoiceId: ChoiceId = 'start'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, initialChoiceId)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative generation queued',
      })
      expect(narratives.queueNarrativeGeneration).toHaveBeenCalledWith(
        gameId,
        gameWithTwoChoices,
        0,
      )
    })

    it('returns not_found when trying to access ending narrative with invalid option', async () => {
      const invalidEndingChoiceId: ChoiceId = 'start-0-5'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, invalidEndingChoiceId)

      expect(result).toEqual({
        status: 'not_found',
        message: 'Choice not found',
      })
      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('returns not_found when choice point index is invalid', async () => {
      const invalidChoicePointId: ChoiceId = 'start-0-0-0-0'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithTwoChoices)
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, invalidChoicePointId)

      expect(result).toEqual({
        status: 'not_found',
        message: 'Choice not found',
      })
      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('returns existing narrative when ready', async () => {
      const result = await retrieveChoiceById(gameId, choiceId)

      expect(result.status).toBe('ready')
      expect(result).toEqual({
        status: 'ready',
        choice: expect.objectContaining({
          narrative: expect.any(String),
          chapterTitle: "The Dragon's Lair",
          currentResourceValue: 90,
        }),
      })
      expect(dynamodb.getGameById).toHaveBeenCalledWith(gameId)
      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith(gameId, 'narrative-1')
      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith(gameId, 'narrative-2')
    })

    it('queues next narrative generation when next narrative does not exist', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })
      jest.mocked(dynamodb).getNarrativeById.mockRejectedValueOnce(new Error('Not found'))

      await retrieveChoiceById(gameId, choiceId)

      expect(narratives.queueNarrativeGeneration).toHaveBeenCalledWith(
        gameId,
        gameWithTwoChoices,
        2,
      )
    })

    it('queues next narrative generation when next narrative generation expired', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        generationData: { ...narrativeGenerationData, generationStartTime: mockNow - 600000 },
      })

      await retrieveChoiceById(gameId, choiceId)

      expect(narratives.queueNarrativeGeneration).toHaveBeenCalledWith(
        gameId,
        gameWithTwoChoices,
        2,
      )
    })

    it('does not queue next narrative when next narrative is generating', async () => {
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })
        .mockResolvedValueOnce({
          generationData: { ...narrativeGenerationData, generationStartTime: mockNow },
        })

      await retrieveChoiceById(gameId, choiceId)

      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('does not queue next narrative when next narrative exists', async () => {
      await retrieveChoiceById(gameId, choiceId)

      expect(narratives.queueNarrativeGeneration).not.toHaveBeenCalled()
    })

    it('returns existing narrative when pre-generation of next narrative fails', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ narrative: cyoaNarrative })
      jest.mocked(dynamodb).getNarrativeById.mockRejectedValueOnce(new Error('Not found'))
      jest
        .mocked(narratives)
        .queueNarrativeGeneration.mockRejectedValueOnce(new Error('Pre-generation failed'))

      const result = await retrieveChoiceById(gameId, choiceId)

      expect(result.status).toBe('ready')
    })

    it('returns generating status when narrative is being generated', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({
        generationData: { ...narrativeGenerationData, generationStartTime: mockNow },
      })

      const result = await retrieveChoiceById(gameId, choiceId)

      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative is being generated',
      })
    })

    it('queues narrative generation when narrative does not exist', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({})

      const result = await retrieveChoiceById(gameId, choiceId)

      expect(narratives.queueNarrativeGeneration).toHaveBeenCalledWith(
        gameId,
        gameWithTwoChoices,
        1,
      )
      expect(result).toEqual({
        status: 'generating',
        message: 'Narrative generation queued',
      })
    })

    it('calculates correct resource value for multiple choices', async () => {
      const gameWithThreeChoices = {
        ...cyoaGame,
        choicePoints: [
          cyoaGame.choicePoints[0],
          cyoaGame.choicePoints[0],
          cyoaGame.choicePoints[0],
        ],
      }
      const multiChoiceId: ChoiceId = 'start-0-1'
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(gameWithThreeChoices)

      const result = await retrieveChoiceById(gameId, multiChoiceId)

      expect(result.status).toBe('ready')
      expect(result).toEqual({
        status: 'ready',
        choice: expect.objectContaining({
          currentResourceValue: 70,
        }),
      })
    })

    it('detects game loss when resource threshold is reached', async () => {
      const lossGame = {
        ...cyoaGame,
        startingResourceValue: 10,
        lossResourceThreshold: 0,
        lossCondition: 'reduce' as const,
        choicePoints: [
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -20 },
              { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -5 },
            ],
          },
          {
            ...cyoaGame.choicePoints[0],
            options: [
              { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -20 },
              { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -5 },
            ],
          },
        ],
      }
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(lossGame)

      const lossChoiceId: ChoiceId = 'start-0'
      const result = await retrieveChoiceById(gameId, lossChoiceId)

      expect(result.status).toBe('ready')
      expect(result).toEqual({
        status: 'ready',
        choice: expect.objectContaining({
          narrative: expect.stringContaining('The dragon awakens and you are defeated.'),
        }),
      })
    })
  })
})
