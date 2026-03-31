/* eslint sort-keys:0 */
import {
  CyoaGame,
  CyoaNarrative,
  CreateNarrativeEvent,
  GameChoicesGenerationData,
  GameId,
  ImagePrompt,
  NarrativeGenerationData,
  NarrativeId,
  TextPrompt,
  TextPromptConfig,
  PromptId,
} from '@types'

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
  lossCondition: 'reduce',
  initialChoiceId: 'start',
  inspirationAuthor: {
    name: 'Agatha Christie',
    style:
      'Clever plotting with careful clue placement. Measured pacing that builds tension while maintaining clarity and logical deduction.',
  },
  winNarrative: 'You have successfully completed your quest!',
  choicePoints: [
    {
      charactersToIntroduce: ['Mr Jones'],
      keyInformationToIntroduce: ['Important clue 1'],
      redHerringsToIntroduce: ['False clue 1'],
      inventoryAvailable: ['Sword'],
      choiceNarrative: 'You encounter a challenge',
      choice: 'You see a sleeping dragon. What do you do?',
      options: [
        { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -10 },
        { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -20 },
      ],
      lossNarrative: 'You have failed in your quest.',
    },
  ],
}

export const serializedGame = {
  description: 'A test adventure game',
  image: 'test-image.jpg',
  resourceName: 'Health',
  resourceImage: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/resource.png',
  startingResourceValue: 100,
  lossResourceThreshold: 0,
  title: 'Test Adventure',
  initialChoiceId: 'start',
}

export const serializedChoice = {
  narrative: 'You fight bravely\n\nYou find yourself standing before a massive sleeping dragon...',
  chapterTitle: "The Dragon's Lair",
  image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
  choice: 'You see a sleeping dragon. What do you do?',
  options: [
    { name: 'Sneak past quietly', rank: 1, consequence: 'You move silently', resourcesToAdd: -5 },
    { name: 'Wake the dragon', rank: 2, consequence: 'The dragon awakens', resourcesToAdd: -15 },
  ],
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
  currentResourceValue: 90,
}

// Game Choices Generation

export const gameChoicesGenerationData: GameChoicesGenerationData = {
  gameData: {
    title: 'Test Adventure',
    description: 'A test adventure game',
    outline: 'Test outline',
    characters: [{ name: 'Hero', voice: 'heroic' }],
    inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
    resourceName: 'Health',
    startingResourceValue: 100,
    lossResourceThreshold: 0,
  },
  storyType: {
    name: 'Classic Adventure',
    description: 'A classic adventure story',
    inspirationAuthors: [{ name: 'Test Author', style: 'Test style' }],
  },
  inspirationAuthor: { name: 'Test Author', style: 'Test style' },
  choiceCount: 7,
  image: 'test-image.jpg',
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
  resourceImage: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/resource.png',
  generationStartTime: 1640995200000,
}

// Prompts

export const promptConfig: TextPromptConfig = {
  anthropicVersion: 'bedrock-2023-05-31',
  maxTokens: 256,
  model: 'the-best-ai:1.0',
  thinkingBudgetTokens: 128,
}

export const promptId: PromptId = '5253'

export const prompt: TextPrompt = {
  config: promptConfig,
  contents: 'You are a helpful assistant. ${data}',
}

export const imagePrompt: ImagePrompt = {
  config: {
    model: 'amazon.nova-canvas-v1:0',
    quality: 'standard',
    cfgScale: 8,
    height: 512,
    width: 512,
    seed: 0,
  },
  contents: 'No text, not deformed, no surreal',
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
  winNarrative: 'You have successfully completed your quest and saved the kingdom!',
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
      lossNarrative: 'The dragon kills you!',
    },
  ],
}

// Narratives

export const narrativeId: NarrativeId = 'narrative-0'

export const createNarrativeEvent: CreateNarrativeEvent = {
  gameId,
  narrativeId,
}

export const narrativeGenerationData: NarrativeGenerationData = {
  inventoryAvailable: ['Health Potion'],
  existingNarrative: 'You approach the dragon carefully',
  previousNarrative: 'You entered the dark cave',
  previousChoice: 'What do you investigate first?',
  previousOptions: [
    { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -10 },
    { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -20 },
  ],
  nextChoice: 'You see a sleeping dragon. What do you do?',
  nextOptions: [
    { name: 'Fight', rank: 1, consequence: 'You fight bravely', resourcesToAdd: -10 },
    { name: 'Run', rank: 2, consequence: 'You flee the scene', resourcesToAdd: -20 },
  ],
  outline: 'Test outline',
  lossNarrative: 'The dragon kills you!',
  inspirationAuthor: {
    name: 'Agatha Christie',
    style:
      'Clever plotting with careful clue placement. Measured pacing that builds tension while maintaining clarity and logical deduction.',
  },
  generationStartTime: 1640995200000,
}

export const cyoaNarrative: CyoaNarrative = {
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  chapterTitle: "The Dragon's Lair",
  image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
  choice: 'You see a sleeping dragon. What do you do?',
  optionNarratives: [
    { name: 'Sneak past quietly', narrative: 'You carefully tiptoe past the sleeping beast...' },
    { name: 'Wake the dragon', narrative: 'You loudly call out to wake the dragon...' },
  ],
  options: [
    { name: 'Sneak past quietly', rank: 1, consequence: 'You move silently', resourcesToAdd: -5 },
    { name: 'Wake the dragon', rank: 2, consequence: 'The dragon awakens', resourcesToAdd: -15 },
  ],
  inventory: [{ name: 'Sword', image: 'sword-image.jpg' }],
  losingTitle: 'Defeat',
  losingNarrative: 'The dragon awakens and you are defeated.',
}

export const createNarrativePromptOutput = {
  chapterTitle: "The Dragon's Lair",
  narrative: 'You find yourself standing before a massive sleeping dragon...',
  imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
  losingTitle: 'Defeat',
  losingNarrative: 'The dragon awakens and you are defeated.',
  options: [
    { narrative: 'You carefully tiptoe past the sleeping beast...' },
    { narrative: 'You loudly call out to wake the dragon...' },
  ],
}

export const endingNarrativePromptOutput = {
  narrative: 'You have successfully completed your quest and saved the kingdom!',
  chapterTitle: 'Victory',
  imageDescription: 'A triumphant hero standing in golden sunlight',
}
