import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { getGameById } from '../services/dynamodb'
import { CyoaGameSerialized, GameId } from '../types'
import { log } from '../utils/logging'
import { serializeCyoaGame } from '../utils/serialize'
import status from '../utils/status'

export const getGameByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<CyoaGameSerialized>> => {
  log('Received event', { event })

  const gameId = event.pathParameters?.gameId as GameId
  try {
    const game = await getGameById(gameId)
    return { ...status.OK, body: JSON.stringify(serializeCyoaGame(game)) }
  } catch {
    return status.NOT_FOUND
  }
}
