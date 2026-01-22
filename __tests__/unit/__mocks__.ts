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
  inspirationAuthor: {
    name: 'Agatha Christie',
    style:
      'Clever plotting with careful clue placement. Measured pacing that builds tension while maintaining clarity and logical deduction.',
  },
  choicePoints: [
    {
      keyInformationToIntroduce: ['Important clue 1'],
      redHerringsToIntroduce: ['False clue 1'],
      inventoryAvailable: ['Sword'],
      choiceNarrative: 'You encounter a challenge',
      choice: 'You see a sleeping dragon. What do you do?',
      options: [
        { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -10 },
        { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -20 },
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
  resourceName: 'Magic Energy',
  resourceImageDescription: 'A glowing magical energy crystal',
  startingResourceValue: 50,
  lossResourceThreshold: 5,
}

export const cyoaChoicesPromptOutput = {
  keyInformation: ['The dragon guards the treasure', 'The wizard knows ancient spells'],
  redHerrings: ['There might be goblins nearby', 'The forest has hidden traps'],
  choicePoints: [
    {
      keyInformationToIntroduce: ['The wizard knows ancient spells'],
      redHerringsToIntroduce: ['There might be goblins nearby'],
      inventoryAvailable: ['Magic Wand'],
      choiceNarrative: 'You meet a wise wizard in the forest',
      choice: 'You encounter the wizard. What do you do?',
      options: [
        { name: 'Ask for help', rank: 1, consequence: 'The wizard aids you' },
        { name: 'Challenge the wizard', rank: 2, consequence: 'The wizard is offended' },
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

export const narrativeId: NarrativeId = 'start'

export const createNarrativeEvent: CreateNarrativeEvent = {
  gameId,
  narrativeId,
}

export const narrativeGenerationData: NarrativeGenerationData = {
  recap: 'Previous events recap',
  lastChoiceMade: 'Asked for help',
  lastOptionSelected: 'Ask for help',
  bestOption: 'Ask for help',
  currentInventory: ['Sword', 'Magic Wand'],
  inventoryAvailable: ['Health Potion'],
  existingNarrative: 'You approach the dragon carefully',
  previousChoice: 'What do you investigate first?',
  previousOptions: [
    { name: 'Sneak past quietly', rank: 1, consequence: 'You move silently' },
    { name: 'Wake the dragon', rank: 2, consequence: 'The dragon awakens' },
  ],
  nextChoice: 'You see a sleeping dragon. What do you do?',
  nextOptions: [
    { name: 'Sneak past quietly', rank: 1, consequence: 'You move silently' },
    { name: 'Wake the dragon', rank: 2, consequence: 'The dragon awakens' },
  ],
  outline: 'Test outline',
  inspirationAuthor: {
    name: 'Agatha Christie',
    style:
      'Clever plotting with careful clue placement. Measured pacing that builds tension while maintaining clarity and logical deduction.',
  },
  generationStartTime: 1640995200000,
}

export const cyoaNarrative: CyoaNarrative = {
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  recap: 'Previous events recap',
  chapterTitle: "The Dragon's Lair",
  image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
  choice: 'You see a sleeping dragon. What do you do?',
  options: [
    { name: 'Sneak past quietly', rank: 1, consequence: 'You move silently', resourcesToAdd: -7 },
    { name: 'Wake the dragon', rank: 2, consequence: 'The dragon awakens', resourcesToAdd: -19 },
  ],
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
}

export const createNarrativePromptOutput = {
  chapterTitle: "The Dragon's Lair",
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
  options: [
    { narrative: 'You carefully tiptoe past the sleeping beast...' },
    { narrative: 'You loudly call out to wake the dragon...' },
  ],
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

export const endingNarrativePromptOutput = {
  narrative: 'You have successfully completed your quest and saved the kingdom!',
  chapterTitle: 'Victory',
  imageDescription: 'A triumphant hero standing in golden sunlight',
}

export const invokeModelEndingNarrativeResponse = {
  body: new TextEncoder().encode(
    JSON.stringify({
      content: [
        {
          text: JSON.stringify(endingNarrativePromptOutput),
        },
      ],
    }),
  ),
}
