import { createNarrativeEvent, cyoaNarrative, narrativeGenerationData } from '../__mocks__'
import { createNarrativeHandler } from '@handlers/create-narrative'
import * as createNarratives from '@services/create-narratives'
import * as dynamodb from '@services/dynamodb'
import * as logging from '@utils/logging'

jest.mock('@services/create-narratives')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('create-narrative', () => {
  describe('createNarrativeHandler', () => {
    beforeAll(() => {
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
      jest.mocked(createNarratives).createNarrative.mockResolvedValue(cyoaNarrative)
    })

    it('should create narrative with gameId and narrativeId', async () => {
      await createNarrativeHandler(createNarrativeEvent)

      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith('a-friendly-adventure', 'narrative-0')
      expect(createNarratives.createNarrative).toHaveBeenCalledWith(
        'a-friendly-adventure',
        'narrative-0',
        narrativeGenerationData,
      )
    })

    it('should throw error when generation data not found', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ generationData: undefined })

      await expect(createNarrativeHandler(createNarrativeEvent)).rejects.toThrow(
        'No generation data found',
      )

      expect(logging.logError).toHaveBeenCalledWith(
        'Failed to create narrative',
        expect.objectContaining({
          error: expect.any(Error),
          event: createNarrativeEvent,
        }),
      )
    })

    it('should retry narrative creation and eventually succeed', async () => {
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
      jest
        .mocked(createNarratives)
        .createNarrative.mockRejectedValueOnce(new Error('First failure'))
      jest.mocked(createNarratives).createNarrative.mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(createNarrativeEvent)

      expect(createNarratives.createNarrative).toHaveBeenCalledTimes(2)
      expect(logging.logError).toHaveBeenCalledWith(
        'Narrative creation failed, retrying',
        expect.objectContaining({
          error: expect.any(Error),
          gameId: 'a-friendly-adventure',
          narrativeId: 'narrative-0',
        }),
      )
    })

    it('should retry narrative creation 2 times before giving up', async () => {
      const error = new Error('Persistent failure')
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
      jest.mocked(createNarratives).createNarrative.mockRejectedValue(error)

      await createNarrativeHandler(createNarrativeEvent)

      expect(createNarratives.createNarrative).toHaveBeenCalledTimes(2)
    })
  })
})
