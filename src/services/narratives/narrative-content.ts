import Ajv from 'ajv'

import { promptIdCreateNarrative, promptIdCreateOptionNarratives } from '../../config'
import {
  CreateNarrativePromptOutput,
  CreateOptionNarrativePromptOutput,
  CyoaGame,
  CyoaInventory,
  CyoaNarrative,
  CyoaNarrativeOption,
  GenerateNarrativeContentResult,
  NarrativeGenerationData,
  TextPrompt,
} from '../../types'
import { log } from '../../utils/logging'
import { invokeModel } from '../bedrock'
import { getPromptById } from '../dynamodb'

const ajv = new Ajv({ allErrors: true })

export const generateNarrativeContent = async (
  game: CyoaGame,
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
  const narrativeModelContext = {
    inventoryAvailable: generationData.inventoryAvailable,
    existingNarrative: generationData.existingNarrative,
    previousNarrative: generationData.previousNarrative,
    previousChoice: generationData.previousChoice,
    previousOptions: generationData.previousOptions,
    nextChoice: generationData.nextChoice,
    nextOptions: generationData.nextOptions,
    outline: generationData.outline,
    lossNarrative: generationData.lossNarrative,
    inspirationAuthor: generationData.inspirationAuthor,
  }

  const narrativePrompt = await getPromptById<TextPrompt>(promptIdCreateNarrative)
  const optionNarrativesPrompt = await getPromptById<TextPrompt>(promptIdCreateOptionNarratives)
  log('Creating narrative with context', {
    gameId: game.title,
    modelContext: narrativeModelContext,
    promptId: promptIdCreateNarrative,
  })

  const generatedNarrative = await invokeModel<CreateNarrativePromptOutput>(
    narrativePrompt,
    narrativeModelContext,
  )
  log('Generated narrative', { generatedNarrative })
  const { narrative: narrativeWithoutOptions, imageDescription } = formatNarrative(
    generatedNarrative,
    generationData,
    game,
  )

  const optionNarrativesModelContext = {
    previousNarrative: generatedNarrative.narrative,
    previousChoice: generationData.previousChoice,
    previousOptions: generationData.previousOptions,
    nextNarrative: narrativeWithoutOptions.narrative,
    inspirationAuthor: generationData.inspirationAuthor,
  }
  log('Creating option narratives with context', {
    gameId: game.title,
    modelContext: optionNarrativesModelContext,
    promptId: optionNarrativesPrompt,
  })

  const generatedOptionNarratives = await invokeModel<CreateOptionNarrativePromptOutput>(
    optionNarrativesPrompt,
    optionNarrativesModelContext,
  )
  log('Generated option narratives', { generatedOptionNarratives })

  const { options } = formatOptionNarratives(generatedOptionNarratives, generationData, game)
  const narrative = { ...narrativeWithoutOptions, options }
  return { narrative, imageDescription }
}

export const formatNarrative = (
  input: CreateNarrativePromptOutput,
  generationData: NarrativeGenerationData,
  game: CyoaGame,
): { narrative: Omit<CyoaNarrative, 'options'>; imageDescription: string } => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['chapterTitle', 'narrative', 'imageDescription', 'losingTitle', 'losingNarrative'],
    properties: {
      chapterTitle: { type: 'string', minLength: 1 },
      narrative: { type: 'string', minLength: 1 },
      imageDescription: { type: 'string', minLength: 1 },
      losingTitle: { type: 'string', minLength: 1 },
      losingNarrative: { type: 'string', minLength: 1 },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const inventoryItems = generationData.inventoryAvailable
    .map((name) => game.inventory.find((item) => item.name === name))
    .filter((item): item is CyoaInventory => item !== undefined)

  const narrative = {
    narrative: input.narrative as string,
    chapterTitle: input.chapterTitle as string,
    choice: generationData.nextChoice,
    inventory: inventoryItems,
    losingTitle: input.losingTitle as string,
    losingNarrative: input.losingNarrative as string,
  }
  return { narrative, imageDescription: input.imageDescription as string }
}

export const formatOptionNarratives = (
  input: CreateOptionNarrativePromptOutput,
  generationData: NarrativeGenerationData,
  game: CyoaGame,
): Pick<CyoaNarrative, 'options'> => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['options'],
    properties: {
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

  const currentChoicePoint = game.choicePoints.find((cp) => cp.choice === generationData.nextChoice)
  if (!currentChoicePoint) {
    throw new Error('Choice point not found in game')
  }

  const optionsWithNarratives: CyoaNarrativeOption[] = currentChoicePoint.options.map(
    (option, idx) => ({ name: option.name, narrative: input.options?.[idx]?.narrative as string }),
  )
  return { options: optionsWithNarratives }
}
