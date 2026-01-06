import Ajv from 'ajv'

import {
  CreateGamePromptOutput,
  CyoaCharacter,
  CyoaChoicePoint,
  CyoaGame,
  CyoaInventory,
} from '../types'

const ajv = new Ajv({ allErrors: true })

export const formatCyoaGame = (
  input: CreateGamePromptOutput,
): { game: CyoaGame; imageDescription: string } => {
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
  }

  return { game, imageDescription: input.titleImageDescription as string }
}
