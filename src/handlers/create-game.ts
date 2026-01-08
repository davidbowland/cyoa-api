import { ScheduledEvent } from 'aws-lambda'

import { createGame } from '../services/games'
import { log, logError } from '../utils/logging'

export const createGameHandler = async (event: ScheduledEvent): Promise<void> => {
  log('Received event', { event })

  for (let index = 0; index < 5; index++) {
    try {
      const { gameId } = await createGame()
      log('Game created successfully', { gameId })
      break
    } catch (error: unknown) {
      if (index === 0) {
        logError('Game creation failed, retrying', { error })
      } else {
        log('Game creation failed, retrying', { error })
      }
    }
  }
}
