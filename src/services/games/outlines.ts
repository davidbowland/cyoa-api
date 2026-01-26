import Ajv from 'ajv'

import { gameThemes, inventoryCounts, lossConditions } from '../../assets/configurations'
import { promptIdCreateGame } from '../../config'
import {
  CreateGamePromptOutput,
  CyoaCharacter,
  CyoaGameFormatted,
  CyoaInventoryWithDescription,
  GameOutlineResults,
  TextPrompt,
} from '../../types'
import { log } from '../../utils/logging'
import { generateInspirationWords, getRandomSample } from '../../utils/random'
import { invokeModel } from '../bedrock'
import { getPromptById } from '../dynamodb'

const ajv = new Ajv({ allErrors: true })

export const generateGameOutline = async (
  existingGameTitles: string[],
  choiceCount: number,
): Promise<GameOutlineResults> => {
  const storyType = getRandomSample(gameThemes, 1)[0]
  const lossCondition = getRandomSample(lossConditions, 1)[0]
  const inventoryCount = getRandomSample(inventoryCounts, 1)[0]
  const minimumResourceRange = choiceCount * 5
  const inspirationAuthor = getRandomSample(storyType.inspirationAuthors, 1)[0]

  const gameModelContext = {
    storyType,
    existingGameTitles,
    lossCondition,
    minimumResourceRange,
    inventoryCount,
    inspirationWords: generateInspirationWords(),
  }
  log('Creating game with context', { gameModelContext })

  const gamePrompt = await getPromptById<TextPrompt>(promptIdCreateGame)
  const gameOutput = await invokeModel<CreateGamePromptOutput>(gamePrompt, gameModelContext)
  Object.entries(gameOutput).map(([key, value]) =>
    log('Game generated', { [key]: JSON.stringify(value, null, 2) }),
  )

  const { game, imageDescription, resourceImageDescription } = formatCreateGameOutput(gameOutput)
  return { game, imageDescription, resourceImageDescription, storyType, inspirationAuthor }
}

const formatCreateGameOutput = (
  input: CreateGamePromptOutput,
): { game: CyoaGameFormatted; imageDescription: string; resourceImageDescription: string } => {
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
      inventory: input.inventory as CyoaInventoryWithDescription[],
      resourceName: input.resourceName as string,
      startingResourceValue: input.startingResourceValue as number,
      lossResourceThreshold: input.lossResourceThreshold as number,
    },
    imageDescription: input.titleImageDescription as string,
    resourceImageDescription: input.resourceImageDescription as string,
  }
}
