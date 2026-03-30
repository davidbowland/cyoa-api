import {
  BatchGetItemCommand,
  BatchGetItemCommandOutput,
  DynamoDB,
  GetItemCommand,
  GetItemCommandOutput,
  PutItemCommand,
  PutItemOutput,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'

import {
  dynamodbGamesTableName,
  dynamodbNarrativesTableName,
  dynamodbPromptsTableName,
} from '../config'
import {
  CyoaGame,
  CyoaGameWithTimestamp,
  CyoaNarrative,
  GameChoicesGenerationData,
  GameId,
  GetGamesResult,
  GetNarrativeResult,
  GetNarrativesResult,
  NarrativeGenerationData,
  NarrativeId,
  PromptId,
} from '../types'
import { xrayCapture } from '../utils/logging'

const dynamodb = xrayCapture(new DynamoDB({ apiVersion: '2012-08-10' }))

/* Prompts */

export const getPromptById = async <T>(promptId: PromptId): Promise<T> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: { ':promptId': { S: `${promptId}` } },
    KeyConditionExpression: 'PromptId = :promptId',
    Limit: 1,
    ScanIndexForward: false,
    TableName: dynamodbPromptsTableName,
  })
  const response = await dynamodb.send(command)
  return {
    config: JSON.parse(response.Items?.[0]?.Config?.S as string),
    contents: response.Items?.[0]?.SystemPrompt?.S as string,
  } as T
}

/* Games */

export const getGameById = async (gameId: GameId): Promise<CyoaGame> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: { ':gameId': { S: `${gameId}` } },
    KeyConditionExpression: 'GameId = :gameId',
    Limit: 1,
    ScanIndexForward: false,
    TableName: dynamodbGamesTableName,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Items[0].Data.S as string)
}

export const setGameById = async (gameId: GameId, data: CyoaGame): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      CreatedAt: {
        N: `${Date.now()}`,
      },
      Data: {
        S: JSON.stringify(data),
      },
      GameId: {
        S: `${gameId}`,
      },
    },
    TableName: dynamodbGamesTableName,
  })
  return await dynamodb.send(command)
}

export const setGameGenerationData = async (
  gameId: GameId,
  generationData: GameChoicesGenerationData,
): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      CreatedAt: {
        N: `${Date.now()}`,
      },
      GenerationData: {
        S: JSON.stringify(generationData),
      },
      GameId: {
        S: `${gameId}`,
      },
    },
    TableName: dynamodbGamesTableName,
  })
  return await dynamodb.send(command)
}

export const getGameGenerationData = async (gameId: GameId): Promise<GameChoicesGenerationData> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: { ':gameId': { S: `${gameId}` } },
    KeyConditionExpression: 'GameId = :gameId',
    Limit: 1,
    ScanIndexForward: false,
    TableName: dynamodbGamesTableName,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Items[0].GenerationData.S as string)
}

export const setChoicesGenerationStarted = async (gameId: GameId): Promise<number> => {
  const now = Date.now()
  const command = new UpdateItemCommand({
    Key: {
      GameId: { S: `${gameId}` },
    },
    UpdateExpression: 'SET GenerationStarted = :now',
    ExpressionAttributeValues: {
      ':now': { N: `${now}` },
    },
    TableName: dynamodbGamesTableName,
  })
  await dynamodb.send(command)
  return now
}

