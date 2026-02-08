import Ajv from 'ajv'

import { promptIdCreateEndingNarrative } from '../../config'
import {
  CyoaGame,
  CyoaNarrative,
  EndingNarrativePromptOutput,
  GenerateNarrativeContentResult,
  NarrativeGenerationData,
  TextPrompt,
} from '../../types'
import { log } from '../../utils/logging'
import { invokeModel } from '../bedrock'
import { getPromptById } from '../dynamodb'

const ajv = new Ajv({ allErrors: true })

export const generateEndingNarrativeContent = async (
  game: CyoaGame,
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
  const modelContext = {
    inventoryAvailable: generationData.inventoryAvailable,
    existingNarrative: game.winNarrative,
    previousNarrative: generationData.previousNarrative,
    previousChoice: generationData.previousChoice,
    previousOptions: generationData.previousOptions,
    outline: generationData.outline,
    lossNarrative: generationData.lossNarrative,
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
