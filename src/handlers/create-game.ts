import { createGame } from '../services/create-games'
import { log, logError } from '../utils/logging'

export const createGameHandler = async (): Promise<void> => {
  for (let index = 0; index < 2; index++) {
    try {
      const { gameId } = await createGame()
      log('Game created successfully', { gameId })
      return
    } catch (error: unknown) {
      if (index === 0) {
        logError('Game creation failed, retrying', { error })
      } else {
        log('Game creation failed, retrying', { error })
      }
    }
  }
}
