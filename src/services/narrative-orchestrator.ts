import { CyoaGame, CyoaNarrative, GameId, NarrativeId } from '../types'
import { log } from '../utils/logging'
import { determineRequiredNarratives, parseNarrativeId } from '../utils/narratives'
import { getNarrativeById, getNarrativesByIds } from './dynamodb'
import { GenerationContextParams, selectGenerationStrategy } from './narrative-strategies'
import { isGenerating, startNarrativeGeneration } from './narratives'

type NarrativeStatus = 'ready' | 'generating' | 'not_found'

interface NarrativeResult {
  status: NarrativeStatus
  narrative?: CyoaNarrative
  message?: string
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

    const { optionId, choicePointIndex } = parseNarrativeId(nextNarrativeId)
    const nextNarrativeContext = {
      recap: narrative?.recap ?? 'The game is starting.',
      currentResourceValue: narrative.currentResourceValue,
      lastChoiceMade: narrative.options[optionId]?.name,
      currentInventory: narrative?.inventory ?? [],
    }
    const currentChoice = game.choicePoints[choicePointIndex]
    await startNarrativeGeneration(gameId, nextNarrativeId, nextNarrativeContext, currentChoice)
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
