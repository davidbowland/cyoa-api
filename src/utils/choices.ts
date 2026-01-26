import { ChoiceId, CyoaGame, NarrativeId } from '../types'
import { getNarrativeIdByIndex } from './narratives'

interface ChoiceIdParts {
  choicePointIndex: number
  latestOptionSelected: number
  narrativeId: NarrativeId
  selectedOptionIndices: number[]
}

export const parseChoiceId = (choiceId: ChoiceId): ChoiceIdParts => {
  const parts = choiceId.split('-')
  const choicePointIndex = parts.length - 1
  const selectedOptionIndices = parts.slice(1).map((part) => parseInt(part, 10))
  const narrativeId = getNarrativeIdByIndex(choicePointIndex)
  const latestOptionSelected = selectedOptionIndices[selectedOptionIndices.length - 1]

  return {
    choicePointIndex,
    latestOptionSelected,
    narrativeId,
    selectedOptionIndices,
  }
}

export const calculateCurrentResourceValue = (
  game: CyoaGame,
  selectedOptionIndices: number[],
): number => {
  return selectedOptionIndices.reduce((currentValue, optionIndex, choiceIndex) => {
    const choicePoint = game.choicePoints[choiceIndex]
    const option = choicePoint?.options[optionIndex]
    return option ? currentValue + option.resourcesToAdd : currentValue
  }, game.startingResourceValue)
}

export const isGameLost = (game: CyoaGame, currentResourceValue: number): boolean => {
  const isAscending = game.startingResourceValue < game.lossResourceThreshold
  return (
    (isAscending && currentResourceValue >= game.lossResourceThreshold) ||
    (!isAscending && currentResourceValue <= game.lossResourceThreshold)
  )
}
