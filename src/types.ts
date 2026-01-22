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
  consequence: string
  resourcesToAdd: number
}

export interface CyoaNarrativeOption {
  name: string
  rank: number
  consequence: string
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
  keyInformationToIntroduce: string[]
  redHerringsToIntroduce: string[]
  inventoryAvailable: string[]
  choiceNarrative: string
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
  inspirationAuthor: Author
}

export interface CyoaNarrative {
  narrative: string
  recap: string
  chapterTitle: string
  image?: string
  choice?: string
  options: CyoaNarrativeOption[]
  inventory: CyoaInventory[]
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
  choice?: string
  options: CyoaOptionSerialized[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

// Generation and Processing Types

export interface NarrativeGenerationData {
  recap: string
  lastChoiceMade: string
  lastOptionSelected: string
  bestOption: string
  currentInventory: string[]
  inventoryAvailable: string[]
  existingNarrative: string
  previousChoice: string
  previousOptions: Array<{ name: string; rank: number; consequence: string }>
  nextChoice: string
  nextOptions: Array<{ name: string; rank: number; consequence: string }>
  outline: string
  inspirationAuthor: Author
  generationStartTime: number
}

export interface Author {
  name: string
  style: string
}

export interface GameTheme {
  name: string
  description: string
  inspirationAuthors: Author[]
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

export interface CreateGamePromptOutput {
  title?: string
  description?: string
  titleImageDescription?: string
  outline?: string
  characters?: CreateGamePromptCharacter[]
  inventory?: CreateGamePromptInventory[]
  resourceName?: string
  resourceImageDescription?: string
  startingResourceValue?: number
  lossResourceThreshold?: number
}

export interface CreateChoicesPromptOption {
  name?: string
  rank?: number
  consequence?: string
}

export interface CreateChoicesPromptChoicePoint {
  keyInformationToIntroduce?: string[]
  redHerringsToIntroduce?: string[]
  inventoryAvailable?: string[]
  choiceNarrative?: string
  choice?: string
  options?: CreateChoicesPromptOption[]
}

export interface CreateChoicesPromptOutput {
  keyInformation?: string[]
  redHerrings?: string[]
  choicePoints?: CreateChoicesPromptChoicePoint[]
  winNarrative?: string
  lossNarrative?: string
}

export interface CreateNarrativePromptOption {
  narrative?: string
}

export interface CreateNarrativePromptOutput {
  chapterTitle?: string
  narrative?: string
  imageDescription?: string
  options?: CreateNarrativePromptOption[]
}

export interface EndingNarrativePromptOutput {
  narrative?: string
  chapterTitle?: string
  imageDescription?: string
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
