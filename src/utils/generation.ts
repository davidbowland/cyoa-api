import { narrativeGenerationTime } from '../config'

export const isGenerating = (
  generationData: { generationStartTime: number } | undefined,
  timeout = narrativeGenerationTime,
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )
