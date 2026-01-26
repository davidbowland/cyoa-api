import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { getGames } from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import { serializeCyoaGame } from '../utils/serialize'
import status from '../utils/status'

export const getGamesHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<unknown>> => {
  log('Received event', { ...event, body: undefined })

  try {
    const games = await getGames()
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
