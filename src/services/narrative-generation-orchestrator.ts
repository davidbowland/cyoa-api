import { adjectives } from '../assets/adjectives'
import { nouns } from '../assets/nouns'
import { verbs } from '../assets/verbs'
import {
  initialNarrativeId,
  inspirationAdjectivesCount,
  inspirationNounsCount,
  inspirationVerbsCount,
  promptIdCreateNarrative,
  promptIdLoseGame,
  promptIdWinGame,
} from '../config'
import {
  CreateNarrativePromptOutput,
  EndingNarrativePromptOutput,
  CyoaChoicePoint,
  CyoaGame,
  CyoaNarrative,
  GameId,
  NarrativeGenerationData,
  NarrativeId,
  TextPrompt,
} from '../types'
import { formatEndingNarrative, formatNarrative } from '../utils/formatting'
import { log, logError } from '../utils/logging'
import {
  determineRequiredNarratives,
  parseNarrativeId,
  isGameLost,
  isGameWon,
} from '../utils/narratives'
import { getRandomSample } from '../utils/random'
import { invokeModel } from './bedrock'
import {
  getGameById,
  getNarrativeById,
  getNarrativesByIds,
  getPromptById,
  setNarrativeById,
  setNarrativeGenerationData,
} from './dynamodb'
import { generateNarrativeImageForNarrative } from './image-generation'
import {
  GenerationContextParams,
  getBestOption,
  selectGenerationStrategy,
} from './narrative-strategies'
import { addToQueue } from './sqs'

const GENERATION_TIME = 300_000 // 5 minutes

interface GenerateNarrativeContentResult {
  narrative: CyoaNarrative
  imageDescription: string
}

const generateNarrativeContent = async (
  game: CyoaGame,
  narrativeId: NarrativeId,
  currentResourceValue: number,
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
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

  const isLost = isGameLost(game, currentResourceValue)
  const { choicePointIndex } = parseNarrativeId(narrativeId)
  const isWon = isGameWon(game, choicePointIndex)

  if (isLost || isWon) {
    const promptId = isWon ? promptIdWinGame : promptIdLoseGame
    const prompt = await getPromptById<TextPrompt>(promptId)
    log('Creating narrative with context', {
      gameId: game.title,
      narrativeId,
      modelContext,
      promptId,
    })

    const generatedNarrative = await invokeModel<EndingNarrativePromptOutput>(prompt, modelContext)
    log('Generated narrative', { generatedNarrative })

    const { narrative, imageDescription } = formatEndingNarrative(
      generatedNarrative,
      generationData,
    )
    return { narrative, imageDescription }
  } else {
    const prompt = await getPromptById<TextPrompt>(promptIdCreateNarrative)
    log('Creating narrative with context', {
      gameId: game.title,
      narrativeId,
      modelContext,
      promptId: promptIdCreateNarrative,
    })

    const generatedNarrative = await invokeModel<CreateNarrativePromptOutput>(prompt, modelContext)
    log('Generated narrative', { generatedNarrative })

    const { narrative, imageDescription } = formatNarrative(
      generatedNarrative,
      generationData,
      game,
    )
    return { narrative, imageDescription }
  }
}

type NarrativeStatus = 'ready' | 'generating' | 'not_found'

interface NarrativeResult {
  status: NarrativeStatus
  narrative?: CyoaNarrative
  message?: string
}

const isGenerating = (
  generationData: NarrativeGenerationData | undefined,
  timeout = GENERATION_TIME,
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )

const startNarrativeGeneration = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  generationData: Pick<
    NarrativeGenerationData,
    | 'recap'
    | 'currentResourceValue'
    | 'lastChoiceMade'
    | 'lastOptionSelected'
    | 'bestOption'
    | 'currentInventory'
  >,
  currentChoice?: CyoaChoicePoint,
): Promise<void> => {
  const fullGenerationData: NarrativeGenerationData = {
    ...generationData,
    inventoryToIntroduce: currentChoice?.inventoryToIntroduce ?? [],
    keyInformationToIntroduce: currentChoice?.keyInformationToIntroduce ?? [],
    redHerringsToIntroduce: currentChoice?.redHerringsToIntroduce ?? [],
    inventoryOrInformationConsumed: currentChoice?.inventoryOrInformationConsumed ?? [],
    nextChoice: currentChoice?.choice ?? '',
    options: currentChoice?.options ?? [],
    generationStartTime: Date.now(),
  }

  await setNarrativeGenerationData(gameId, narrativeId, fullGenerationData)

  await addToQueue({
    messageType: 'narrative-generation',
    gameId,
    narrativeId,
    uuid: `${gameId}-${narrativeId}`,
  })

  log('Narrative generation queued', { gameId, narrativeId })
}

