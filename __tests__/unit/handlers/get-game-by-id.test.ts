import { cyoaGame, gameId } from '../__mocks__'
import { getGameByIdHandler } from '@handlers/get-game-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('get-game-by-id', () => {
  const event = { pathParameters: { gameId } } as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(dynamodb).getGameById.mockResolvedValue(cyoaGame)
  })

  describe('getGameByIdHandler', () => {
    it('returns existing game from database', async () => {
      const result: any = await getGameByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.OK.statusCode }))
      expect(JSON.parse(result.body)).toEqual({
        description: 'A test adventure game',
        image: 'test-image.jpg',
        initialNarrativeId: 'start',
        lossResourceThreshold: 0,
        resourceName: 'Health',
        startingResourceValue: 100,
        title: 'Test Adventure',
      })
      expect(dynamodb.getGameById).toHaveBeenCalledWith(gameId)
    })

    it('returns not found when getGameById throws error', async () => {
      jest.mocked(dynamodb).getGameById.mockRejectedValueOnce(new Error('Game not found'))

      const result = await getGameByIdHandler(event)

      expect(result).toEqual(status.NOT_FOUND)
    })
  })
})
