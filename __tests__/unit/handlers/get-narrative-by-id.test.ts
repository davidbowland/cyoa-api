import { cyoaGame, cyoaNarrative, gameId, narrativeId } from '../__mocks__'
import { getNarrativeByIdHandler } from '@handlers/get-narrative-by-id'
import * as dynamodb from '@services/dynamodb'
import * as orchestrator from '@services/narrative-generation-orchestrator'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@services/narrative-generation-orchestrator')
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
      expect(JSON.parse(result.body)).toEqual({
        narrative: 'You find yourself standing before a massive sleeping dragon...',
        chapterTitle: "The Dragon's Lair",
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
        choice: 'You see a sleeping dragon. What do you do?',
        options: [{ name: 'Sneak past quietly' }, { name: 'Wake the dragon' }],
        inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
        currentResourceValue: 75,
      })
      expect(orchestrator.ensureNarrativeExists).toHaveBeenCalledWith(gameId, narrativeId, cyoaGame)
    })

    it('should not include sensitive data in serialized response', async () => {
      jest.mocked(orchestrator).ensureNarrativeExists.mockResolvedValueOnce({
        status: 'ready',
        narrative: cyoaNarrative,
      })

      const result: any = await getNarrativeByIdHandler(event)
      const responseBody = JSON.parse(result.body)

      expect(responseBody).not.toHaveProperty('recap')
      expect(responseBody.options[0]).not.toHaveProperty('resourcesToAdd')
      expect(responseBody.options[1]).not.toHaveProperty('resourcesToAdd')
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
