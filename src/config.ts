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

export const promptIdCoverImage = process.env.PROMPT_ID_COVER_IMAGE as string
export const promptIdCreateChoices = process.env.PROMPT_ID_CREATE_CHOICES as string
export const promptIdCreateGame = process.env.PROMPT_ID_CREATE_GAME as string
export const promptIdCreateNarrative = process.env.PROMPT_ID_CREATE_NARRATIVE as string
export const promptIdInventoryImage = process.env.PROMPT_ID_INVENTORY_IMAGE as string
export const promptIdLoseGame = process.env.PROMPT_ID_LOSE_GAME as string
export const promptIdNarrativeImage = process.env.PROMPT_ID_NARRATIVE_IMAGE as string
export const promptIdResourceImage = process.env.PROMPT_ID_RESOURCE_IMAGE as string
export const promptIdWinGame = process.env.PROMPT_ID_WIN_GAME as string

// Games

export const inspirationAdjectivesCount = parseInt(
  process.env.INSPIRATION_ADJECTIVES_COUNT as string,
  10,
)
export const inspirationNounsCount = parseInt(process.env.INSPIRATION_NOUNS_COUNT as string, 10)
export const inspirationVerbsCount = parseInt(process.env.INSPIRATION_VERBS_COUNT as string, 10)
export const initialNarrativeId = 'start'
export const resourceToAddPercentMax =
  parseInt(process.env.RESOURCE_TO_ADD_PERCENT_MAX as string, 10) / 100
export const resourceToAddPercentMin =
  parseInt(process.env.RESOURCE_TO_ADD_PERCENT_MIN as string, 10) / 100

// Logging

export const debugLogging = (process.env.DEBUG_LOGGING as string) === 'true'

// Bedrock

export const bedrockRegion = process.env.BEDROCK_REGION || 'us-east-1'
export const bedrockImageModelId = process.env.BEDROCK_IMAGE_MODEL_ID || 'amazon.nova-canvas-v1:0'

// S3

export const s3AssetsBucket = process.env.S3_ASSETS_BUCKET as string
export const s3AssetsDomain = process.env.S3_ASSETS_DOMAIN as string

// SQS

export const sqsMessageGroupId = process.env.SQS_MESSAGE_QUEUE_ID as string
export const sqsQueueUrl = process.env.SQS_QUEUE_URL as string