const ensureUpcomingNarratives = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  narrative: CyoaNarrative,
  game: CyoaGame,
): Promise<void> => {
  const upcomingNarrativeIds = determineRequiredNarratives(narrative, narrativeId)
  const nextNarratives = await getNarrativesByIds(gameId, upcomingNarrativeIds)

  for (const nextNarrativeId of upcomingNarrativeIds) {
    const existingNarrative = nextNarratives.find((obj) => obj.narrativeId === nextNarrativeId)

    if (isGenerating(existingNarrative?.generationData) || existingNarrative?.narrative) {
      continue
    }

    const bestOption = getBestOption(narrative.options)
    const { optionId, choicePointIndex } = parseNarrativeId(nextNarrativeId)
    const selectedOption = narrative.options[optionId]
    const nextNarrativeContext = {
      recap: narrative?.recap ?? 'The game is starting.',
      currentResourceValue: selectedOption
        ? narrative.currentResourceValue + selectedOption.resourcesToAdd
        : narrative.currentResourceValue,
      lastChoiceMade: narrative.choice ?? '',
      lastOptionSelected: selectedOption?.name ?? '',
      bestOption: bestOption?.name ?? '',
      currentInventory: narrative?.inventory.map((item) => item.name) ?? [],
    }
    const currentChoice = game.choicePoints[choicePointIndex]
    if (narrative.choice) {
      await startNarrativeGeneration(gameId, nextNarrativeId, nextNarrativeContext, currentChoice)
    }
  }
}

const buildLastNarrativeContext = async (
  gameId: GameId,
  narrativeId: NarrativeId,
): Promise<CyoaNarrative | undefined> => {
  const { lastNarrativeId } = parseNarrativeId(narrativeId)
  if (!lastNarrativeId) return undefined

  const { narrative } = await getNarrativeById(gameId, lastNarrativeId)
  return narrative
}

export const ensureNarrativeExists = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  game: CyoaGame,
): Promise<NarrativeResult> => {
  const strategy = selectGenerationStrategy(narrativeId)
  const existing = await getNarrativeById(gameId, narrativeId)

  if (existing.narrative) {
    await ensureUpcomingNarratives(gameId, narrativeId, existing.narrative, game)
    log('Returning existing narrative', { gameId, narrativeId })
    return { status: 'ready', narrative: existing.narrative }
  }

  if (existing.generationData && isGenerating(existing.generationData)) {
    log('Narrative generation in progress', { gameId, narrativeId })
    return { status: 'generating', message: 'Narrative is being generated' }
  }

  try {
    const lastNarrative = await buildLastNarrativeContext(gameId, narrativeId)
    const contextParams: GenerationContextParams = {
      gameId,
      narrativeId,
      game,
      lastNarrative,
    }

    const narrativeContext = strategy.buildContext(contextParams)
    const { choicePointIndex } = parseNarrativeId(narrativeId)
    const currentChoice = game.choicePoints[choicePointIndex]

    await startNarrativeGeneration(gameId, narrativeId, narrativeContext, currentChoice)

    log('Started narrative generation', { gameId, narrativeId })
    return { status: 'generating', message: 'Narrative is being generated' }
  } catch (error: unknown) {
    log('Failed to start narrative generation', { gameId, narrativeId, error })
    return { status: 'not_found' }
  }
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

  const { narrative, imageDescription } = await generateNarrativeContent(
    game,
    narrativeId,
    generationData.currentResourceValue,
    generationData,
  )

  const narrativeImageData = await generateNarrativeImageForNarrative(
    gameId,
    narrativeId,
    imageDescription,
  )

  const narrativeWithImage = { ...narrativeImageData, ...narrative }
  await setNarrativeById(gameId, narrativeId, narrativeWithImage)

  return narrativeWithImage
}

export const startInitialNarrativeGeneration = async (
  gameId: GameId,
  game: CyoaGame,
): Promise<void> => {
  const { InitialNarrativeStrategy } = await import('./narrative-strategies')

  const narrativeContext = InitialNarrativeStrategy.buildContext({
    gameId,
    narrativeId: initialNarrativeId,
    game,
  })

  try {
    await startNarrativeGeneration(
      gameId,
      initialNarrativeId,
      narrativeContext,
      game.choicePoints[0],
    )
  } catch (error: unknown) {
    logError('Error creating initial narrative', {
      gameId,
      initialNarrativeId,
      narrativeContext,
      error,
    })
    throw error
  }
}
