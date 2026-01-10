/* eslint sort-keys:0 */
import {
  CyoaGame,
  CyoaNarrative,
  CreateNarrativeEvent,
  GameId,
  NarrativeGenerationData,
  NarrativeId,
  TextPrompt,
  TextPromptConfig,
  PromptId,
} from '@types'

// Common

export const uuid = 'test-uuid-123'

// Games

export const gameId: GameId = 'a-friendly-adventure'

export const cyoaGame: CyoaGame = {
  title: 'Test Adventure',
  description: 'A test adventure game',
  image: 'test-image.jpg',
  outline: 'Test outline',
  characters: [{ name: 'Hero', image: 'hero-image.jpg', voice: 'heroic' }],
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
  keyInformation: ['Important clue 1', 'Important clue 2'],
  redHerrings: ['False clue 1', 'False clue 2'],
  resourceName: 'Health',
  resourceImage: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/resource.png',
  startingResourceValue: 100,
  lossResourceThreshold: 0,
  initialNarrativeId: 'start',
  choicePoints: [
    {
      inventoryToIntroduce: ['Sword'],
      keyInformationToIntroduce: ['Important clue 1'],
      redHerringsToIntroduce: ['False clue 1'],
      inventoryOrInformationConsumed: [],
      choice: 'What do you do?',
      options: [
        { name: 'Fight', resourcesToAdd: -10 },
        { name: 'Run', resourcesToAdd: 0 },
      ],
    },
  ],
}

export const serializedGame = {
  description: 'A test adventure game',
  image: 'test-image.jpg',
  resourceName: 'Health',
  title: 'Test Adventure',
  initialNarrativeId: 'start',
}

// Prompts

export const promptConfig: TextPromptConfig = {
  anthropicVersion: 'bedrock-2023-05-31',
  maxTokens: 256,
  model: 'the-best-ai:1.0',
  temperature: 0.5,
  topK: 250,
}

export const promptId: PromptId = '5253'

export const prompt: TextPrompt = {
  config: promptConfig,
  contents: 'You are a helpful assistant. ${data}',
}

// Bedrock

export const cyoaGamePromptOutput = {
  title: 'Generated Adventure',
  description: 'An AI-generated adventure game',
  titleImageDescription: 'A mystical forest scene',
  outline: 'A journey through an enchanted forest',
  characters: [
    { name: 'Wizard', imageDescription: 'An old wise wizard', voice: 'mystical' },
    { name: 'Dragon', imageDescription: 'A fierce red dragon', voice: 'menacing' },
  ],
  inventory: [
    { name: 'Magic Wand', imageDescription: 'A glowing wooden wand' },
    { name: 'Health Potion', imageDescription: 'A red healing potion' },
  ],
  keyInformation: ['The dragon guards the treasure', 'The wizard knows ancient spells'],
  redHerrings: ['There might be goblins nearby', 'The forest has hidden traps'],
  resourceName: 'Magic Energy',
  resourceImageDescription: 'A glowing magical energy crystal',
  startingResourceValue: 50,
  lossResourceThreshold: 5,
  choicePoints: [
    {
      inventoryToIntroduce: ['Magic Wand'],
      keyInformationToIntroduce: ['The wizard knows ancient spells'],
      redHerringsToIntroduce: ['There might be goblins nearby'],
      inventoryOrInformationConsumed: [],
      choice: 'You encounter the wizard. What do you do?',
      options: [
        { name: 'Ask for help', rank: 1 },
        { name: 'Challenge the wizard', rank: 2 },
      ],
    },
  ],
}

export const invokeModelCyoaGameResponse = {
  body: new TextEncoder().encode(
    JSON.stringify({
      content: [
        {
          text: JSON.stringify(cyoaGamePromptOutput),
        },
      ],
    }),
  ),
}

// Narratives

export const narrativeId: NarrativeId = 'test-narrative-id'

export const createNarrativeEvent: CreateNarrativeEvent = {
  gameId,
  narrativeId,
}

export const narrativeGenerationData: NarrativeGenerationData = {
  recap: 'Previous events recap',
  currentResourceValue: 75,
  lastChoiceMade: 'Asked for help',
  lastOptionSelected: 'Ask for help',
  bestOption: 'Ask for help',
  currentInventory: ['Sword', 'Magic Wand'],
  inventoryToIntroduce: ['Health Potion'],
  keyInformationToIntroduce: ['The dragon is sleeping'],
  redHerringsToIntroduce: ['Strange noises in the distance'],
  inventoryOrInformationConsumed: ['Old Map'],
  nextChoice: 'You see a sleeping dragon. What do you do?',
  options: [
    { name: 'Sneak past quietly', rank: 1, resourcesToAdd: 0 },
    { name: 'Wake the dragon', rank: 2, resourcesToAdd: -20 },
  ],
  generationStartTime: 1640995200000,
}

export const cyoaNarrative: CyoaNarrative = {
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  recap:
    'After asking the wizard for help, you received a magic wand and learned about the dragon.',
  chapterTitle: "The Dragon's Lair",
  image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
  choice: 'You see a sleeping dragon. What do you do?',
  options: [
    { name: 'Sneak past quietly', rank: 1, resourcesToAdd: -42 },
    { name: 'Wake the dragon', rank: 2, resourcesToAdd: -124 },
  ],
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
  currentResourceValue: 75,
}

export const createNarrativePromptOutput = {
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  recap:
    'After asking the wizard for help, you received a magic wand and learned about the dragon.',
  chapterTitle: "The Dragon's Lair",
  imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
  choice: 'You see a sleeping dragon. What do you do?',
  options: [
    { name: 'Sneak past quietly', rank: 1 },
    { name: 'Wake the dragon', rank: 2 },
  ],
  inventory: ['Sword', 'Magic Wand', 'Health Potion'],
}

export const invokeModelNarrativeResponse = {
  body: new TextEncoder().encode(
    JSON.stringify({
      content: [
        {
          text: JSON.stringify(createNarrativePromptOutput),
        },
      ],
    }),
  ),
}
