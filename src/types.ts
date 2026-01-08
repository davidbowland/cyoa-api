export * from 'aws-lambda'

// Common

export interface StringObject {
  [key: string]: string
}

// S3 Types

export interface NarrativeContextS3Data {
  gameId: string
  narrativeId: string
  generationData: NarrativeGenerationData
  timestamp: number
}

// SQS Types

export interface SQSNarrativeEvent {
  Records: Array<{
    body: string
    messageId: string
    receiptHandle: string
  }>
}

// Game

export type GameId = string

export interface CyoaGame {
  title: string
  description: string
  image?: string
  outline: string
  characters: CyoaCharacter[]
  inventory: CyoaInventory[]
  keyInformation: string[]
  redHerrings: string[]
  resourceName: string
  startingResourceValue: number
  lossResourceThreshold: number
  choicePoints: CyoaChoicePoint[]
  initialNarrativeId: string
}

export interface GameWithTimestamp {
  game: CyoaGame
  gameId: GameId
  createdAt: number
}

export interface CyoaGameSerialized {
  title: string
  description: string
  image?: string
  resourceName: string
  initialNarrativeId: string
}

export interface CyoaOptionSerialized {
  name: string
}

export interface CyoaNarrativeSerialized {
  narrative: string
  choice: string
  options: CyoaOptionSerialized[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

export interface CyoaCharacter {
  name: string
  image?: string
  voice: string
}

export interface CyoaChoicePoint {
  inventoryToIntroduce: string[]
  keyInformationToIntroduce: string[]
  redHerringsToIntroduce: string[]
  inventoryOrInformationConsumed: string[]
  choice: string
  options: CyoaOption[]
}

export interface CyoaInventory {
  name: string
  image?: string
}

export interface CyoaNarrative {
  narrative: string
  recap: string
  choice: string
  options: CyoaOption[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

// Narrative

export type NarrativeId = string

export interface CreateNarrativeEvent {
  gameId: GameId
  narrativeId: NarrativeId
}

export interface NarrativeGenerationData {
  recap: string
  currentResourceValue: number
  lastChoiceMade: string
  currentInventory: string[]
  inventoryToIntroduce: string[]
  keyInformationToIntroduce: string[]
  redHerringsToIntroduce: string[]
  inventoryOrInformationConsumed: string[]
  nextChoice: string
  options: CyoaOption[]
  generationStartTime: number
}

export interface CyoaOption {
  name: string
  resourcesToAdd: number
}

// Config

export interface GameTheme {
  name: string
  description: string
}

// Prompts

export type PromptId = string

export interface CreateGamePromptCharacter {
  name?: string
  imageDescription?: string
  voice?: string
}

export interface CreateGamePromptInventory {
  name?: string
  imageDescription?: string
}

export interface CreateGamePromptChoicePoint {
  inventoryToIntroduce?: string[]
  keyInformationToIntroduce?: string[]
  redHerringsToIntroduce?: string[]
  inventoryOrInformationConsumed?: string[]
  choice?: string
  options?: CreateGamePromptOption[]
}

export interface CreateGamePromptOption {
  name?: string
  resourcesToAdd?: number
}

export interface CreateGamePromptOutput {
  title?: string
  description?: string
  titleImageDescription?: string
  outline?: string
  characters?: CreateGamePromptCharacter[]
  inventory?: CreateGamePromptInventory[]
  keyInformation?: string[]
  redHerrings?: string[]
  resourceName?: string
  startingResourceValue?: number
  lossResourceThreshold?: number
  choicePoints?: CreateGamePromptChoicePoint[]
}

export interface CreateNarrativePromptOutput {
  narrative?: string
  recap?: string
  choice?: string
  options?: CreateNarrativePromptOption[]
  inventory?: string[]
}

export interface CreateNarrativePromptOption {
  name?: string
  resourcesToAdd?: number
}

export interface TextPromptConfig {
  anthropicVersion: string
  maxTokens: number
  model: string
  temperature: number
  topK: number
}

export interface ImagePromptConfig {
  model: string
  quality: 'standard' | 'premium'
  cfgScale: number
  height: number
  width: number
  seed: number
}

export interface LargePromptOptions {
  chunkSize?: number
  useSystemMessage?: boolean
  systemMessage?: string
}

export interface TextPrompt {
  config: TextPromptConfig
  contents: string
}

export interface ImagePrompt {
  config: ImagePromptConfig
  contents: string
}

// Image Generation

export interface ImageGenerationOptions {
  quality?: 'standard' | 'premium'
  cfgScale?: number
  height?: number
  width?: number
  seed?: number
  negativeText?: string
}

export interface ImageGenerationResponse {
  imageData: Uint8Array
}
