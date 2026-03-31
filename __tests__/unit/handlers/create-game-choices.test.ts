import { cyoaGame, gameId } from '../__mocks__'
import createGameChoicesEvent from '@events/create-game-choices.json'
import { createGameChoicesHandler } from '@handlers/create-game-choices'
import * as createGameChoicesService from '@services/create-game-choices'
import * as dynamodb from '@services/dynamodb'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/create-game-choices')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging', () => {
  const actual = jest.requireActual('@utils/logging')
  return {
    ...actual,
    xrayCapture: jest.fn((x) => x),
  }
})

describe('create-game-choices', () => {
  describe('createGameChoicesHandler', () => {
    const mockNow = 1640995200000

    beforeAll(() => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockResolvedValue({ game: cyoaGame, gameId })
      jest.mocked(dynamodb).setChoicesGenerationStarted.mockResolvedValue(mockNow)
      jest.mocked(dynamodb).resetChoicesGenerationStarted.mockResolvedValue(mockNow)
      mockLambdaSend.mockResolvedValue({})
    })

    it('should call resetChoicesGenerationStarted when generationStartedAt is present', async () => {
      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(dynamodb.resetChoicesGenerationStarted).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
        12345,
      )
      expect(dynamodb.setChoicesGenerationStarted).not.toHaveBeenCalled()
    })

    it('should call setChoicesGenerationStarted when generationStartedAt is absent', async () => {
      await createGameChoicesHandler(createGameChoicesEvent)

      expect(dynamodb.setChoicesGenerationStarted).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
      )
      expect(dynamodb.resetChoicesGenerationStarted).not.toHaveBeenCalled()
    })

    it('should bail silently when resetChoicesGenerationStarted returns false', async () => {
      jest.mocked(dynamodb).resetChoicesGenerationStarted.mockResolvedValueOnce(false)

      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(createGameChoicesService.createGameChoices).not.toHaveBeenCalled()
    })

    it('should invoke createGameChoices once on success', async () => {
      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(createGameChoicesService.createGameChoices).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
      )
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should self-invoke with attempt+1 and new timestamp on failure', async () => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockRejectedValueOnce(new Error('Failed'))

      await createGameChoicesHandler({
        ...createGameChoicesEvent,
        attempt: 1,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-choices-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId: createGameChoicesEvent.gameId,
            attempt: 2,
            generationStartedAt: mockNow,
          }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockRejectedValueOnce(new Error('Persistent failure'))

      await createGameChoicesHandler({
        ...createGameChoicesEvent,
        attempt: 3,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
