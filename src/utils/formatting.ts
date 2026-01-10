import Ajv from 'ajv'

import { initialNarrativeId } from '../config'
import {
  CreateGamePromptOutput,
  CreateNarrativePromptOutput,
  CyoaCharacter,
  CyoaChoicePoint,
  CyoaGame,
  CyoaInventory,
  CyoaNarrative,
  CyoaOption,
  NarrativeGenerationData,
} from '../types'

const ajv = new Ajv({ allErrors: true })

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

  const game: CyoaGame = {
    title: input.title as string,
    description: input.description as string,
    outline: input.outline as string,
    characters: input.characters as CyoaCharacter[],
    inventory: input.inventory as CyoaInventory[],
    keyInformation: input.keyInformation as string[],
    redHerrings: input.redHerrings as string[],
    resourceName: input.resourceName as string,
    startingResourceValue: input.startingResourceValue as number,
    lossResourceThreshold: input.lossResourceThreshold as number,
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
          required: ['name', 'resourcesToAdd'],
          properties: {
            name: { type: 'string', minLength: 1 },
            resourcesToAdd: { type: 'number' },
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

  const narrative: CyoaNarrative = {
    narrative: input.narrative as string,
    recap: input.recap as string,
    chapterTitle: input.chapterTitle as string,
    choice: input.choice as string,
    options: input.options as CyoaOption[],
    inventory: inventoryItems,
    currentResourceValue: generationData.currentResourceValue,
  }
  return { narrative, imageDescription: input.imageDescription as string }
}