export const resetChoicesGenerationStarted = async (
  gameId: GameId,
  expectedTimestamp: number,
): Promise<number | false> => {
  const now = Date.now()
  try {
    const command = new UpdateItemCommand({
      Key: {
        GameId: { S: `${gameId}` },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${now}` },
        ':expected': { N: `${expectedTimestamp}` },
      },
      TableName: dynamodbGamesTableName,
    })
    await dynamodb.send(command)
    return now
  } catch (error: unknown) {
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return false
    }
    throw error
  }
}

export const getGames = async (): Promise<GetGamesResult> => {
  const command = new ScanCommand({
    TableName: dynamodbGamesTableName,
  })
  const response = await dynamodb.send(command)

  const completedGames: CyoaGameWithTimestamp[] =
    response.Items?.filter((item: any) => item.Data?.S).map((item: any) => ({
      game: JSON.parse(item.Data.S as string) as CyoaGame,
      gameId: item.GameId.S as GameId,
      createdAt: parseInt(item.CreatedAt.N as string, 10),
    })) || []

  const pendingGames =
    response.Items?.filter((item: any) => item.GenerationData?.S && !item.Data?.S).map(
      (item: any) => ({
        gameId: item.GameId.S as GameId,
        generationData: JSON.parse(item.GenerationData.S as string) as GameChoicesGenerationData,
      }),
    ) || []

  const games = completedGames
    .sort((a: CyoaGameWithTimestamp, b: CyoaGameWithTimestamp) => b.createdAt - a.createdAt)
    .map(({ game, gameId }: CyoaGameWithTimestamp) => ({ game, gameId }))

  return { games, pendingGames }
}

/* Narratives */

export const getNarrativeById = async (
  gameId: GameId,
  narrativeId: NarrativeId,
): Promise<GetNarrativeResult> => {
  const command = new GetItemCommand({
    Key: {
      GameId: {
        S: gameId,
      },
      NarrativeId: {
        S: narrativeId,
      },
    },
    TableName: dynamodbNarrativesTableName,
  })
  const response: GetItemCommandOutput = await dynamodb.send(command)
  if (response.Item?.GenerationData?.S) {
    return { generationData: JSON.parse(response.Item.GenerationData.S) }
  }
  return { narrative: JSON.parse(response.Item?.Data?.S as string) }
}

export const getNarrativesByIds = async (
  gameId: GameId,
  narrativeIds: NarrativeId[],
): Promise<GetNarrativesResult[]> => {
  if (narrativeIds.length === 0) {
    return []
  }

  const command = new BatchGetItemCommand({
    RequestItems: {
      [dynamodbNarrativesTableName]: {
        Keys: narrativeIds.map((id) => ({
          GameId: { S: gameId },
          NarrativeId: { S: id },
        })),
      },
    },
  })
  const response: BatchGetItemCommandOutput = await dynamodb.send(command)

  const items = response.Responses?.[dynamodbNarrativesTableName] || []
  return items.map((item) => ({
    narrativeId: item.NarrativeId?.S as string,
    generationData: item.GenerationData?.S ? JSON.parse(item.GenerationData.S) : undefined,
    narrative: item.Data?.S ? JSON.parse(item.Data.S) : undefined,
  }))
}

export const setNarrativeById = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  data: CyoaNarrative,
): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      Data: {
        S: JSON.stringify(data),
      },
      GameId: {
        S: gameId,
      },
      NarrativeId: {
        S: narrativeId,
      },
    },
    TableName: dynamodbNarrativesTableName,
  })
  return await dynamodb.send(command)
}

export const setNarrativeGenerationData = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  generationData: NarrativeGenerationData,
): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      GenerationData: {
        S: JSON.stringify(generationData),
      },
      GameId: {
        S: gameId,
      },
      NarrativeId: {
        S: narrativeId,
      },
    },
    TableName: dynamodbNarrativesTableName,
  })
  return await dynamodb.send(command)
}

export const setNarrativeGenerationStarted = async (
  gameId: GameId,
  narrativeId: NarrativeId,
): Promise<number> => {
  const now = Date.now()
  const command = new UpdateItemCommand({
    Key: {
      GameId: { S: gameId },
      NarrativeId: { S: narrativeId },
    },
    UpdateExpression: 'SET GenerationStarted = :now',
    ExpressionAttributeValues: {
      ':now': { N: `${now}` },
    },
    TableName: dynamodbNarrativesTableName,
  })
  await dynamodb.send(command)
  return now
}

export const resetNarrativeGenerationStarted = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  expectedTimestamp: number,
): Promise<number | false> => {
  const now = Date.now()
  try {
    const command = new UpdateItemCommand({
      Key: {
        GameId: { S: gameId },
        NarrativeId: { S: narrativeId },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${now}` },
        ':expected': { N: `${expectedTimestamp}` },
      },
      TableName: dynamodbNarrativesTableName,
    })
    await dynamodb.send(command)
    return now
  } catch (error: unknown) {
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return false
    }
    throw error
  }
}
