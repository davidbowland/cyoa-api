import { cyoaGame, gameId } from '../__mocks__'
import { createGameHandler } from '@handlers/create-game'
import * as createGames from '@services/create-games'

jest.mock('@services/create-games')
jest.mock('@utils/logging')

describe('create-game', () => {
  describe('createGameHandler', () => {
    it('should create a game successfully', async () => {
      jest.mocked(createGames).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledWith()
    })

    it('should retry on game creation failure and eventually succeed', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Creation failed'))
      jest.mocked(createGames).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledTimes(2)
    })

    it('should keep retrying until game creation succeeds', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('First failure'))
      jest.mocked(createGames).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledTimes(2)
    })

    it('should retry 2 times before giving up', async () => {
      jest.mocked(createGames).createGame.mockRejectedValue(new Error('Persistent failure'))

      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledTimes(2)
    })
  })
})
