import { cyoaGame, gameId } from '../__mocks__'
import * as dynamodb from '@services/dynamodb'
import { queueNarrativeGeneration } from '@services/narratives'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockSend(...args),
  })),
}))
jest.mock('@services/dynamodb')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('narratives', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
    jest.mocked(dynamodb).setNarrativeGenerationData.mockResolvedValue(undefined)
    mockSend.mockResolvedValue({})
  })

  describe('queueNarrativeGeneration', () => {
    it('should queue initial narrative generation', async () => {
      await queueNarrativeGeneration(gameId, cyoaGame, 0)

      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledWith(
        gameId,
        'narrative-0',
        expect.objectContaining({
          inventoryAvailable: ['Sword'],
          existingNarrative: 'You encounter a challenge',
          previousNarrative: undefined,
          previousChoice: undefined,
          previousOptions: undefined,
          nextChoice: 'You see a sleeping dragon. What do you do?',
          nextOptions: [
            { name: 'Fight', rank: 1, consequence: 'You fight bravely' },
            { name: 'Run', rank: 2, consequence: 'You flee the scene' },
          ],
          outline: 'Test outline',
          inspirationAuthor: cyoaGame.inspirationAuthor,
          generationStartTime: mockNow,
        }),
      )
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-narrative-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({ gameId, narrativeId: 'narrative-0' }),
        }),
      )
    })

    it('should queue continuation narrative generation', async () => {
      const gameWithTwoChoices = {
        ...cyoaGame,
        choicePoints: [cyoaGame.choicePoints[0], cyoaGame.choicePoints[0]],
      }

      await queueNarrativeGeneration(gameId, gameWithTwoChoices, 1)

      expect(dynamodb.setNarrativeGenerationData).toHaveBeenCalledWith(
        gameId,
        'narrative-1',
        expect.objectContaining({
          previousNarrative: 'You encounter a challenge',
          previousChoice: 'You see a sleeping dragon. What do you do?',
          previousOptions: [
            { name: 'Fight', rank: 1, consequence: 'You fight bravely' },
            { name: 'Run', rank: 2, consequence: 'You flee the scene' },
          ],
          nextChoice: 'You see a sleeping dragon. What do you do?',
          nextOptions: [
            { name: 'Fight', rank: 1, consequence: 'You fight bravely' },
            { name: 'Run', rank: 2, consequence: 'You flee the scene' },
          ],
        }),
      )
    })
  })
})
