import { CyoaChoiceSerialized, CyoaGame, CyoaGameSerialized, CyoaNarrative } from '../types'

export const serializeCyoaGame = (game: CyoaGame): CyoaGameSerialized => ({
  description: game.description,
  image: game.image,
  resourceName: game.resourceName,
  resourceImage: game.resourceImage,
  startingResourceValue: game.startingResourceValue,
  lossResourceThreshold: game.lossResourceThreshold,
  title: game.title,
  initialChoiceId: game.initialChoiceId,
})

const combineNarrative = (
  narrative: CyoaNarrative,
  latestOptionSelected: number,
  isLoss: boolean,
): string => {
  const selectedOption = narrative.optionNarratives?.[latestOptionSelected]
  if (selectedOption) {
    return `${selectedOption.narrative}\n\n${isLoss ? narrative.losingNarrative : narrative.narrative}`
  }
  return narrative.narrative
}

export const serializeCyoaChoice = (
  narrative: CyoaNarrative,
  isLoss: boolean,
  currentResourceValue: number,
  latestOptionSelected: number,
): CyoaChoiceSerialized => {
  const combinedNarrative = combineNarrative(narrative, latestOptionSelected, isLoss)
  return {
    narrative: combinedNarrative,
    chapterTitle: narrative.chapterTitle,
    image: narrative.image,
    choice: narrative.choice,
    options: narrative.options,
    inventory: narrative.inventory,
    currentResourceValue,
  }
}
