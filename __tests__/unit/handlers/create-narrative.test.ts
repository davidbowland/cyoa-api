import { createNarrativeEvent, cyoaNarrative } from '../__mocks__'
import eventJson from '@events/create-narrative.json'
import { createNarrativeHandler } from '@handlers/create-narrative'
import * as narratives from '@services/narratives'

jest.mock('@services/narratives')
jest.mock('@utils/logging')

const createNarrativeEventTyped = eventJson as typeof createNarrativeEvent

describe('create-narrative', () => {
  describe('createNarrativeHandler', () => {
    it('should create a narrative successfully', async () => {
      jest.mocked(narratives).createNarrative.mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(createNarrativeEventTyped)

      expect(narratives.createNarrative).toHaveBeenCalledWith(
        createNarrativeEventTyped.gameId,
        createNarrativeEventTyped.narrativeId,
      )
    })

    it('should retry on narrative creation failure and eventually succeed', async () => {
      jest.mocked(narratives).createNarrative.mockRejectedValueOnce(new Error('Creation failed'))
      jest.mocked(narratives).createNarrative.mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(createNarrativeEventTyped)

      expect(narratives.createNarrative).toHaveBeenCalledTimes(2)
    })

    it('should keep retrying until narrative creation succeeds', async () => {
      jest.mocked(narratives).createNarrative.mockRejectedValueOnce(new Error('First failure'))
      jest.mocked(narratives).createNarrative.mockRejectedValueOnce(new Error('Second failure'))
      jest.mocked(narratives).createNarrative.mockResolvedValueOnce(cyoaNarrative)

      await createNarrativeHandler(createNarrativeEventTyped)

      expect(narratives.createNarrative).toHaveBeenCalledTimes(3)
    })
  })
})
