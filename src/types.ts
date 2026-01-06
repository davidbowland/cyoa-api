export * from 'aws-lambda'

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

export interface CyoaGameSerialized {
  title: string
  description: string
  image?: string
  resourceName: string
  initialNarrativeId: string
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
  inventory: string[]
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

export interface PromptConfig {
  anthropicVersion: string
  maxTokens: number
  model: string
  temperature: number
  topK: number
}

export interface LargePromptOptions {
  chunkSize?: number
  useSystemMessage?: boolean
  systemMessage?: string
}

export interface Prompt {
  config: PromptConfig
  contents: string
}
