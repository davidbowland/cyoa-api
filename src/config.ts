import axios from 'axios'
import axiosRetry from 'axios-retry'

// Axios

axiosRetry(axios, { retries: 3 })

// DynamoDB

export const dynamodbGamesTableName = process.env.DYNAMODB_GAMES_TABLE_NAME as string
export const dynamodbNarrativesTableName = process.env.DYNAMODB_NARRATIVES_TABLE_NAME as string
export const dynamodbPromptsTableName = process.env.DYNAMODB_PROMPTS_TABLE_NAME as string

// Lambda

export const createNarrativeFunctionName = process.env.CREATE_NARRATIVE_FUNCTION_NAME as string

// LLM

export const promptIdCreateGame = process.env.PROMPT_ID_CREATE_GAME as string
export const promptIdCreateNarrative = process.env.PROMPT_ID_CREATE_NARRATIVE as string
export const promptIdLoseGame = process.env.PROMPT_ID_LOSE_GAME as string
export const promptIdWinGame = process.env.PROMPT_ID_WIN_GAME as string

// Games

export const inspirationAdjectivesCount = parseInt(
  process.env.INSPIRATION_ADJECTIVES_COUNT as string,
  10,
)
export const inspirationNounsCount = parseInt(process.env.INSPIRATION_NOUNS_COUNT as string, 10)
export const inspirationVerbsCount = parseInt(process.env.INSPIRATION_VERBS_COUNT as string, 10)
export const initialNarrativeId = 'start'

// Logging

export const debugLogging = (process.env.DEBUG_LOGGING as string) === 'true'

// S3

export const s3AssetsBucket = process.env.S3_ASSETS_BUCKET as string

// SQS

export const sqsMessageGroupId = process.env.SQS_MESSAGE_QUEUE_ID as string
export const sqsQueueUrl = process.env.SQS_QUEUE_URL as string
