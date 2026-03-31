import { gameId } from '../__mocks__'
import { createGameHandler } from '@handlers/create-game'
import * as createGames from '@services/create-games'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@utils/logging', () => {
  const actual = jest.requireActual('@utils/logging')
  return {
    ...actual,
    xrayCapture: jest.fn((x) => x),
  }
})
jest.mock('@services/create-games')

describe('create-game', () => {
  describe('createGameHandler', () => {
    beforeAll(() => {
      jest.mocked(createGames).createGame.mockResolvedValue({ gameId })
      mockLambdaSend.mockResolvedValue({})
    })

    it('should create a game successfully and not self-invoke', async () => {
      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledWith()
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should self-invoke with attempt 2 when attempt 1 fails', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Creation failed'))

      await createGameHandler({ attempt: 1 })

      expect(createGames.createGame).toHaveBeenCalledTimes(1)
      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({ attempt: 2 }),
        }),
      )
    })

    it('should self-invoke with incremented attempt when intermediate attempt fails', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Creation failed'))

      await createGameHandler({ attempt: 2 })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Payload: JSON.stringify({ attempt: 3 }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Persistent failure'))

      await createGameHandler({ attempt: 3 })

      expect(createGames.createGame).toHaveBeenCalledTimes(1)
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
