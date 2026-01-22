import { CyoaGame, CyoaNarrative, NarrativeId } from '../types'

interface NarrativeIdParts {
  choicePointIndex: number
  selectedOptionIndices: number[]
  storageKey: string
  lastNarrativeId?: NarrativeId
}

export const parseNarrativeId = (narrativeId: NarrativeId): NarrativeIdParts => {
  const parts = narrativeId.split('-')
  const choicePointIndex = parts.length - 1
  const selectedOptionIndices = parts.slice(1).map((part) => parseInt(part, 10))
  const storageKey = `choice-${choicePointIndex}`
  const lastNarrativeId = choicePointIndex > 0 ? parts.slice(0, -1).join('-') : undefined

  return {
    choicePointIndex,
    selectedOptionIndices,
    storageKey,
    lastNarrativeId,
  }
}

export const calculateCurrentResourceValue = (
  game: CyoaGame,
  narrativeId: NarrativeId,
): number => {
  const { selectedOptionIndices } = parseNarrativeId(narrativeId)

  return selectedOptionIndices.reduce((currentValue, optionIndex, choiceIndex) => {
    const choicePoint = game.choicePoints[choiceIndex]
    const option = choicePoint?.options[optionIndex]
    return option ? currentValue + option.resourcesToAdd : currentValue
  }, game.startingResourceValue)
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

export const buildNextNarrativeId = (narrativeId: NarrativeId, optionIndex: number): NarrativeId =>
  `${narrativeId}-${optionIndex}`
