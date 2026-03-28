import { cyoaGame, gameChoicesGenerationData, gameId, serializedGame } from '../__mocks__'
import event from '@events/get-games.json'
import { getGamesHandler } from '@handlers/get-games'
import * as createGameChoicesService from '@services/create-game-choices'
import * as dynamodb from '@services/dynamodb'

jest.mock('@services/create-game-choices')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-games', () => {
  const mockNow = 1640995200000

  describe('getGamesHandler', () => {
    beforeAll(() => {
      Date.now = jest.fn().mockReturnValue(mockNow)
      jest
        .mocked(dynamodb)
        .getGames.mockResolvedValue({ games: [{ gameId, game: cyoaGame }], pendingGames: [] })
      jest.mocked(createGameChoicesService).queueGameChoicesGeneration.mockResolvedValue(undefined)
    })

    it('should return serialized games', async () => {
      const result = await getGamesHandler(event as any)

      expect(dynamodb.getGames).toHaveBeenCalledWith()
      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 200,
          body: JSON.stringify([{ gameId, ...serializedGame }]),
        }),
      )
    })

    it('should re-queue stalled games whose generation has timed out', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce({
        games: [],
        pendingGames: [
          {
            gameId: 'stalled-game',
            generationData: {
              ...gameChoicesGenerationData,
              generationStartTime: mockNow - 900_001,
            },
          },
        ],
      })

      await getGamesHandler(event as any)

      expect(createGameChoicesService.queueGameChoicesGeneration).toHaveBeenCalledWith(
        'stalled-game',
      )
    })

    it('should not re-queue games that are still generating', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce({
        games: [],
        pendingGames: [
          {
            gameId: 'active-game',
            generationData: {
              ...gameChoicesGenerationData,
              generationStartTime: mockNow - 100_000,
            },
          },
        ],
      })

      await getGamesHandler(event as any)

      expect(createGameChoicesService.queueGameChoicesGeneration).not.toHaveBeenCalled()
    })

    it('should continue when re-queue fails', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce({
        games: [{ gameId, game: cyoaGame }],
        pendingGames: [
          {
            gameId: 'stalled-game',
            generationData: {
              ...gameChoicesGenerationData,
              generationStartTime: mockNow - 900_001,
            },
          },
        ],
      })
      jest
        .mocked(createGameChoicesService)
        .queueGameChoicesGeneration.mockRejectedValueOnce(new Error('Lambda error'))

      const result = await getGamesHandler(event as any)

      expect(result).toEqual(expect.objectContaining({ statusCode: 200 }))
    })

    it('should return 500 when getGames fails', async () => {
      jest.mocked(dynamodb).getGames.mockRejectedValueOnce(new Error('DynamoDB error'))

      const result = await getGamesHandler(event as any)

      expect(result).toEqual(expect.objectContaining({ statusCode: 500 }))
    })
  })
})
