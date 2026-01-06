import { ScheduledEvent } from 'aws-lambda'

import { cyoaGame, gameId } from '../__mocks__'
import eventJson from '@events/create-game.json'
import { createGameHandler } from '@handlers/create-game'
import * as games from '@services/games'

jest.mock('@services/games')
jest.mock('@utils/logging')

const scheduledEvent = eventJson as ScheduledEvent

describe('create-game', () => {
  describe('createGameHandler', () => {
    it('should create a game successfully', async () => {
      jest.mocked(games).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler(scheduledEvent)

      expect(games.createGame).toHaveBeenCalledWith()
    })

    it('should retry on game creation failure and eventually succeed', async () => {
      jest.mocked(games).createGame.mockRejectedValueOnce(new Error('Creation failed'))
      jest.mocked(games).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler(scheduledEvent)

      expect(games.createGame).toHaveBeenCalledTimes(2)
    })

    it('should keep retrying until game creation succeeds', async () => {
      jest.mocked(games).createGame.mockRejectedValueOnce(new Error('First failure'))
      jest.mocked(games).createGame.mockRejectedValueOnce(new Error('Second failure'))
      jest.mocked(games).createGame.mockResolvedValueOnce({ game: cyoaGame, gameId })

      await createGameHandler(scheduledEvent)

      expect(games.createGame).toHaveBeenCalledTimes(3)
    })
  })
})
