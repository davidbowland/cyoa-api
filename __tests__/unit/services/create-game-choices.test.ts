import { cyoaGame } from '../__mocks__'
import { createGameChoices, queueGameChoicesGeneration } from '@services/create-game-choices'
import * as dynamodb from '@services/dynamodb'
import * as gameChoices from '@services/games/choices'
import * as narratives from '@services/narratives'
import { GameChoicesGenerationData } from '@types'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/games/choices')
jest.mock('@services/narratives')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('create-game-choices', () => {
  const gameId = 'test-adventure'
  const generationData: GameChoicesGenerationData = {
    gameData: {
      title: 'Test Adventure',
      description: 'A test adventure game',
      outline: 'Test outline',
      characters: [{ name: 'Hero', voice: 'heroic' }],
      inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
      resourceName: 'Health',
      startingResourceValue: 100,
      lossResourceThreshold: 0,
    },
    storyType: {
      name: 'Classic Adventure',
      description: 'A classic adventure story',
      inspirationAuthors: [{ name: 'Test Author', style: 'Test style' }],
    },
    inspirationAuthor: { name: 'Test Author', style: 'Test style' },
    choiceCount: 7,
    image: 'test-adventure/cover.png',
    inventory: [{ name: 'Sword', image: 'test-adventure/inventory/sword' }],
    resourceImage: 'test-adventure/resource.png',
    generationStartTime: 1640995200000,
  }

  beforeAll(() => {
    const gameWith7Choices = {
      ...cyoaGame,
      choicePoints: Array(7).fill(cyoaGame.choicePoints[0]),
    }
    jest.mocked(dynamodb).getGameGenerationData.mockResolvedValue(generationData)
    jest.mocked(dynamodb).setGameById.mockResolvedValue({} as any)
    jest.mocked(dynamodb).setChoicesGenerationStarted.mockResolvedValue(1640995200000)
    jest.mocked(gameChoices).generateGameChoices.mockResolvedValue(gameWith7Choices)
    jest.mocked(narratives).queueNarrativeGeneration.mockResolvedValue(undefined)
    mockLambdaSend.mockResolvedValue({})
  })

  describe('queueGameChoicesGeneration', () => {
    it('should set GenerationStarted, then invoke the choices lambda with gameId and timestamp', async () => {
      await queueGameChoicesGeneration(gameId)

      expect(dynamodb.setChoicesGenerationStarted).toHaveBeenCalledWith(gameId)
      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-choices-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({ gameId, generationStartedAt: 1640995200000 }),
        }),
      )
    })
  })

  describe('createGameChoices', () => {
    it('should read generation data, generate choices, save, and queue narrative', async () => {
      const result = await createGameChoices(gameId)

      expect(dynamodb.getGameGenerationData).toHaveBeenCalledWith('test-adventure')
      expect(gameChoices.generateGameChoices).toHaveBeenCalled()
      expect(dynamodb.setGameById).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          title: 'Test Adventure',
          image: 'test-adventure/cover.png',
          resourceImage: 'test-adventure/resource.png',
          inventory: [{ name: 'Sword', image: 'test-adventure/inventory/sword' }],
          initialChoiceId: 'start',
        }),
      )
      expect(narratives.queueNarrativeGeneration).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({ title: 'Test Adventure' }),
        0,
      )
      expect(result).toEqual({
        game: expect.objectContaining({
          title: 'Test Adventure',
          image: 'test-adventure/cover.png',
          resourceImage: 'test-adventure/resource.png',
        }),
        gameId: 'test-adventure',
      })
    })

    it('should continue when narrative generation fails', async () => {
      jest
        .mocked(narratives)
        .queueNarrativeGeneration.mockRejectedValueOnce(new Error('Narrative error'))

      const result = await createGameChoices(gameId)

      expect(result.gameId).toBe('test-adventure')
      expect(result.game.title).toBe('Test Adventure')
    })

    it('should throw when generateGameChoices fails', async () => {
      jest
        .mocked(gameChoices)
        .generateGameChoices.mockRejectedValueOnce(new Error('Generation failed'))

      await expect(createGameChoices(gameId)).rejects.toThrow('Generation failed')
    })
  })
})
