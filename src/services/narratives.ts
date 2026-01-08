import { NarrativeGenerationData } from '../types'

const GENERATION_TIME = 300_000 // 5 minutes

export const isGenerating = (
  generationData: NarrativeGenerationData | undefined,
  timeout = GENERATION_TIME,
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )
