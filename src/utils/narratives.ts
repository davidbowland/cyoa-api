import { narrativeGenerationTime } from '../config'
import { NarrativeGenerationData, NarrativeId } from '../types'

export const getNarrativeIdByIndex = (index: number): NarrativeId => `narrative-${index}`

export const isGenerating = (
  generationData: NarrativeGenerationData | undefined,
  timeout = narrativeGenerationTime,
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )
