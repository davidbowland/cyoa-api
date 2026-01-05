/* eslint sort-keys:0 */
import {
  CyoaGame,
  GameId,
  Prompt,
  PromptConfig,
  PromptId,
} from '@types'

// Games

export const gameId: GameId = 'a-friendly-adventure'

export const cyoaGame: CyoaGame = {
  title: 'Test Adventure',
  description: 'A test adventure game',
  image: 'test-image.jpg',
  outline: 'Test outline',
  characters: [{ name: 'Hero', imageDescription: 'A brave hero', voice: 'heroic' }],
  inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
  keyInformation: ['Important clue 1', 'Important clue 2'],
  redHerrings: ['False clue 1', 'False clue 2'],
  resourceName: 'Health',
  startingResourceValue: 100,
  lossResourceThreshold: 0,
  choicePoints: [
    {
      inventoryToIntroduce: ['Sword'],
      keyInformationToIntroduce: ['Important clue 1'],
      redHerringsToIntroduce: ['False clue 1'],
      inventoryOrInformationConsumed: [],
      choice: 'What do you do?',
      options: [
        { name: 'Fight', resourcesToAdd: -10 },
        { name: 'Run', resourcesToAdd: 0 }
      ]
    }
  ]
}

export const serializedGame = {
  description: 'A test adventure game',
  image: 'test-image.jpg',
  resourceName: 'Health',
  title: 'Test Adventure',
}

// Prompts

export const promptConfig: PromptConfig = {
  anthropicVersion: 'bedrock-2023-05-31',
  maxTokens: 256,
  model: 'the-best-ai:1.0',
  temperature: 0.5,
  topK: 250,
}

export const promptId: PromptId = '5253'

export const prompt: Prompt = {
  config: promptConfig,
  contents: 'You are a helpful assistant. ${data}',
}
