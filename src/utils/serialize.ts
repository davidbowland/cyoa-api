import {
  CyoaGame,
  CyoaGameSerialized,
  CyoaNarrative,
  CyoaNarrativeSerialized,
  CyoaOptionSerialized,
} from '../types'

export const serializeCyoaGame = (game: CyoaGame): CyoaGameSerialized => ({
  description: game.description,
  image: game.image,
  resourceName: game.resourceName,
  startingResourceValue: game.startingResourceValue,
  lossResourceThreshold: game.lossResourceThreshold,
  title: game.title,
  initialNarrativeId: game.initialNarrativeId,
})

export const serializeCyoaNarrative = (narrative: CyoaNarrative): CyoaNarrativeSerialized => ({
  narrative: narrative.narrative,
  chapterTitle: narrative.chapterTitle,
  image: narrative.image,
  choice: narrative.choice,
  options: narrative.options.map(
    (option): CyoaOptionSerialized => ({
      name: option.name,
    }),
  ),
  inventory: narrative.inventory,
  currentResourceValue: narrative.currentResourceValue,
})
