import {
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
  PutItemOutput,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb'

import { dynamodbGamesTableName, dynamodbOptionsTableName, dynamodbPromptsTableName } from '../config'
import { CyoaGame, GameId, Prompt, PromptId } from '../types'
import { xrayCapture } from '../utils/logging'

const dynamodb = xrayCapture(new DynamoDB({ apiVersion: '2012-08-10' }))

/* Prompts */

export const getPromptById = async (promptId: PromptId): Promise<Prompt> => {
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
  }
}

/* Games */

export const getGameById = async (gameId: GameId): Promise<CyoaGame> => {
  const command = new GetItemCommand({
    Key: {
      GameId: {
        S: `${gameId}`,
      },
    },
    TableName: dynamodbGamesTableName,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Item.Data.S as string)
}

export const setGameById = async (
  gameId: GameId,
  data: CyoaGame,
): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
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
  return response.Items?.map((item: any) => ({
    game: JSON.parse(item.Data.S as string) as CyoaGame,
    gameId: item.GameId.S as GameId,
  })) || []
}

export const setOptionGenerationStarted = async (gameId: GameId): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      GameId: {
        S: `${gameId}`,
      },
      GenerationStarted: {
        N: `${Date.now()}`,
      },
    },
    TableName: dynamodbOptionsTableName,
  })
  return await dynamodb.send(command)
}
