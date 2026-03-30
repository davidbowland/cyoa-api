import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createNarrativeFunctionName } from '../config'
import { CyoaGame, GameId, NarrativeGenerationData } from '../types'
import { log, xrayCapture } from '../utils/logging'
import { getNarrativeIdByIndex } from '../utils/narratives'
import { setNarrativeGenerationData, setNarrativeGenerationStarted } from './dynamodb'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const queueNarrativeGeneration = async (
  gameId: GameId,
  game: CyoaGame,
  choiceIndex: number,
): Promise<void> => {
  const currentChoice = game.choicePoints[choiceIndex]
  const lastChoice = game.choicePoints[choiceIndex - 1]
  const narrativeId = getNarrativeIdByIndex(choiceIndex)

  const generationData: NarrativeGenerationData = {
    inventoryAvailable: currentChoice?.inventoryAvailable ?? [],
    existingNarrative: currentChoice?.choiceNarrative ?? '',
    previousNarrative: lastChoice?.choiceNarrative,
    previousChoice: lastChoice?.choice,
    previousOptions: lastChoice?.options,
    nextChoice: currentChoice?.choice,
    nextOptions: currentChoice?.options,
    outline: game.outline,
    lossNarrative: currentChoice?.lossNarrative ?? '',
    inspirationAuthor: game.inspirationAuthor,
    generationStartTime: Date.now(),
  }
  await setNarrativeGenerationData(gameId, narrativeId, generationData)

  const generationStartedAt = await setNarrativeGenerationStarted(gameId, narrativeId)

  // Invoke create-narrative lambda asynchronously
  const command = new InvokeCommand({
    FunctionName: createNarrativeFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId, narrativeId, generationStartedAt }),
  })
  await lambda.send(command)
  log('Narrative generation queued', { gameId, narrativeId })
}
