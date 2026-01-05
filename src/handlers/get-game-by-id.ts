import { getGameById } from '../services/dynamodb'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, CyoaGameSerialized, GameId } from '../types'
import { log } from '../utils/logging'
import status from '../utils/status'
import { serializeCyoaGame } from '../utils/serialize'

export const getGameByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<CyoaGameSerialized>> => {
  log('Received event', { ...event, body: undefined })

  const gameId = event.pathParameters?.gameId as GameId
  try {
    const game = await getGameById(gameId)
    return { ...status.OK, body: JSON.stringify(serializeCyoaGame(game)) }
  } catch {
    return status.NOT_FOUND
  }
}
