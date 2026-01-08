import { promptIdCreateNarrative, promptIdLoseGame, promptIdWinGame } from '../config'
import { CyoaGame, PromptId } from '../types'
import { isGameLost, isGameWon, parseNarrativeId } from '../utils/narratives'

export const selectPromptId = (
  game: CyoaGame,
  narrativeId: string,
  currentResourceValue: number,
): PromptId => {
  if (isGameLost(game, currentResourceValue)) {
    return promptIdLoseGame
  }

  const { choicePointIndex } = parseNarrativeId(narrativeId)
  if (isGameWon(game, choicePointIndex)) {
    return promptIdWinGame
  }

  return promptIdCreateNarrative
}
