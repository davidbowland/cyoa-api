// Common Types

export interface StringObject {
  [key: string]: string
}

// Core Game Domain Types

export type GameId = string
export type NarrativeId = string
export type ChoiceId = string
export type PromptId = string

export interface CyoaOption {
  name: string
  rank: number
  consequence: string
  resourcesToAdd: number
}

export interface CyoaNarrativeOption {
  name: string
  narrative: string
}

export interface CyoaInventory {
  name: string
  image?: string
}

export interface CyoaInventoryWithDescription {
  name: string
  imageDescription?: string
}

export interface CyoaCharacter {
  name: string
  image?: string
  voice: string
}

export interface CyoaChoicePoint {
  charactersToIntroduce: string[]
  keyInformationToIntroduce: string[]
  redHerringsToIntroduce: string[]
  inventoryAvailable: string[]
  choiceNarrative: string
  choice: string
  options: CyoaOption[]
  lossNarrative: string
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
  lossCondition: 'accumulate' | 'reduce'
  choicePoints: CyoaChoicePoint[]
  initialChoiceId: string
  inspirationAuthor: Author
  winNarrative: string
}

export type CyoaGameFormatted = Pick<
  CyoaGame,
  | 'title'
  | 'description'
  | 'outline'
  | 'characters'
  | 'resourceName'
  | 'startingResourceValue'
  | 'lossResourceThreshold'
> & {
  inventory: CyoaInventoryWithDescription[]
}

export interface CyoaGameWithTimestamp {
  game: CyoaGame
  gameId: GameId
  createdAt: number
}

export interface CyoaNarrative {
  narrative: string
  chapterTitle: string
  image?: string
  choice?: string
  optionNarratives: CyoaNarrativeOption[]
  options: CyoaOption[]
  inventory: CyoaInventory[]
  losingTitle: string
  losingNarrative: string
}

// Serialized Types (for API responses)

export type CyoaGameSerialized = Pick<
  CyoaGame,
  | 'title'
  | 'description'
  | 'image'
  | 'resourceName'
  | 'resourceImage'
  | 'startingResourceValue'
  | 'lossResourceThreshold'
  | 'initialChoiceId'
>

export interface CyoaChoiceSerialized {
  narrative: string
  chapterTitle: string
  image?: string
  choice?: string
  options: CyoaOption[]
  inventory: CyoaInventory[]
  currentResourceValue: number
}

// Generation and Processing Types

export interface NarrativeGenerationData {
  inventoryAvailable: string[]
  existingNarrative: string
  previousNarrative?: string
  previousChoice?: string
  previousOptions?: CyoaOption[]
  nextChoice?: string
  nextOptions?: CyoaOption[]
  outline: string
  lossNarrative: string
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
  charactersToIntroduce?: string[]
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
}

export interface CreateNarrativePromptOutput {
  chapterTitle?: string
  narrative?: string
  imageDescription?: string
  losingTitle?: string
  losingNarrative?: string
}

export interface CreateNarrativePromptOption {
  name?: string
  narrative?: string
}

export interface CreateOptionNarrativePromptOutput {
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

export interface ImageGenerationData {
  imageGenerationOptions: ImageGenerationOptions
  model: string
}

export interface ImageGenerationResponse {
  imageData: Uint8Array
}

// Service Result Types

export type ChoiceResult =
  | { status: 'ready'; choice: CyoaChoiceSerialized }
  | { status: 'generating'; message: string }
  | { status: 'not_found'; message: string }

export interface GetNarrativeResult {
  narrative?: CyoaNarrative
  generationData?: NarrativeGenerationData
}

export interface GetNarrativesResult extends GetNarrativeResult {
  narrativeId: string
}

export interface GameOutlineResults {
  game: CyoaGameFormatted
  imageDescription: string
  inspirationAuthor: Author
  resourceImageDescription: string
  storyType: GameTheme
}

export interface GenerateNarrativeContentResult {
  narrative: CyoaNarrative
  imageDescription: string
}

// Utility Types

export interface ChoiceIdParts {
  choicePointIndex: number
  latestOptionSelected: number
  narrativeId: NarrativeId
  selectedOptionIndices: number[]
}
