import {
  BatchGetItemCommand,
  BatchGetItemCommandOutput,
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
  PutItemOutput,
  QueryCommand,
  ScanCommand,
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
  GameId,
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

export const getGames = async (): Promise<{ gameId: GameId; game: CyoaGame }[]> => {
  const command = new ScanCommand({
    TableName: dynamodbGamesTableName,
  })
  const response = await dynamodb.send(command)

  const games: CyoaGameWithTimestamp[] =
    response.Items?.map((item: any) => ({
      game: JSON.parse(item.Data.S as string) as CyoaGame,
      gameId: item.GameId.S as GameId,
      createdAt: parseInt(item.CreatedAt.N as string, 10),
    })) || []

  return games
    .sort((a: CyoaGameWithTimestamp, b: CyoaGameWithTimestamp) => b.createdAt - a.createdAt)
    .map(({ game, gameId }: CyoaGameWithTimestamp) => ({ game, gameId }))
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
  const response = await dynamodb.send(command)
  if (response.Item.GenerationData?.S) {
    return { generationData: JSON.parse(response.Item.GenerationData.S) }
  }
  return { narrative: JSON.parse(response.Item.Data.S) }
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
