import {
  CyoaGame,
  CyoaGameSerialized,
  CyoaNarrative,
  CyoaNarrativeSerialized,
  CyoaOptionSerialized,
  NarrativeId,
} from '../types'
import { calculateCurrentResourceValue, parseNarrativeId } from './narratives'

export const serializeCyoaGame = (game: CyoaGame): CyoaGameSerialized => ({
  description: game.description,
  image: game.image,
  resourceName: game.resourceName,
  resourceImage: game.resourceImage,
  startingResourceValue: game.startingResourceValue,
  lossResourceThreshold: game.lossResourceThreshold,
  title: game.title,
  initialNarrativeId: game.initialNarrativeId,
})

export const serializeCyoaNarrative = (
  narrative: CyoaNarrative,
  game: CyoaGame,
  narrativeId: NarrativeId,
): CyoaNarrativeSerialized => {
  const currentResourceValue = calculateCurrentResourceValue(game, narrativeId)
  const { selectedOptionIndices, choicePointIndex } = parseNarrativeId(narrativeId)

  let combinedNarrative = narrative.narrative

  if (selectedOptionIndices.length > 0) {
    const lastOptionIndex = selectedOptionIndices[selectedOptionIndices.length - 1]
    const lastChoiceIndex = choicePointIndex - 1
    const lastChoice = game.choicePoints[lastChoiceIndex]
    const selectedOption = lastChoice?.options[lastOptionIndex]

    if (selectedOption) {
      combinedNarrative = `${selectedOption.consequence}\n\n${narrative.narrative}`
    }
  }

  return {
    narrative: combinedNarrative,
    chapterTitle: narrative.chapterTitle,
    image: narrative.image,
    choice: narrative.choice,
    options: narrative.options.map(
      (option): CyoaOptionSerialized => ({
        name: option.name,
      }),
    ),
    inventory: narrative.inventory,
    currentResourceValue,
  }
}
