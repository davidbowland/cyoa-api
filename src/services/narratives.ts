import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { adjectives } from '../assets/adjectives'
import { nouns } from '../assets/nouns'
import { verbs } from '../assets/verbs'
import {
  createNarrativeFunctionName,
  inspirationAdjectivesCount,
  inspirationNounsCount,
  inspirationVerbsCount,
} from '../config'
import {
  CreateNarrativePromptOutput,
  CyoaChoicePoint,
  CyoaNarrative,
  GameId,
  NarrativeGenerationData,
  NarrativeId,
} from '../types'
import { formatNarrative } from '../utils/formatting'
import { log, xrayCapture } from '../utils/logging'
import { getRandomSample } from '../utils/random'
import { invokeModel } from './bedrock'
import {
  getGameById,
  getNarrativeById,
  getPromptById,
  setNarrativeById,
  setNarrativeGenerationData,
} from './dynamodb'
import { selectPromptId } from './prompt-selection'

const lambda = xrayCapture(new LambdaClient({ region: 'us-east-1' }))

const GENERATION_TIME = 300_000 // 5 minutes

export const isGenerating = (
  generationData: NarrativeGenerationData | undefined,
  timeout = GENERATION_TIME,
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )

export const startNarrativeGeneration = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  generationData: Pick<
    NarrativeGenerationData,
    'recap' | 'currentResourceValue' | 'lastChoiceMade' | 'currentInventory'
  >,
  currentChoice: CyoaChoicePoint,
): Promise<void> => {
  const fullGenerationData: NarrativeGenerationData = {
    ...generationData,
    inventoryToIntroduce: currentChoice.inventoryToIntroduce,
    keyInformationToIntroduce: currentChoice.keyInformationToIntroduce,
    redHerringsToIntroduce: currentChoice.redHerringsToIntroduce,
    inventoryOrInformationConsumed: currentChoice.inventoryOrInformationConsumed,
    nextChoice: currentChoice.choice,
    options: currentChoice.options,
    generationStartTime: Date.now(),
  }

  await setNarrativeGenerationData(gameId, narrativeId, fullGenerationData)

  const command = new InvokeCommand({
    FunctionName: createNarrativeFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId, narrativeId }),
  })

  await lambda.send(command)
  log('CreateNarrativeFunction invoked', { gameId, narrativeId })
}

export const createNarrative = async (
  gameId: GameId,
  narrativeId: NarrativeId,
): Promise<CyoaNarrative> => {
  const game = await getGameById(gameId)
  const { generationData } = await getNarrativeById(gameId, narrativeId)

  if (!generationData) {
    throw new Error('Generation data not found')
  }

  const inspirationNouns = getRandomSample<string>([...nouns], inspirationNounsCount)
  const inspirationVerbs = getRandomSample<string>([...verbs], inspirationVerbsCount)
  const inspirationAdjectives = getRandomSample<string>([...adjectives], inspirationAdjectivesCount)

  const modelContext = {
    ...generationData,
    outline: game.outline,
    resourceName: game.resourceName,
    lossResourceThreshold: game.lossResourceThreshold,
    inspirationWords: inspirationNouns.concat(inspirationVerbs).concat(inspirationAdjectives),
  }
  log('Creating narrative with context', { gameId, narrativeId, modelContext })

  const promptId = selectPromptId(game, narrativeId, generationData.currentResourceValue)
  const prompt = await getPromptById(promptId)
  const generatedNarrative = await invokeModel<CreateNarrativePromptOutput>(prompt, modelContext)
  log('Narrative generated', { generatedNarrative: JSON.stringify(generatedNarrative, null, 2) })

  const narrative = formatNarrative(generatedNarrative, generationData)
  await setNarrativeById(gameId, narrativeId, narrative)

  return narrative
}
