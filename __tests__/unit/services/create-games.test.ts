import { cyoaGame } from '../__mocks__'
import { createGame } from '@services/create-games'
import * as dynamodb from '@services/dynamodb'
import * as gameChoices from '@services/games/choices'
import * as gameImageGeneration from '@services/games/game-image-generation'
import * as gameOutlines from '@services/games/outlines'
import * as narratives from '@services/narratives'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@services/games/choices')
jest.mock('@services/games/game-image-generation')
jest.mock('@services/games/outlines')
jest.mock('@services/narratives')
jest.mock('@utils/logging')

describe('create-games', () => {
  const mockMathRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0)

    jest.mocked(dynamodb).getGames.mockResolvedValue([])
    jest.mocked(dynamodb).setGameById.mockResolvedValue({} as any)
    jest.mocked(dynamodb).getGameById.mockRejectedValue(new Error('Game not found'))
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
    const gameWith7Choices = {
      ...cyoaGame,
      choicePoints: Array(7).fill(cyoaGame.choicePoints[0]),
    }
    jest.mocked(gameChoices).generateGameChoices.mockResolvedValue(gameWith7Choices)
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
    jest.mocked(narratives).queueNarrativeGeneration.mockResolvedValue(undefined)
  })

  describe('createGame', () => {
    it('should create a game successfully', async () => {
      const result = await createGame()

      expect(dynamodb.getGames).toHaveBeenCalledWith()
      expect(gameOutlines.generateGameOutline).toHaveBeenCalledWith([], 7)
      expect(gameChoices.generateGameChoices).toHaveBeenCalled()
      expect(dynamodb.getGameById).toHaveBeenCalledWith('test-adventure')
      expect(gameImageGeneration.generateGameCoverImage).toHaveBeenCalledWith(
        'test-adventure',
        'A mysterious forest path',
      )
      expect(gameImageGeneration.generateInventoryImages).toHaveBeenCalledWith(
        'test-adventure',
        cyoaGame.inventory,
      )
      expect(gameImageGeneration.generateResourceImage).toHaveBeenCalledWith(
        'test-adventure',
        'A glowing health orb',
      )
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

    // it('should throw error when wrong number of choice points generated', async () => {
    //   jest.mocked(gameChoices).generateGameChoices.mockResolvedValueOnce({
    //     ...cyoaGame,
    //     choicePoints: [],
    //   })

    //   await expect(createGame()).rejects.toThrow('Wrong number of choice points')
    // })

    it('should throw error when game ID already exists', async () => {
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(cyoaGame)

      await expect(createGame()).rejects.toThrow('Game ID already exists')
    })

    it('should continue when narrative generation fails', async () => {
      jest
        .mocked(narratives)
        .queueNarrativeGeneration.mockRejectedValueOnce(new Error('Narrative error'))

      const result = await createGame()

      expect(result.gameId).toBe('test-adventure')
      expect(result.game.title).toBe('Test Adventure')
    })

    it('should continue when cover image generation fails', async () => {
      jest.mocked(gameImageGeneration).generateGameCoverImage.mockResolvedValueOnce(undefined)

      const result = await createGame()

      expect(dynamodb.setGameById).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          title: 'Test Adventure',
          image: undefined,
        }),
      )
      expect(result.game.image).toBeUndefined()
    })

    it('should continue when resource image generation fails', async () => {
      jest.mocked(gameImageGeneration).generateResourceImage.mockResolvedValueOnce(undefined)

      const result = await createGame()

      expect(dynamodb.setGameById).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          title: 'Test Adventure',
          resourceImage: undefined,
        }),
      )
      expect(result.game.resourceImage).toBeUndefined()
    })
  })
})
