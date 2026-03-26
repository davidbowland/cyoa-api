import { cyoaGame, gameId } from '../__mocks__'
import createGameChoicesEvent from '@events/create-game-choices.json'
import { createGameChoicesHandler } from '@handlers/create-game-choices'
import * as createGameChoicesService from '@services/create-game-choices'

jest.mock('@services/create-game-choices')
jest.mock('@utils/logging')

describe('create-game-choices', () => {
  describe('createGameChoicesHandler', () => {
    beforeAll(() => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockResolvedValue({ game: cyoaGame, gameId })
    })

    it('should invoke createGameChoices with gameId', async () => {
      await createGameChoicesHandler(createGameChoicesEvent)

      expect(createGameChoicesService.createGameChoices).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
      )
    })

    it('should not throw when createGameChoices fails', async () => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockRejectedValueOnce(new Error('Failed'))

      await expect(createGameChoicesHandler(createGameChoicesEvent)).resolves.toBeUndefined()
    })
  })
})
