import { APIGatewayProxyEventV2 } from 'aws-lambda'

import { gameId, serializedChoice } from '../__mocks__'
import { getChoiceByIdHandler } from '@handlers/get-choice-by-id'
import * as choices from '@services/choices'
import { ChoiceId } from '@types'
import status from '@utils/status'

jest.mock('@services/choices')
jest.mock('@utils/logging')

describe('get-choice-by-id', () => {
  const choiceId: ChoiceId = 'start-0'
  const event = { pathParameters: { gameId, choiceId } } as unknown as APIGatewayProxyEventV2

  describe('getChoiceByIdHandler', () => {
    it('returns existing choice when ready', async () => {
      jest.mocked(choices).retrieveChoiceById.mockResolvedValueOnce({
        status: 'ready',
        choice: serializedChoice,
      })

      const result: any = await getChoiceByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.OK.statusCode }))
      expect(JSON.parse(result.body)).toEqual(serializedChoice)
      expect(choices.retrieveChoiceById).toHaveBeenCalledWith(gameId, choiceId)
    })

    it('returns 202 Accepted when choice is being generated', async () => {
      jest.mocked(choices).retrieveChoiceById.mockResolvedValueOnce({
        status: 'generating',
        message: 'Narrative is being generated',
      })

      const result: any = await getChoiceByIdHandler(event)

      expect(result).toEqual(expect.objectContaining({ statusCode: status.ACCEPTED.statusCode }))
      expect(JSON.parse(result.body)).toEqual({ message: 'Narrative is being generated' })
    })

    it('returns 404 Not Found when choice not found', async () => {
      jest.mocked(choices).retrieveChoiceById.mockResolvedValueOnce({
        status: 'not_found',
        message: 'Choice not found',
      })

      const result: any = await getChoiceByIdHandler(event)

      expect(result).toEqual(status.NOT_FOUND)
    })

    it('handles errors gracefully', async () => {
      jest.mocked(choices).retrieveChoiceById.mockRejectedValueOnce(new Error('Service error'))

      const result: any = await getChoiceByIdHandler(event)

      expect(result).toEqual(
        expect.objectContaining({ statusCode: status.INTERNAL_SERVER_ERROR.statusCode }),
      )
      expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' })
    })
  })
})
