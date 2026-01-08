import { getGameById } from '../services/dynamodb'
import { ensureNarrativeExists } from '../services/narrative-generation-orchestrator'
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  CyoaNarrativeSerialized,
  GameId,
  NarrativeId,
} from '../types'
import { log, logError } from '../utils/logging'
import { serializeCyoaNarrative } from '../utils/serialize'
import status from '../utils/status'

export const getNarrativeByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<
  APIGatewayProxyResultV2<CyoaNarrativeSerialized | { message: string } | { error: string }>
> => {
  log('Received event', { ...event, body: undefined })

  try {
    const gameId = event.pathParameters?.gameId as GameId
    const narrativeId = event.pathParameters?.narrativeId as NarrativeId

    const game = await getGameById(gameId)
    const result = await ensureNarrativeExists(gameId, narrativeId, game)

    switch (result.status) {
    case 'ready':
      return { ...status.OK, body: JSON.stringify(serializeCyoaNarrative(result.narrative!)) }
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
