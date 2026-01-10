export * from 'aws-lambda'

// Common Types

export interface StringObject {
  [key: string]: string
}

// Core Game Domain Types

export type GameId = string
export type NarrativeId = string
export type PromptId = string

export interface CyoaOption {
  name: string
  rank: number
}

export interface CyoaNarrativeOption extends CyoaOption {
  resourcesToAdd: number
}

export interface CyoaInventory {
  name: string
  image?: string
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
  resourceImage?: string
  startingResourceValue: number
  lossResourceThreshold: number
  choicePoints: CyoaChoicePoint[]
  initialNarrativeId: string
}

export interface CyoaNarrative {
  narrative: string
  recap: string
  chapterTitle: string
  image?: string
  choice: string
  options: CyoaNarrativeOption[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

export interface GameWithTimestamp {
  game: CyoaGame
  gameId: GameId
  createdAt: number
}

// Serialized Types (for API responses)

export interface CyoaGameSerialized {
  title: string
  description: string
  image?: string
  resourceName: string
  resourceImage?: string
  startingResourceValue: number
  lossResourceThreshold: number
  initialNarrativeId: string
}

export interface CyoaOptionSerialized {
  name: string
}

export interface CyoaNarrativeSerialized {
  narrative: string
  chapterTitle: string
  image?: string
  choice: string
  options: CyoaOptionSerialized[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

// Generation and Processing Types

export interface NarrativeGenerationData {
  recap: string
  currentResourceValue: number
  lastChoiceMade: string
  lastOptionSelected: string
  bestOption: string
  currentInventory: string[]
  inventoryToIntroduce: string[]
  keyInformationToIntroduce: string[]
  redHerringsToIntroduce: string[]
  inventoryOrInformationConsumed: string[]
  nextChoice: string
  options: CyoaOption[]
  generationStartTime: number
}

export interface GameTheme {
  name: string
  description: string
}

// Event Types

export interface CreateNarrativeEvent {
  gameId: GameId
  narrativeId: NarrativeId
}

export interface SQSNarrativeEvent {
  Records: Array<{
    body: string
    messageId: string
    receiptHandle: string
  }>
}

export interface NarrativeContextS3Data {
  gameId: string
  narrativeId: string
  generationData: NarrativeGenerationData
  timestamp: number
}

// Prompt Configuration Types

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

// Prompt Input/Output Types

export interface CreateGamePromptCharacter {
  name?: string
  imageDescription?: string
  voice?: string
}

export interface CreateGamePromptInventory {
  name?: string
  imageDescription?: string
}

export interface CreateGamePromptOption {
  name?: string
  rank?: number
}

export interface CreateGamePromptChoicePoint {
  inventoryToIntroduce?: string[]
  keyInformationToIntroduce?: string[]
  redHerringsToIntroduce?: string[]
  inventoryOrInformationConsumed?: string[]
  choice?: string
  options?: CreateGamePromptOption[]
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
  resourceImageDescription: string
  startingResourceValue?: number
  lossResourceThreshold?: number
  choicePoints?: CreateGamePromptChoicePoint[]
}

export interface CreateNarrativePromptOption {
  name?: string
  rank?: number
}

export interface CreateNarrativePromptOutput {
  narrative?: string
  recap?: string
  chapterTitle?: string
  imageDescription?: string
  choice?: string
  options?: CreateNarrativePromptOption[]
  inventory?: string[]
}

// Image Generation Types

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
