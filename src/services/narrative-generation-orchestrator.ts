import {
  initialNarrativeId,
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
  calculateCurrentResourceValue,
  determineRequiredNarratives,
  parseNarrativeId,
  isGameLost,
  isGameWon,
} from '../utils/narratives'
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
  generationData: NarrativeGenerationData,
): Promise<GenerateNarrativeContentResult> => {
  const currentResourceValue = calculateCurrentResourceValue(game, narrativeId)

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

    const { narrative, imageDescription } = formatNarrative(generatedNarrative, generationData, game)
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
  game: CyoaGame,
  generationData: Pick<
    NarrativeGenerationData,
    'recap' | 'lastChoiceMade' | 'lastOptionSelected' | 'bestOption' | 'currentInventory'
  >,
  currentChoice?: CyoaChoicePoint,
  lastChoice?: CyoaChoicePoint,
): Promise<void> => {
  const fullGenerationData: NarrativeGenerationData = {
    ...generationData,
    inventoryAvailable: currentChoice?.inventoryAvailable ?? [],
    existingNarrative: currentChoice?.choiceNarrative ?? '',
    previousChoice: lastChoice?.choice ?? '',
    previousOptions:
      lastChoice?.options.map((opt) => ({
        name: opt.name,
        rank: opt.rank,
        consequence: opt.consequence,
      })) ?? [],
    nextChoice: currentChoice?.choice ?? '',
    nextOptions:
      currentChoice?.options.map((opt) => ({
        name: opt.name,
        rank: opt.rank,
        consequence: opt.consequence,
      })) ?? [],
    outline: game.outline,
    inspirationAuthor: game.inspirationAuthor,
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
    const { selectedOptionIndices, choicePointIndex } = parseNarrativeId(nextNarrativeId)
    const lastOptionIndex = selectedOptionIndices.length > 0
      ? selectedOptionIndices[selectedOptionIndices.length - 1]
      : undefined
    const selectedOption = lastOptionIndex !== undefined ? narrative.options[lastOptionIndex] : undefined
    const nextNarrativeContext = {
      recap: narrative?.recap ?? 'The game is starting.',
      lastChoiceMade: narrative.choice ?? '',
      lastOptionSelected: selectedOption?.name ?? '',
      bestOption: bestOption?.name ?? '',
      currentInventory: narrative?.inventory.map((item) => item.name) ?? [],
    }
    const currentChoice = game.choicePoints[choicePointIndex]
    const { choicePointIndex: currentChoiceIndex } = parseNarrativeId(narrativeId)
    const lastChoice = game.choicePoints[currentChoiceIndex]
    if (narrative.choice) {
      await startNarrativeGeneration(
        gameId,
        nextNarrativeId,
        game,
        nextNarrativeContext,
        currentChoice,
        lastChoice,
      )
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
    const { lastNarrativeId } = parseNarrativeId(narrativeId)
    const lastChoiceIndex = lastNarrativeId ? parseNarrativeId(lastNarrativeId).choicePointIndex : -1
    const lastChoice = lastChoiceIndex >= 0 ? game.choicePoints[lastChoiceIndex] : undefined

    await startNarrativeGeneration(gameId, narrativeId, game, narrativeContext, currentChoice, lastChoice)

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
      game,
      narrativeContext,
      game.choicePoints[0],
      undefined,
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
