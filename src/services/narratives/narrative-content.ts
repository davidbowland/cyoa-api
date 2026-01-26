import Ajv from 'ajv'

import { promptIdCreateEndingNarrative, promptIdCreateNarrative } from '../../config'
import {
  CreateNarrativePromptOutput,
  CyoaGame,
  CyoaInventory,
  CyoaNarrative,
  CyoaNarrativeOption,
  EndingNarrativePromptOutput,
  GenerateNarrativeContentResult,
  NarrativeGenerationData,
  TextPrompt,
} from '../../types'
import { log } from '../../utils/logging'
import { getRandomSample } from '../../utils/random'
import { invokeModel } from '../bedrock'
import { getPromptById } from '../dynamodb'

const ajv = new Ajv({ allErrors: true })

export const generateNarrativeContent = async (
  game: CyoaGame,
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
  const modelContext = {
    inventoryAvailable: generationData.inventoryAvailable,
    existingNarrative: generationData.existingNarrative,
    previousChoice: generationData.previousChoice,
    previousOptions: generationData.previousOptions,
    nextChoice: generationData.nextChoice,
    nextOptions: generationData.nextOptions,
    outline: generationData.outline,
    inspirationAuthor: generationData.inspirationAuthor,
  }

  const prompt = await getPromptById<TextPrompt>(promptIdCreateNarrative)
  log('Creating narrative with context', {
    gameId: game.title,
    modelContext,
    promptId: promptIdCreateNarrative,
  })

  const generatedNarrative = await invokeModel<CreateNarrativePromptOutput>(prompt, modelContext)
  log('Generated narrative', { generatedNarrative })

  const { narrative, imageDescription } = formatNarrative(generatedNarrative, generationData, game)
  return { narrative, imageDescription }
}

export const formatNarrative = (
  input: CreateNarrativePromptOutput,
  generationData: NarrativeGenerationData,
  game: CyoaGame,
): { narrative: CyoaNarrative; imageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: [
      'chapterTitle',
      'narrative',
      'imageDescription',
      'options',
      'losingTitle',
      'losingNarrative',
    ],
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
      losingTitle: { type: 'string', minLength: 1 },
      losingNarrative: { type: 'string', minLength: 1 },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const currentChoicePoint = game.choicePoints.find((cp) => cp.choice === generationData.nextChoice)
  if (!currentChoicePoint) {
    throw new Error('Choice point not found in game')
  }

  const inventoryItems = generationData.inventoryAvailable
    .map((name) => game.inventory.find((item) => item.name === name))
    .filter((item): item is CyoaInventory => item !== undefined)

  const optionsWithNarratives: CyoaNarrativeOption[] = currentChoicePoint.options.map(
    (option, idx) => ({ name: option.name, narrative: input.options?.[idx]?.narrative as string }),
  )
  const narrative: CyoaNarrative = {
    narrative: input.narrative as string,
    chapterTitle: input.chapterTitle as string,
    choice: generationData.nextChoice,
    options: getRandomSample(optionsWithNarratives, optionsWithNarratives.length),
    inventory: inventoryItems,
    losingTitle: input.losingTitle as string,
    losingNarrative: input.losingNarrative as string,
  }
  return { narrative, imageDescription: input.imageDescription as string }
}

export const generateEndingNarrativeContent = async (
  game: CyoaGame,
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
  const modelContext = {
    inventoryAvailable: generationData.inventoryAvailable,
    existingNarrative: game.winNarrative,
    previousChoice: generationData.previousChoice,
    previousOptions: generationData.previousOptions,
    outline: generationData.outline,
    inspirationAuthor: generationData.inspirationAuthor,
  }
  const prompt = await getPromptById<TextPrompt>(promptIdCreateEndingNarrative)
  log('Creating ending narrative with context', {
    promptIdCreateEndingNarrative,
    modelContext,
  })

  const generatedNarrative = await invokeModel<EndingNarrativePromptOutput>(prompt, modelContext)
  log('Generated ending narrative', { generatedNarrative })

  const { narrative, imageDescription } = formatEndingNarrative(generatedNarrative)
  return { narrative, imageDescription }
}

export const formatEndingNarrative = (
  input: EndingNarrativePromptOutput,
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
    chapterTitle: input.chapterTitle as string,
    options: [],
    inventory: [],
    losingTitle: '',
    losingNarrative: '',
  }
  return { narrative, imageDescription: input.imageDescription as string }
}
