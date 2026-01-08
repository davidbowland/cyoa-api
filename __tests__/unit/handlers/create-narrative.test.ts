import { cyoaNarrative } from '../__mocks__'
import eventJson from '@events/create-narrative.json'
import { createNarrativeHandler } from '@handlers/create-narrative'
import * as narrativeGenerationOrchestrator from '@services/narrative-generation-orchestrator'
import { SQSNarrativeEvent } from '@types'
import * as logging from '@utils/logging'

jest.mock('@services/narrative-generation-orchestrator')
jest.mock('@utils/logging')

const sqsEventTyped = eventJson as SQSNarrativeEvent

describe('create-narrative', () => {
  describe('createNarrativeHandler', () => {
    beforeAll(() => {
      jest.mocked(narrativeGenerationOrchestrator.createNarrative).mockResolvedValue(cyoaNarrative)
    })

    it('should parse SQS message and create narrative with gameId and narrativeId', async () => {
      await createNarrativeHandler(sqsEventTyped)

      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledWith(
        'test-game-id',
        'test-narrative-id',
      )
    })

    it('should log error and continue processing when message parsing fails', async () => {
      const invalidSqsEvent = {
        Records: [
          {
            body: 'invalid-json',
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
          },
        ],
      } as SQSNarrativeEvent

      await createNarrativeHandler(invalidSqsEvent)

      expect(logging.logError).toHaveBeenCalledWith(
        'Failed to process narrative creation',
        expect.objectContaining({
          error: expect.any(Error),
          record: 'test-message-id',
        }),
      )
    })

    it('should retry narrative creation and eventually succeed', async () => {
      jest
        .mocked(narrativeGenerationOrchestrator.createNarrative)
        .mockRejectedValueOnce(new Error('First failure'))
      jest
        .mocked(narrativeGenerationOrchestrator.createNarrative)
        .mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(sqsEventTyped)

      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledTimes(2)
      expect(logging.logError).toHaveBeenCalledWith(
        'Narrative creation failed, retrying',
        expect.objectContaining({
          error: expect.any(Error),
          gameId: 'test-game-id',
          narrativeId: 'test-narrative-id',
        }),
      )
    })

    it('should retry narrative creation up to 5 times before giving up', async () => {
      const error = new Error('Persistent failure')
      jest.mocked(narrativeGenerationOrchestrator.createNarrative).mockRejectedValue(error)

      await createNarrativeHandler(sqsEventTyped)

      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledTimes(5)
      expect(logging.logError).toHaveBeenCalledWith(
        'Narrative creation failed, retrying',
        expect.objectContaining({
          error,
          gameId: 'test-game-id',
          narrativeId: 'test-narrative-id',
        }),
      )
    })

    it('should process multiple SQS records', async () => {
      const multiRecordEvent = {
        Records: [
          sqsEventTyped.Records[0],
          {
            body: '{"gameId":"game-2","narrativeId":"narrative-2"}',
            messageId: 'test-message-id-456',
            receiptHandle: 'test-receipt-handle-2',
          },
        ],
      } as SQSNarrativeEvent

      jest
        .mocked(narrativeGenerationOrchestrator.createNarrative)
        .mockResolvedValueOnce(cyoaNarrative)
      jest
        .mocked(narrativeGenerationOrchestrator.createNarrative)
        .mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(multiRecordEvent)

      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledTimes(2)
      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledWith(
        'test-game-id',
        'test-narrative-id',
      )
      expect(narrativeGenerationOrchestrator.createNarrative).toHaveBeenCalledWith(
        'game-2',
        'narrative-2',
      )
    })
  })
})
