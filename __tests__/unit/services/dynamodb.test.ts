import {
  cyoaGame,
  cyoaNarrative,
  gameChoicesGenerationData,
  gameId,
  narrativeGenerationData,
  narrativeId,
  prompt,
  promptConfig,
  promptId,
} from '../__mocks__'
import {
  getGameById,
  getGameGenerationData,
  getGames,
  getNarrativeById,
  getNarrativesByIds,
  getPromptById,
  resetChoicesGenerationStarted,
  setChoicesGenerationStarted,
  setGameById,
  setGameGenerationData,
  setNarrativeById,
  setNarrativeGenerationData,
} from '@services/dynamodb'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDB: jest.fn(() => ({
    send: (...args: any[]) => mockSend(...args),
  })),
  BatchGetItemCommand: jest.fn().mockImplementation((x) => x),
  GetItemCommand: jest.fn().mockImplementation((x) => x),
  PutItemCommand: jest.fn().mockImplementation((x) => x),
  QueryCommand: jest.fn().mockImplementation((x) => x),
  ScanCommand: jest.fn().mockImplementation((x) => x),
  UpdateItemCommand: jest.fn().mockImplementation((x) => x),
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
        Items: [{ Data: { S: JSON.stringify(cyoaGame) } }],
      })

      const result = await getGameById(gameId)

      expect(mockSend).toHaveBeenCalledWith({
        ExpressionAttributeValues: { ':gameId': { S: gameId } },
        KeyConditionExpression: 'GameId = :gameId',
        Limit: 1,
        ScanIndexForward: false,
        TableName: 'games-table',
      })
      expect(result).toEqual(cyoaGame)
    })
  })

  describe('getGames', () => {
    it('should return array of games sorted by CreatedAt descending', async () => {
      const olderTimestamp = mockNow - 1000
      const newerTimestamp = mockNow

      mockSend.mockResolvedValueOnce({
        Items: [
          {
            Data: { S: JSON.stringify(cyoaGame) },
            GameId: { S: 'older-game' },
            CreatedAt: { N: `${olderTimestamp}` },
          },
          {
            Data: { S: JSON.stringify(cyoaGame) },
            GameId: { S: 'newer-game' },
            CreatedAt: { N: `${newerTimestamp}` },
          },
        ],
      })

      const result = await getGames()

      expect(mockSend).toHaveBeenCalledWith({
        TableName: 'games-table',
      })
      expect(result).toEqual({
        games: [
          { game: cyoaGame, gameId: 'newer-game' },
          { game: cyoaGame, gameId: 'older-game' },
        ],
        pendingGames: [],
      })
    })

    it('should return empty arrays when no items exist', async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await getGames()

      expect(result).toEqual({ games: [], pendingGames: [] })
    })

    it('should filter out generation-only records and return their IDs as pending', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            Data: { S: JSON.stringify(cyoaGame) },
            GameId: { S: 'complete-game' },
            CreatedAt: { N: `${mockNow}` },
          },
          {
            GenerationData: { S: JSON.stringify(gameChoicesGenerationData) },
            GameId: { S: 'pending-game' },
            CreatedAt: { N: `${mockNow - 1000}` },
          },
        ],
      })

      const result = await getGames()

      expect(result).toEqual({
        games: [{ game: cyoaGame, gameId: 'complete-game' }],
        pendingGames: [{ gameId: 'pending-game', generationData: gameChoicesGenerationData }],
      })
    })
  })

  describe('setGameById', () => {
    it('should call DynamoDB with the correct arguments', async () => {
      await setGameById(gameId, cyoaGame)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          CreatedAt: {
            N: `${mockNow}`,
          },
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

  describe('setGameGenerationData', () => {
    it('should call DynamoDB with the correct arguments', async () => {
      await setGameGenerationData(gameId, gameChoicesGenerationData)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          CreatedAt: {
            N: `${mockNow}`,
          },
          GenerationData: {
            S: JSON.stringify(gameChoicesGenerationData),
          },
          GameId: {
            S: gameId,
          },
        },
        TableName: 'games-table',
      })
    })
  })

  describe('getGameGenerationData', () => {
    it('should return generation data when it exists', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ GenerationData: { S: JSON.stringify(gameChoicesGenerationData) } }],
      })

      const result = await getGameGenerationData(gameId)

      expect(mockSend).toHaveBeenCalledWith({
        ExpressionAttributeValues: { ':gameId': { S: gameId } },
        KeyConditionExpression: 'GameId = :gameId',
        Limit: 1,
        ScanIndexForward: false,
        TableName: 'games-table',
      })
      expect(result).toEqual(gameChoicesGenerationData)
    })
  })

  describe('getNarrativeById', () => {
    it('should return generation data when GenerationData exists', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          GenerationData: { S: JSON.stringify(narrativeGenerationData) },
        },
      })

      const result = await getNarrativeById(gameId, narrativeId)

      expect(mockSend).toHaveBeenCalledWith({
        Key: {
          GameId: { S: gameId },
          NarrativeId: { S: narrativeId },
        },
        TableName: 'narratives-table',
      })
      expect(result).toEqual({
        generationData: narrativeGenerationData,
      })
    })

    it('should return narrative data when Data exists and GenerationData does not', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          Data: { S: JSON.stringify(cyoaNarrative) },
        },
      })

      const result = await getNarrativeById(gameId, narrativeId)

      expect(result).toEqual({
        narrative: cyoaNarrative,
      })
    })

    it('should throw error when narrative not found', async () => {
      mockSend.mockResolvedValueOnce({})

      await expect(getNarrativeById(gameId, narrativeId)).rejects.toThrow()
    })
  })

  describe('setNarrativeById', () => {
    it('should call DynamoDB with the correct arguments', async () => {
      await setNarrativeById(gameId, narrativeId, cyoaNarrative)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          Data: {
            S: JSON.stringify(cyoaNarrative),
          },
          GameId: {
            S: gameId,
          },
          NarrativeId: {
            S: narrativeId,
          },
        },
        TableName: 'narratives-table',
      })
    })
  })

  describe('setNarrativeGenerationData', () => {
    it('should call DynamoDB with the correct arguments', async () => {
      await setNarrativeGenerationData(gameId, narrativeId, narrativeGenerationData)

      expect(mockSend).toHaveBeenCalledWith({
        Item: {
          GenerationData: {
            S: JSON.stringify(narrativeGenerationData),
          },
          GameId: {
            S: gameId,
          },
          NarrativeId: {
            S: narrativeId,
          },
        },
        TableName: 'narratives-table',
      })
    })
  })

  describe('getNarrativesByIds', () => {
    it('should return empty array when no narrative IDs provided', async () => {
      const result = await getNarrativesByIds(gameId, [])

      expect(result).toEqual([])
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should return narratives for multiple IDs using BatchGetItemCommand', async () => {
      const narrativeIds = ['narrative-0', 'narrative-1']

      mockSend.mockResolvedValueOnce({
        Responses: {
          'narratives-table': [
            {
              GameId: { S: gameId },
              NarrativeId: { S: 'narrative-0' },
              Data: { S: JSON.stringify(cyoaNarrative) },
            },
            {
              GameId: { S: gameId },
              NarrativeId: { S: 'narrative-1' },
              GenerationData: { S: JSON.stringify(narrativeGenerationData) },
            },
          ],
        },
      })

      const result = await getNarrativesByIds(gameId, narrativeIds)

      expect(mockSend).toHaveBeenCalledWith({
        RequestItems: {
          'narratives-table': {
            Keys: [
              { GameId: { S: gameId }, NarrativeId: { S: 'narrative-0' } },
              { GameId: { S: gameId }, NarrativeId: { S: 'narrative-1' } },
            ],
          },
        },
      })
      expect(result).toEqual([
        { narrativeId: 'narrative-0', narrative: cyoaNarrative, generationData: undefined },
        {
          narrativeId: 'narrative-1',
          narrative: undefined,
          generationData: narrativeGenerationData,
        },
      ])
    })

    it('should handle missing narratives by returning empty response', async () => {
      const narrativeIds = ['missing-1', 'missing-2']

      mockSend.mockResolvedValueOnce({
        Responses: {
          'narratives-table': [], // No items found
        },
      })

      const result = await getNarrativesByIds(gameId, narrativeIds)

      expect(result).toEqual([])
    })

    it('should return items in DynamoDB response order', async () => {
      const narrativeIds = ['narrative-0', 'narrative-1', 'narrative-2']
      mockSend.mockResolvedValueOnce({
        Responses: {
          'narratives-table': [
            {
              GameId: { S: gameId },
              NarrativeId: { S: 'narrative-0' },
              Data: { S: JSON.stringify({ ...cyoaNarrative, narrative: 'Narrative 0' }) },
            },
            {
              GameId: { S: gameId },
              NarrativeId: { S: 'narrative-1' },
              Data: { S: JSON.stringify({ ...cyoaNarrative, narrative: 'Narrative 1' }) },
            },
          ],
        },
      })

      const result = await getNarrativesByIds(gameId, narrativeIds)

      expect(result).toEqual([
        {
          narrativeId: 'narrative-0',
          narrative: { ...cyoaNarrative, narrative: 'Narrative 0' },
          generationData: undefined,
        },
        {
          narrativeId: 'narrative-1',
          narrative: { ...cyoaNarrative, narrative: 'Narrative 1' },
          generationData: undefined,
        },
      ])
    })
  })

  describe('setChoicesGenerationStarted', () => {
    it('should write GenerationStarted and return the timestamp', async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await setChoicesGenerationStarted(gameId)

      expect(mockSend).toHaveBeenCalledWith({
        Key: { GameId: { S: gameId } },
        UpdateExpression: 'SET GenerationStarted = :now',
        ExpressionAttributeValues: { ':now': { N: `${mockNow}` } },
        TableName: 'games-table',
      })
      expect(result).toBe(mockNow)
    })
  })

  describe('resetChoicesGenerationStarted', () => {
    it('should conditionally update GenerationStarted and return new timestamp', async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await resetChoicesGenerationStarted(gameId, 12345)

      expect(mockSend).toHaveBeenCalledWith({
        Key: { GameId: { S: gameId } },
        UpdateExpression: 'SET GenerationStarted = :now',
        ConditionExpression: 'GenerationStarted = :expected',
        ExpressionAttributeValues: {
          ':now': { N: `${mockNow}` },
          ':expected': { N: '12345' },
        },
        TableName: 'games-table',
      })
      expect(result).toBe(mockNow)
    })

    it('should return false when condition check fails', async () => {
      const error = new Error('Condition failed')
      ;(error as any).name = 'ConditionalCheckFailedException'
      mockSend.mockRejectedValueOnce(error)

      const result = await resetChoicesGenerationStarted(gameId, 12345)

      expect(result).toBe(false)
    })

    it('should rethrow unexpected errors', async () => {
      const error = new Error('Network error')
      mockSend.mockRejectedValueOnce(error)

      await expect(resetChoicesGenerationStarted(gameId, 12345)).rejects.toThrow('Network error')
    })
  })
})
