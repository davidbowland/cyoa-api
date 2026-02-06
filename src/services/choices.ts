import { ChoiceId, ChoiceResult, CyoaGame, GameId } from '../types'
import { calculateCurrentResourceValue, isGameLost, parseChoiceId } from '../utils/choices'
import { log } from '../utils/logging'
import { isGenerating } from '../utils/narratives'
import { serializeCyoaChoice } from '../utils/serialize'
import { getGameById, getNarrativeById } from './dynamodb'
import { queueNarrativeGeneration } from './narratives'

export const retrieveChoiceById = async (
  gameId: GameId,
  choiceId: ChoiceId,
): Promise<ChoiceResult> => {
  const { choicePointIndex, latestOptionSelected, narrativeId, selectedOptionIndices } =
    parseChoiceId(choiceId)
  const game = await getGameById(gameId)
  const existing = await getNarrativeById(gameId, narrativeId).catch(() => undefined)
  // const current = game.choicePoints[choicePointIndex]
  // const isLastNarrative = current === undefined && choicePointIndex !== game.choicePoints.length
  // if (isLastNarrative || current?.options[latestOptionSelected] === undefined) {
  //   return { status: 'not_found', message: 'Choice not found' }
  // }

  if (existing?.narrative) {
    await ensureNextNarrativeExists(gameId, choiceId, game)

    const currentResourceValue = calculateCurrentResourceValue(game, selectedOptionIndices)
    const isLost = isGameLost(game, currentResourceValue)
    log('Returning existing narrative', {
      gameId,
      choiceId,
      narrativeId,
      currentResourceValue,
      isLost,
    })
    return {
      status: 'ready',
      choice: serializeCyoaChoice(
        existing.narrative,
        isLost,
        currentResourceValue,
        latestOptionSelected,
      ),
    }
  }

  if (existing?.generationData && isGenerating(existing.generationData)) {
    log('Narrative generation in progress', { gameId, choiceId, narrativeId })
    return { status: 'generating', message: 'Narrative is being generated' }
  }

  await queueNarrativeGeneration(gameId, game, choicePointIndex)
  return { status: 'generating', message: 'Narrative generation queued' }
}

const ensureNextNarrativeExists = async (gameId: GameId, choiceId: ChoiceId, game: CyoaGame) => {
  const { choicePointIndex, narrativeId } = parseChoiceId(`${choiceId}-0`)
  try {
    const { narrative, generationData } = await getNarrativeById(gameId, narrativeId)
    if (narrative || (generationData && isGenerating(generationData))) {
      log('Next narrative found', { gameId, choiceId, narrativeId, choicePointIndex })
      return
    }
    log('Generation time expired, re-queueing generation', {
      gameId,
      choiceId,
      narrativeId,
      choicePointIndex,
    })
  } catch {
    log('Next narrative not found, queuing generation', {
      gameId,
      choiceId,
      narrativeId,
      choicePointIndex,
    })
  }
  await queueNarrativeGeneration(gameId, game, choicePointIndex)
}
