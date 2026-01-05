import { cyoaGame, gameId, serializedGame } from '../__mocks__'

import { getGameByIdHandler } from '@handlers/get-game-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'
import * as serialize from '@utils/serialize'

jest.mock('@services/dynamodb')
jest.mock('@utils/serialize')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('get-game-by-id', () => {
  const event = { pathParameters: { gameId } } as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(dynamodb).getGameById.mockResolvedValue(cyoaGame)
    jest.mocked(serialize).serializeCyoaGame.mockReturnValue(serializedGame)
  })

  describe('getGameByIdHandler', () => {
    it('returns existing game from database', async () => {
      const result: any = await getGameByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.OK.statusCode }))
      expect(JSON.parse(result.body)).toEqual(serializedGame)
      expect(dynamodb.getGameById).toHaveBeenCalledWith(gameId)
      expect(serialize.serializeCyoaGame).toHaveBeenCalledWith(cyoaGame)
    })

    it('returns not found when getGameById throws error', async () => {
      jest.mocked(dynamodb).getGameById.mockRejectedValueOnce(new Error('Game not found'))

      const result = await getGameByIdHandler(event)

      expect(result).toEqual(status.NOT_FOUND)
    })
  })
})
