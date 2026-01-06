import { getGameById } from '../services/dynamodb'
import { ensureNarrativeExists } from '../services/narrative-orchestrator'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, GameId, NarrativeId } from '../types'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

export const getNarrativeByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<unknown>> => {
  log('Received event', { ...event, body: undefined })

  try {
    const gameId = event.pathParameters?.gameId as GameId
    const narrativeId = event.pathParameters?.narrativeId as NarrativeId

    const game = await getGameById(gameId)
    const result = await ensureNarrativeExists(gameId, narrativeId, game)

    switch (result.status) {
    case 'ready':
      return { ...status.OK, body: JSON.stringify(result.narrative) }
    case 'generating':
      return { ...status.ACCEPTED, body: JSON.stringify({ message: result.message }) }
    case 'not_found':
    default:
      return status.NOT_FOUND
    }
  } catch (error: unknown) {
    logError('Failed to get narrative', {
      error,
      gameId: event.pathParameters?.gameId,
      narrativeId: event.pathParameters?.narrativeId,
    })
    return {
      ...status.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
