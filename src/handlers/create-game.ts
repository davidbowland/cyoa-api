import { ScheduledEvent } from 'aws-lambda'

import { createGame } from '../services/games'
import { log } from '../utils/logging'

export const createGameHandler = async (event: ScheduledEvent): Promise<void> => {
  log('Received event', { event })

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { game, gameId } = await createGame()
      log('Game created successfully', { game, gameId })
      break
    } catch (error: unknown) {
      log('Game creation failed, retrying', { error })
    }
  }
}
