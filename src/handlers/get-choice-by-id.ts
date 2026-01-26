import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { retrieveChoiceById } from '../services/choices'
import { ChoiceId, CyoaChoiceSerialized, GameId } from '../types'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

export const getChoiceByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<
  APIGatewayProxyResultV2<CyoaChoiceSerialized | { message: string } | { error: string }>
> => {
  log('Received event', { ...event, body: undefined })

  try {
    const gameId = event.pathParameters?.gameId as GameId
    const choiceId = event.pathParameters?.choiceId as ChoiceId
    const result = await retrieveChoiceById(gameId, choiceId)

    switch (result.status) {
    case 'ready':
      return {
        ...status.OK,
        body: JSON.stringify(result.choice),
      }
    case 'generating':
      return { ...status.ACCEPTED, body: JSON.stringify({ message: result.message }) }
    case 'not_found':
    default:
      return status.NOT_FOUND
    }
  } catch (error: unknown) {
    logError('Failed to get narrative', {
      choiceId: event.pathParameters?.choiceId,
      error,
      gameId: event.pathParameters?.gameId,
    })
    return {
      ...status.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
