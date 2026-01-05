import { cyoaGame, gameId, prompt, promptConfig, promptId } from '../__mocks__'
import {
  getGameById,
  getGames,
  getPromptById,
  setGameById,
  setOptionGenerationStarted,
} from '@services/dynamodb'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDB: jest.fn(() => ({
    send: (...args) => mockSend(...args),
  })),
  GetItemCommand: jest.fn().mockImplementation((x) => x),
  PutItemCommand: jest.fn().mockImplementation((x) => x),
  QueryCommand: jest.fn().mockImplementation((x) => x),
  ScanCommand: jest.fn().mockImplementation((x) => x),
}))
jest.mock('@utils/logging', () => ({
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('dynamodb', () => {
  const mockNow = 1640995200000

  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(mockNow)
  })
  describe('getPromptById', () => {
    beforeAll(() => {
      mockSend.mockResolvedValue({
        Items: [
          { Config: { S: JSON.stringify(promptConfig) }, SystemPrompt: { S: prompt.contents } },
        ],
      })
    })

    it('should call DynamoDB and parse the prompt', async () => {
      const result = await getPromptById(promptId)

      expect(mockSend).toHaveBeenCalledWith({
        ExpressionAttributeValues: { ':promptId': { S: `${promptId}` } },
        KeyConditionExpression: 'PromptId = :promptId',
        Limit: 1,
        ScanIndexForward: false,
        TableName: 'prompts-table',
      })
      expect(result).toEqual(prompt)
    })
  })

  describe('getGameById', () => {
    it('should return game data when game exists', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { Data: { S: JSON.stringify(cyoaGame) } },
      })

      const result = await getGameById(gameId)

      expect(mockSend).toHaveBeenCalledWith({
        Key: {
          GameId: { S: gameId },
        },
        TableName: 'games-table',
      })
      expect(result).toEqual(cyoaGame)
    })
  })

  describe('getGames', () => {
    it('should return array of games with gameId from scan', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { Data: { S: JSON.stringify(cyoaGame) }, GameId: { S: '2025-01-01' } },
          { Data: { S: JSON.stringify(cyoaGame) }, GameId: { S: '2025-01-02' } },
        ],
      })

      const result = await getGames()

      expect(mockSend).toHaveBeenCalledWith({
        TableName: 'games-table',
      })
      expect(result).toEqual([
        { game: cyoaGame, gameId: '2025-01-01' },
        { game: cyoaGame, gameId: '2025-01-02' },
      ])
    })

    it('should return empty array when no items exist', async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await getGames()

      expect(result).toEqual([])
    })
  })

  describe('setGameById', () => {
    it('should call DynamoDB with the correct arguments', async () => {
      await setGameById(gameId, cyoaGame)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          Data: {
            S: JSON.stringify(cyoaGame),
          },
          GameId: {
            S: gameId,
          },
        },
        TableName: 'games-table',
      })
    })
  })

  describe('setOptionGenerationStarted', () => {
    it('should call DynamoDB with GenerationStarted timestamp', async () => {
      await setOptionGenerationStarted(gameId)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          GameId: {
            S: gameId,
          },
          GenerationStarted: {
            N: mockNow.toString(),
          },
        },
        TableName: 'options-table',
      })
    })
  })
})
