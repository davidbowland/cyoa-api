import { CyoaNarrative, NarrativeId } from '../types'

export const getNarrativeIdByIndex = (index: number): NarrativeId => `narrative-${index}`

export const applyLossView = (narrative: CyoaNarrative): CyoaNarrative => ({
  ...narrative,
  chapterTitle: narrative.losingTitle,
  narrative: narrative.losingNarrative,
  choice: undefined,
  options: [],
})
