import { CyoaGame, CyoaNarrative, GameId, NarrativeGenerationData, NarrativeId } from '../types'
import { getGameById, setNarrativeById } from './dynamodb'
import { generateEndingNarrativeContent } from './narratives/ending-narrative-content'
import { generateNarrativeContent } from './narratives/narrative-content'
import { generateNarrativeImage } from './narratives/narrative-image-generation'

const generateNextNarrative = async (game: CyoaGame, generationData: NarrativeGenerationData) => {
  if (generationData.nextChoice === undefined) {
    return generateEndingNarrativeContent(game, generationData)
  }
  return await generateNarrativeContent(game, generationData)
}

export const createNarrative = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  generationData: NarrativeGenerationData,
): Promise<CyoaNarrative> => {
  const game = await getGameById(gameId)

  const { narrative, imageDescription } = await generateNextNarrative(game, generationData)

  const narrativeImage = await generateNarrativeImage(gameId, narrativeId, imageDescription)
  const narrativeWithImage = { ...narrative, image: narrativeImage }
  await setNarrativeById(gameId, narrativeId, narrativeWithImage)

  return narrativeWithImage
}
