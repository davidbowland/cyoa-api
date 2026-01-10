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
  currentResourceValue: number
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
    currentResourceValue: game.startingResourceValue,
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
    const { optionId } = parseNarrativeId(narrativeId)
    const lastOptionSelected = lastNarrative?.options?.[optionId]

    if (lastNarrative && !lastOptionSelected) {
      throw new Error('Selected option not found')
    }

    const bestOption = getBestOption(lastNarrative?.options)
    const currentResourceValue =
      lastNarrative && lastOptionSelected
        ? lastNarrative.currentResourceValue + lastOptionSelected.resourcesToAdd
        : game.startingResourceValue

    return {
      recap: lastNarrative?.recap ?? 'The game is starting.',
      currentResourceValue,
      lastChoiceMade: lastNarrative?.choice ?? '',
      lastOptionSelected: lastOptionSelected?.name ?? '',
      bestOption: bestOption?.name ?? '',
      currentInventory: lastNarrative?.inventory.map((item) => item.name) ?? [],
    }
  },

  shouldGenerate: (existing: NarrativeData | undefined): boolean =>
    !existing?.narrative && !isGenerating(existing?.generationData),
}

export const selectGenerationStrategy = (narrativeId: NarrativeId): GenerationStrategy =>
  narrativeId.includes('-') ? ContinuationNarrativeStrategy : InitialNarrativeStrategy
