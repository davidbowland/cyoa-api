import { cyoaGame, gameId } from '../__mocks__'
import eventJson from '@events/get-games.json'
import { getGamesHandler } from '@handlers/get-games'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-games', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const secondGameId = 'another-great-story'

  describe('getGamesHandler', () => {
    it('should return games in the correct format', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce([
        { game: cyoaGame, gameId },
        { game: { ...cyoaGame, title: 'Another Adventure' }, gameId: secondGameId },
      ])

      const result: any = await getGamesHandler(event)
      const body = JSON.parse(result.body)

      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(body).toEqual([
        {
          description: 'A test adventure game',
          gameId,
          image: 'test-image.jpg',
          initialNarrativeId: 'start',
          lossResourceThreshold: 0,
          resourceName: 'Health',
          startingResourceValue: 100,
          title: 'Test Adventure',
        },
        {
          description: 'A test adventure game',
          gameId: secondGameId,
          image: 'test-image.jpg',
          initialNarrativeId: 'start',
          lossResourceThreshold: 0,
          resourceName: 'Health',
          startingResourceValue: 100,
          title: 'Another Adventure',
        },
      ])
      expect(dynamodb.getGames).toHaveBeenCalledWith()
    })

    it('should return empty array when no games exist', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce([])

      const result: any = await getGamesHandler(event)
      const body = JSON.parse(result.body)

      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(body).toEqual([])
    })

    it('should handle errors and return internal server error', async () => {
      jest.mocked(dynamodb).getGames.mockRejectedValueOnce(new Error('DynamoDB error'))

      const result = await getGamesHandler(event)

      expect(result).toEqual(status.INTERNAL_SERVER_ERROR)
    })
  })
})
