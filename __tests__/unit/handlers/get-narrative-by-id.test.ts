import { cyoaGame, cyoaNarrative, gameId, narrativeId } from '../__mocks__'
import { getNarrativeByIdHandler } from '@handlers/get-narrative-by-id'
import * as dynamodb from '@services/dynamodb'
import * as orchestrator from '@services/narrative-orchestrator'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@services/narratives')
jest.mock('@services/narrative-orchestrator')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('get-narrative-by-id', () => {
  const event = {
    pathParameters: { gameId, narrativeId },
  } as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(dynamodb).getGameById.mockResolvedValue(cyoaGame)
    jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValue({
      status: 'ready',
      narrative: cyoaNarrative,
    })
  })

  describe('getNarrativeByIdHandler', () => {
    it('returns 404 Not Found when game does not exist', async () => {
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(undefined as any)
      jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValueOnce({
        status: 'not_found',
      })

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.NOT_FOUND.statusCode }))
    })

    it('returns existing narrative when ready', async () => {
      jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValueOnce({
        status: 'ready',
        narrative: cyoaNarrative,
      })

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.OK.statusCode }))
      expect(JSON.parse(result.body)).toEqual(cyoaNarrative)
      expect(orchestrator.ensureNarrativeExists).toHaveBeenCalledWith(gameId, narrativeId, cyoaGame)
    })

    it('returns 202 Accepted when narrative is being generated', async () => {
      jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValueOnce({
        status: 'generating',
        message: 'Narrative is being generated',
      })

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.ACCEPTED.statusCode }))
      expect(JSON.parse(result.body)).toEqual({ message: 'Narrative is being generated' })
    })

    it('returns 404 Not Found when narrative not found', async () => {
      jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValueOnce({
        status: 'not_found',
      })

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.NOT_FOUND.statusCode }))
    })

    it('handles orchestrator errors gracefully', async () => {
      jest
        .mocked(orchestrator)
        .ensureNarrativeExists.mockRejectedValueOnce(new Error('Orchestrator error'))

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(
        expect.objectContaining({ statusCode: status.INTERNAL_SERVER_ERROR.statusCode }),
      )
      expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' })
    })

    it('handles database errors gracefully', async () => {
      jest.mocked(dynamodb).getGameById.mockRejectedValueOnce(new Error('Database error'))

      const result: any = await getNarrativeByIdHandler(event)

      expect(result).toEqual(
        expect.objectContaining({ statusCode: status.INTERNAL_SERVER_ERROR.statusCode }),
      )
      expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' })
    })
  })
})
