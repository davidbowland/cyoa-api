import {
  CyoaGame,
  CyoaNarrative,
  CyoaOption,
  GameId,
  NarrativeGenerationData,
  NarrativeId,
} from '../types'
import { parseNarrativeId } from '../utils/narratives'

export interface GenerationContextParams {
  gameId: GameId
  narrativeId: NarrativeId
  game: CyoaGame
  lastNarrative?: CyoaNarrative
}

interface NarrativeData {
  narrative?: CyoaNarrative
  generationData?: NarrativeGenerationData
}

interface NarrativeContext {
  recap: string
  lastChoiceMade: string
  lastOptionSelected: string
  bestOption: string
  currentInventory: string[]
}

interface GenerationStrategy {
  buildContext(params: GenerationContextParams): NarrativeContext
  shouldGenerate(existing: NarrativeData | undefined): boolean
}

const isGenerating = (
  generationData: NarrativeGenerationData | undefined,
  timeout = 300_000, // 5 minutes
): boolean =>
  !!(
    generationData?.generationStartTime &&
    generationData?.generationStartTime + timeout > Date.now()
  )

export const InitialNarrativeStrategy: GenerationStrategy = {
  buildContext: ({ game }: GenerationContextParams): NarrativeContext => ({
    recap: 'The game is starting.',
    lastChoiceMade: '',
    lastOptionSelected: '',
    bestOption: '',
    currentInventory: [],
  }),

  shouldGenerate: (existing: NarrativeData | undefined): boolean =>
    !existing?.narrative && !isGenerating(existing?.generationData),
}

export const getBestOption = (options: CyoaOption[] | undefined): CyoaOption | undefined => {
  if (!options?.length) {
    return undefined
  }
  return options.find((opt) => opt.rank === 1)
}

export const ContinuationNarrativeStrategy: GenerationStrategy = {
  buildContext: ({
    narrativeId,
    game,
    lastNarrative,
  }: GenerationContextParams): NarrativeContext => {
    const { selectedOptionIndices, choicePointIndex } = parseNarrativeId(narrativeId)
    const lastOptionIndex = selectedOptionIndices[selectedOptionIndices.length - 1]
    const lastOptionSelected = lastNarrative?.options?.[lastOptionIndex]

    if (lastNarrative && lastOptionSelected === undefined) {
      throw new Error('Selected option not found')
    }

    const bestOption = getBestOption(lastNarrative?.options)

    return {
      recap: lastNarrative?.recap ?? 'The game is starting.',
      lastChoiceMade: lastNarrative?.choice ?? '',
      lastOptionSelected: lastOptionSelected?.name ?? '',
      bestOption: bestOption?.name ?? '',
      currentInventory: lastNarrative?.inventory.map((item) => item.name) ?? [],
    }
  },

  shouldGenerate: (existing: NarrativeData | undefined): boolean =>
    !existing?.narrative && !isGenerating(existing?.generationData),
}

export const selectGenerationStrategy = (narrativeId: NarrativeId): GenerationStrategy => {
  const { choicePointIndex } = parseNarrativeId(narrativeId)
  return choicePointIndex === 0 ? InitialNarrativeStrategy : ContinuationNarrativeStrategy
}
