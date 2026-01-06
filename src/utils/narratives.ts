import { CyoaNarrative, NarrativeId } from '../types'

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
): NarrativeId[] => narrative.options.map((_, index) => `${narrativeId}-${index}`)

export const isInitialNarrative = (narrativeId: NarrativeId): boolean => !narrativeId.includes('-')
