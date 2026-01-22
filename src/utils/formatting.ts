import Ajv from 'ajv'

import {
  initialNarrativeId,
  resourceToAddPercentMax,
  resourceToAddPercentMin,
} from '../config'
import {
  CreateGamePromptOutput,
  CreateChoicesPromptOutput,
  CreateNarrativePromptOutput,
  EndingNarrativePromptOutput,
  Author,
  CyoaCharacter,
  CyoaChoicePoint,
  CyoaGame,
  CyoaInventory,
  CyoaNarrative,
  CyoaNarrativeOption,
  NarrativeGenerationData,
} from '../types'
import { calculateResourcesForOptions, calculateResourcesToAdd } from './options'
import { getRandomSample } from './random'

const ajv = new Ajv({ allErrors: true })

const clampResourceRange = (
  choiceCount: number,
  starting: number,
  ending: number,
): { starting: number; ending: number } => {
  const minRange = Math.ceil(choiceCount * 5)
  if (Math.abs(starting - ending) >= minRange) {
    return { starting, ending }
  }
  if (ending === 0) {
    return { starting: minRange, ending }
  } else {
    return { starting: 0, ending: minRange }
  }
}

export const formatCreateGameOutput = (
  input: CreateGamePromptOutput,
): { game: Partial<CyoaGame>; imageDescription: string; resourceImageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: [
      'title',
      'description',
      'titleImageDescription',
      'outline',
      'characters',
      'inventory',
      'resourceName',
      'resourceImageDescription',
      'startingResourceValue',
      'lossResourceThreshold',
    ],
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string', minLength: 1 },
      titleImageDescription: { type: 'string', minLength: 1 },
      outline: { type: 'string', minLength: 1 },
      characters: {
        type: 'array',
        items: { type: 'object' },
      },
      inventory: {
        type: 'array',
        items: { type: 'object' },
      },
      resourceName: { type: 'string', minLength: 1 },
      resourceImageDescription: { type: 'string', minLength: 1 },
      startingResourceValue: { type: 'number' },
      lossResourceThreshold: { type: 'number' },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  return {
    game: {
      title: input.title as string,
      description: input.description as string,
      outline: input.outline as string,
      characters: input.characters as CyoaCharacter[],
      inventory: input.inventory as CyoaInventory[],
      resourceName: input.resourceName as string,
      startingResourceValue: input.startingResourceValue as number,
      lossResourceThreshold: input.lossResourceThreshold as number,
    },
    imageDescription: input.titleImageDescription as string,
    resourceImageDescription: input.resourceImageDescription as string,
  }
}

export const formatCreateChoicesOutput = (
  input: CreateChoicesPromptOutput,
  gameData: Partial<CyoaGame>,
  inspirationAuthor: Author,
): CyoaGame => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['keyInformation', 'redHerrings', 'choicePoints'],
    properties: {
      keyInformation: {
        type: 'array',
        items: { type: 'string' },
      },
      redHerrings: {
        type: 'array',
        items: { type: 'string' },
      },
      choicePoints: {
        type: 'array',
        items: { type: 'object' },
      },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const choiceCount = (input.choicePoints as CyoaChoicePoint[]).length
  const { starting, ending } = clampResourceRange(
    choiceCount,
    gameData.startingResourceValue as number,
    gameData.lossResourceThreshold as number,
  )

  const choicePointsWithResources = (input.choicePoints as CyoaChoicePoint[]).map(
    (choicePoint, index) => {
      const resourcePercent = calculateResourcesToAdd(
        index,
        choiceCount,
        resourceToAddPercentMin,
        resourceToAddPercentMax,
      )
      const optionsWithResources = calculateResourcesForOptions(
        choicePoint.options,
        choiceCount,
        starting,
        ending,
        resourcePercent,
      )
      return {
        ...choicePoint,
        options: optionsWithResources,
      }
    },
  )

  return {
    ...gameData,
    keyInformation: input.keyInformation as string[],
    redHerrings: input.redHerrings as string[],
    startingResourceValue: starting,
    lossResourceThreshold: ending,
    choicePoints: choicePointsWithResources,
    inspirationAuthor,
    initialNarrativeId,
  } as CyoaGame
}

export const formatCyoaGame = (
  gameOutput: CreateGamePromptOutput,
  choicesOutput: CreateChoicesPromptOutput,
  inspirationAuthor: Author,
): { game: CyoaGame; imageDescription: string; resourceImageDescription: string } => {
  const { game: partialGame, imageDescription, resourceImageDescription } =
    formatCreateGameOutput(gameOutput)
  const game = formatCreateChoicesOutput(choicesOutput, partialGame, inspirationAuthor)

  return { game, imageDescription, resourceImageDescription }
}

export const formatNarrative = (
  input: CreateNarrativePromptOutput,
  generationData: NarrativeGenerationData,
  game: CyoaGame,
): { narrative: CyoaNarrative; imageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['chapterTitle', 'narrative', 'imageDescription', 'options'],
    properties: {
      chapterTitle: { type: 'string', minLength: 1 },
      narrative: { type: 'string', minLength: 1 },
      imageDescription: { type: 'string', minLength: 1 },
      options: {
        type: 'array',
        items: {
          type: 'object',
          required: ['narrative'],
          properties: {
            narrative: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const inventoryItems = generationData.currentInventory
    .map((name) => game.inventory.find((item) => item.name === name))
    .filter((item): item is CyoaInventory => item !== undefined)

  const currentChoicePoint = game.choicePoints.find(
    (cp) => cp.choice === generationData.nextChoice,
  )

  if (!currentChoicePoint) {
    throw new Error('Choice point not found in game')
  }

  const narrative: CyoaNarrative = {
    narrative: input.narrative as string,
    recap: generationData.recap,
    chapterTitle: input.chapterTitle as string,
    choice: generationData.nextChoice,
    options: getRandomSample(currentChoicePoint.options, currentChoicePoint.options.length),
    inventory: inventoryItems,
  }
  return { narrative, imageDescription: input.imageDescription as string }
}

export const formatEndingNarrative = (
  input: EndingNarrativePromptOutput,
  generationData: NarrativeGenerationData,
): { narrative: CyoaNarrative; imageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['narrative', 'chapterTitle', 'imageDescription'],
    properties: {
      narrative: { type: 'string', minLength: 1 },
      chapterTitle: { type: 'string', minLength: 1 },
      imageDescription: { type: 'string', minLength: 1 },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const narrative: CyoaNarrative = {
    narrative: input.narrative as string,
    recap: generationData.recap,
    chapterTitle: input.chapterTitle as string,
    choice: undefined,
    options: [],
    inventory: [],
  }
  return { narrative, imageDescription: input.imageDescription as string }
}
