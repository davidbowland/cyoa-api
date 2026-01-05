export * from 'aws-lambda'
export { Operation as PatchOperation } from 'fast-json-patch'

// API

export type GameId = string

// Config

export interface GameTheme {
  name: string
  description: string
}

// Prompts

export type PromptId = string

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
