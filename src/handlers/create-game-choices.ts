import { createGameChoices } from '../services/create-game-choices'
import { CreateGameChoicesEvent } from '../types'
import { log, logError } from '../utils/logging'

export const createGameChoicesHandler = async (event: CreateGameChoicesEvent): Promise<void> => {
  log('Received game choices event', { gameId: event.gameId })
  try {
    const { gameId } = await createGameChoices(event.gameId)
    log('Game choices created successfully', { gameId })
  } catch (error: unknown) {
    logError('Failed to create game choices', { error, gameId: event.gameId })
  }
}
