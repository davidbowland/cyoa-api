import { cyoaGame } from '../__mocks__'
import { createGame } from '@services/create-games'
import * as dynamodb from '@services/dynamodb'
import * as gameImageGeneration from '@services/games/game-image-generation'
import * as gameOutlines from '@services/games/outlines'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/dynamodb')
jest.mock('@services/games/game-image-generation')
jest.mock('@services/games/outlines')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('create-games', () => {
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0)

    jest.mocked(dynamodb).getGames.mockResolvedValue([])
    jest.mocked(dynamodb).getGameById.mockRejectedValue(new Error('Game not found'))
    jest.mocked(dynamodb).setGameGenerationData.mockResolvedValue({} as any)
    jest.mocked(gameOutlines).generateGameOutline.mockResolvedValue({
      game: {
        title: 'Test Adventure',
        description: 'A test adventure game',
        outline: 'Test outline',
        characters: [{ name: 'Hero', voice: 'heroic' }],
        inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
        resourceName: 'Health',
        startingResourceValue: 100,
        lossResourceThreshold: 0,
      },
      imageDescription: 'A mysterious forest path',
      resourceImageDescription: 'A glowing health orb',
      storyType: {
        name: 'Classic Adventure',
        description: 'A classic adventure story',
        inspirationAuthors: [{ name: 'Test Author', style: 'Test style' }],
      },
      inspirationAuthor: { name: 'Test Author', style: 'Test style' },
    })
    jest
      .mocked(gameImageGeneration)
      .generateGameCoverImage.mockResolvedValue('test-adventure/cover.png')
    jest
      .mocked(gameImageGeneration)
      .generateInventoryImages.mockResolvedValue([
        { name: 'Sword', image: 'test-adventure/inventory/sword' },
      ])
    jest
      .mocked(gameImageGeneration)
      .generateResourceImage.mockResolvedValue('test-adventure/resource.png')
    mockLambdaSend.mockResolvedValue({})
  })

  describe('createGame', () => {
    it('should generate outline, images, store generation data, and invoke choices lambda', async () => {
      const result = await createGame()

      expect(dynamodb.getGames).toHaveBeenCalledWith()
      expect(gameOutlines.generateGameOutline).toHaveBeenCalledWith([], 7)
      expect(dynamodb.getGameById).toHaveBeenCalledWith('test-adventure')
      expect(gameImageGeneration.generateGameCoverImage).toHaveBeenCalledWith(
        'test-adventure',
        'A mysterious forest path',
      )
      expect(gameImageGeneration.generateInventoryImages).toHaveBeenCalledWith('test-adventure', [
        { name: 'Sword', imageDescription: 'A sharp sword' },
      ])
      expect(gameImageGeneration.generateResourceImage).toHaveBeenCalledWith(
        'test-adventure',
        'A glowing health orb',
      )
      expect(dynamodb.setGameGenerationData).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          gameData: expect.objectContaining({ title: 'Test Adventure' }),
          storyType: expect.objectContaining({ name: 'Classic Adventure' }),
          inspirationAuthor: expect.objectContaining({ name: 'Test Author' }),
          choiceCount: 7,
          image: 'test-adventure/cover.png',
          inventory: [{ name: 'Sword', image: 'test-adventure/inventory/sword' }],
          resourceImage: 'test-adventure/resource.png',
        }),
      )
      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-choices-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({ gameId: 'test-adventure' }),
        }),
      )
      expect(result).toEqual({ gameId: 'test-adventure' })
    })

    it('should include existing game titles in context', async () => {
      jest.mocked(dynamodb).getGames.mockResolvedValueOnce([
        { gameId: 'game1', game: { ...cyoaGame, title: 'Existing Game 1' } },
        { gameId: 'game2', game: { ...cyoaGame, title: 'Existing Game 2' } },
      ])

      await createGame()

      expect(gameOutlines.generateGameOutline).toHaveBeenCalledWith(
        ['Existing Game 1', 'Existing Game 2'],
        7,
      )
    })

    it('should throw error when game ID already exists', async () => {
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(cyoaGame)

      await expect(createGame()).rejects.toThrow('Game ID already exists')
    })

    it('should continue when cover image generation fails', async () => {
      jest.mocked(gameImageGeneration).generateGameCoverImage.mockResolvedValueOnce(undefined)

      const result = await createGame()

      expect(dynamodb.setGameGenerationData).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          image: undefined,
        }),
      )
      expect(result).toEqual({ gameId: 'test-adventure' })
    })

    it('should continue when resource image generation fails', async () => {
      jest.mocked(gameImageGeneration).generateResourceImage.mockResolvedValueOnce(undefined)

      const result = await createGame()

      expect(dynamodb.setGameGenerationData).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          resourceImage: undefined,
        }),
      )
      expect(result).toEqual({ gameId: 'test-adventure' })
    })
  })
})
