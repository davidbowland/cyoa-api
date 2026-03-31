import { createNarrativeEvent, cyoaNarrative, narrativeGenerationData } from '../__mocks__'
import { createNarrativeHandler } from '@handlers/create-narrative'
import * as createNarratives from '@services/create-narratives'
import * as dynamodb from '@services/dynamodb'
import * as logging from '@utils/logging'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/create-narratives')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging', () => {
  const actual = jest.requireActual('@utils/logging')
  return {
    ...actual,
    log: jest.fn(),
    logError: jest.fn(),
    xrayCapture: jest.fn((x) => x),
  }
})

describe('create-narrative', () => {
  describe('createNarrativeHandler', () => {
    const mockNow = 1640995200000

    beforeAll(() => {
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
      jest.mocked(createNarratives).createNarrative.mockResolvedValue(cyoaNarrative)
      jest.mocked(dynamodb).setNarrativeGenerationStarted.mockResolvedValue(mockNow)
      jest.mocked(dynamodb).resetNarrativeGenerationStarted.mockResolvedValue(mockNow)
      mockLambdaSend.mockResolvedValue({})
    })

    it('should call resetNarrativeGenerationStarted when generationStartedAt is present', async () => {
      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(dynamodb.resetNarrativeGenerationStarted).toHaveBeenCalledWith(
        createNarrativeEvent.gameId,
        createNarrativeEvent.narrativeId,
        12345,
      )
      expect(dynamodb.setNarrativeGenerationStarted).not.toHaveBeenCalled()
    })

    it('should call setNarrativeGenerationStarted when generationStartedAt is absent', async () => {
      await createNarrativeHandler(createNarrativeEvent)

      expect(dynamodb.setNarrativeGenerationStarted).toHaveBeenCalledWith(
        createNarrativeEvent.gameId,
        createNarrativeEvent.narrativeId,
      )
      expect(dynamodb.resetNarrativeGenerationStarted).not.toHaveBeenCalled()
    })

    it('should bail silently when resetNarrativeGenerationStarted returns false', async () => {
      jest.mocked(dynamodb).resetNarrativeGenerationStarted.mockResolvedValueOnce(false)

      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(createNarratives.createNarrative).not.toHaveBeenCalled()
    })

    it('should create narrative with gameId and narrativeId on success', async () => {
      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith('a-friendly-adventure', 'narrative-0')
      expect(createNarratives.createNarrative).toHaveBeenCalledWith(
        'a-friendly-adventure',
        'narrative-0',
        narrativeGenerationData,
      )
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should throw error when generation data not found', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ generationData: undefined })

      await expect(
        createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 }),
      ).rejects.toThrow('No generation data found')

      expect(logging.logError).toHaveBeenCalledWith(
        'Failed to create narrative',
        expect.objectContaining({
          error: expect.any(Error),
          event: expect.objectContaining(createNarrativeEvent),
        }),
      )
    })

    it('should self-invoke with attempt+1 and new timestamp on failure', async () => {
      jest
        .mocked(createNarratives)
        .createNarrative.mockRejectedValueOnce(new Error('First failure'))

      await createNarrativeHandler({
        ...createNarrativeEvent,
        attempt: 1,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-narrative-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId: createNarrativeEvent.gameId,
            narrativeId: createNarrativeEvent.narrativeId,
            attempt: 2,
            generationStartedAt: mockNow,
          }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest
        .mocked(createNarratives)
        .createNarrative.mockRejectedValueOnce(new Error('Persistent failure'))

      await createNarrativeHandler({
        ...createNarrativeEvent,
        attempt: 3,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
