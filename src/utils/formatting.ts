import Ajv from 'ajv'

import { initialNarrativeId } from '../config'
import {
  CreateGamePromptOutput,
  CreateNarrativePromptOutput,
  EndingNarrativePromptOutput,
  CyoaCharacter,
  CyoaChoicePoint,
  CyoaGame,
  CyoaInventory,
  CyoaNarrative,
  CyoaNarrativeOption,
  NarrativeGenerationData,
} from '../types'
import { getRandomSample } from './random'

const ajv = new Ajv({ allErrors: true })

interface Option {
  name: string
  rank: number
}

const transformRankValues = (
  options: Option[],
  choiceCount: number,
  startingResourceValue: number,
  lossResourceThreshold: number,
  resourcePercent: number,
): CyoaNarrativeOption[] => {
  const range = Math.abs(lossResourceThreshold - startingResourceValue)
  const multiplier = Math.sign(lossResourceThreshold - startingResourceValue) || 1
  const choiceRange = Math.max(range / choiceCount, 1)
  const percentRange = resourcePercent / options.length

  return options.map((o) => {
    const percent = percentRange * o.rank - Math.random() * percentRange
    const randomRange = Math.max(Math.ceil(percent * choiceRange), 1)
    return {
      ...o,
      resourcesToAdd: randomRange * multiplier,
    }
  })
}

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

export const formatCyoaGame = (
  input: CreateGamePromptOutput,
): { game: CyoaGame; imageDescription: string; resourceImageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: [
      'title',
      'description',
      'titleImageDescription',
      'outline',
      'characters',
      'inventory',
      'keyInformation',
      'redHerrings',
      'resourceName',
      'resourceImageDescription',
      'startingResourceValue',
      'lossResourceThreshold',
      'choicePoints',
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
      keyInformation: {
        type: 'array',
        items: { type: 'string' },
      },
      redHerrings: {
        type: 'array',
        items: { type: 'string' },
      },
      resourceName: { type: 'string', minLength: 1 },
      resourceImageDescription: { type: 'string', minLength: 1 },
      startingResourceValue: { type: 'number' },
      lossResourceThreshold: { type: 'number' },
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
    input.startingResourceValue as number,
    input.lossResourceThreshold as number,
  )

  const game: CyoaGame = {
    title: input.title as string,
    description: input.description as string,
    outline: input.outline as string,
    characters: input.characters as CyoaCharacter[],
    inventory: input.inventory as CyoaInventory[],
    keyInformation: input.keyInformation as string[],
    redHerrings: input.redHerrings as string[],
    resourceName: input.resourceName as string,
    startingResourceValue: starting,
    lossResourceThreshold: ending,
    choicePoints: input.choicePoints as CyoaChoicePoint[],
    initialNarrativeId,
  }
  return {
    game,
    imageDescription: input.titleImageDescription as string,
    resourceImageDescription: input.resourceImageDescription as string,
  }
}

export const formatNarrative = (
  input: CreateNarrativePromptOutput,
  generationData: NarrativeGenerationData,
  game: CyoaGame,
  resourcePercent: number,
): { narrative: CyoaNarrative; imageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: [
      'narrative',
      'recap',
      'chapterTitle',
      'imageDescription',
      'choice',
      'options',
      'inventory',
    ],
    properties: {
      narrative: { type: 'string', minLength: 1 },
      recap: { type: 'string', minLength: 1 },
      chapterTitle: { type: 'string', minLength: 1 },
      imageDescription: { type: 'string', minLength: 1 },
      choice: { type: 'string', minLength: 1 },
      options: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'rank'],
          properties: {
            name: { type: 'string', minLength: 1 },
            rank: { type: 'number' },
          },
        },
      },
      inventory: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const inventoryItems = (input.inventory as string[])
    .map((name) => game.inventory.find((item) => item.name === name))
    .filter((item): item is CyoaInventory => item !== undefined)

  const transformedOptions = transformRankValues(
    input.options as Option[],
    game.choicePoints.length,
    game.startingResourceValue,
    game.lossResourceThreshold,
    resourcePercent,
  )

  const narrative: CyoaNarrative = {
    narrative: input.narrative as string,
    recap: input.recap as string,
    chapterTitle: input.chapterTitle as string,
    choice: input.choice as string,
    options: getRandomSample(transformedOptions, transformedOptions.length),
    inventory: inventoryItems,
    currentResourceValue: generationData.currentResourceValue,
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
    currentResourceValue: generationData.currentResourceValue,
  }
  return { narrative, imageDescription: input.imageDescription as string }
}
