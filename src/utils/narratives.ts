import { CyoaGame, CyoaNarrative, NarrativeId } from '../types'

interface NarrativeIdParts {
  lastNarrativeId: NarrativeId
  optionId: number
  choicePointIndex: number
}

export const parseNarrativeId = (narrativeId: NarrativeId): NarrativeIdParts => {
  const parts = narrativeId.split('-')
  const choicePointIndex = parts.length - 1
  return {
    lastNarrativeId: parts.slice(0, -1).join('-'),
    optionId: parseInt(parts.slice(-1)[0], 10),
    choicePointIndex,
  }
}

export const determineRequiredNarratives = (
  narrative: CyoaNarrative,
  narrativeId: NarrativeId,
): NarrativeId[] =>
  narrative.options
    .map((n, index) => ({ id: `${narrativeId}-${index}`, rank: n.rank }))
    .toSorted((a, b) => a.rank - b.rank)
    .map((n) => n.id)

export const isGameLost = (game: CyoaGame, currentResourceValue: number): boolean => {
  const isAscending = game.startingResourceValue < game.lossResourceThreshold
  return (
    (isAscending && currentResourceValue >= game.lossResourceThreshold) ||
    (!isAscending && currentResourceValue <= game.lossResourceThreshold)
  )
}

export const isGameWon = (game: CyoaGame, choicePointIndex: number): boolean =>
  choicePointIndex >= game.choicePoints.length

export const isInitialNarrative = (narrativeId: NarrativeId): boolean => !narrativeId.includes('-')
