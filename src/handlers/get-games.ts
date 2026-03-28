import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { gameChoicesGenerationTime } from '../config'
import { queueGameChoicesGeneration } from '../services/create-game-choices'
import { getGames } from '../services/dynamodb'
import { GameChoicesGenerationData, GameId } from '../types'
import { isGenerating } from '../utils/generation'
import { log, logError } from '../utils/logging'
import { serializeCyoaGame } from '../utils/serialize'
import status from '../utils/status'

const requeueStalledGames = async (
  pendingGames: { gameId: GameId; generationData: GameChoicesGenerationData }[],
): Promise<void> => {
  for (const { gameId, generationData } of pendingGames) {
    if (isGenerating(generationData, gameChoicesGenerationTime)) {
      log('Game choices generation in progress', { gameId })
      continue
    }

    try {
      await queueGameChoicesGeneration(gameId)
    } catch (error: unknown) {
      logError('Failed to re-queue game choices', { gameId, error })
    }
  }
}

export const getGamesHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<unknown>> => {
  log('Received event', { event })

  try {
    const { games, pendingGames } = await getGames()

    await requeueStalledGames(pendingGames)

    const gamesData = games.map(({ gameId, game }) => ({
      gameId,
      ...serializeCyoaGame(game),
    }))

    return { ...status.OK, body: JSON.stringify(gamesData) }
  } catch (error: unknown) {
    logError('Failed to get games', error)
    return status.INTERNAL_SERVER_ERROR
  }
}
