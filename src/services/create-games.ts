import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { choiceCounts } from '../assets/configurations'
import { createGameChoicesFunctionName } from '../config'
import {
  CyoaGame,
  CyoaGameFormatted,
  CyoaInventory,
  GameChoicesGenerationData,
  GameId,
} from '../types'
import { log, xrayCapture } from '../utils/logging'
import { getRandomSample } from '../utils/random'
import { slugify } from '../utils/slugify'
import { getGameById, getGames, setGameGenerationData } from './dynamodb'
import {
  generateGameCoverImage,
  generateInventoryImages,
  generateResourceImage,
} from './games/game-image-generation'
import { generateGameOutline } from './games/outlines'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

const validateGameId = async (gameId: GameId): Promise<void> => {
  const gameIdExists = await getGameById(gameId)
    .then(() => true)
    .catch(() => false)
  if (gameIdExists) {
    log('Game ID already exists', { gameId })
    throw new Error('Game ID already exists')
  }
}

const generateGameImages = async (
  gameId: GameId,
  gameData: CyoaGameFormatted,
  coverImageDescription: string,
  resourceImageDescription: string,
): Promise<Partial<CyoaGame>> => {
  const [coverImageData, inventoryImageData, resourceImageData] = await Promise.all([
    generateGameCoverImage(gameId, coverImageDescription),
    generateInventoryImages(gameId, gameData.inventory),
    generateResourceImage(gameId, resourceImageDescription),
  ])

  return {
    image: coverImageData,
    inventory: inventoryImageData,
    resourceImage: resourceImageData,
  }
}

export const createGame = async (): Promise<{ gameId: GameId }> => {
  const existingGames = await getGames()
  const existingGameTitles = existingGames.map((existingGame) => existingGame.game.title)

  const choiceCount = getRandomSample(choiceCounts, 1)[0]

  const {
    game: gameData,
    imageDescription,
    inspirationAuthor,
    resourceImageDescription,
    storyType,
  } = await generateGameOutline(existingGameTitles, choiceCount)

  const gameId: GameId = slugify(gameData.title)
  await validateGameId(gameId)

  const imageData = await generateGameImages(
    gameId,
    gameData,
    imageDescription,
    resourceImageDescription,
  )

  const generationData: GameChoicesGenerationData = {
    gameData,
    storyType,
    inspirationAuthor,
    choiceCount,
    image: imageData.image,
    inventory: imageData.inventory as CyoaInventory[],
    resourceImage: imageData.resourceImage,
  }
  await setGameGenerationData(gameId, generationData)

  const command = new InvokeCommand({
    FunctionName: createGameChoicesFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId }),
  })
  await lambda.send(command)
  log('Game choices generation queued', { gameId })

  return { gameId }
}
