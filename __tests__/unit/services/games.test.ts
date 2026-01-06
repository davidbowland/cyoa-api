import { cyoaGame, prompt } from '../__mocks__'
import * as bedrock from '@services/bedrock'
import * as dynamodb from '@services/dynamodb'
import { createGame } from '@services/games'
import { CreateGamePromptOutput } from '@types'

jest.mock('@services/bedrock')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('games', () => {
  const mockMathRandom = jest.fn()
  const mockChoice = {
    inventoryToIntroduce: ['Sword'],
    keyInformationToIntroduce: ['Important clue 1'],
    redHerringsToIntroduce: ['False clue 1'],
    inventoryOrInformationConsumed: [],
    choice: 'What do you do?',
    options: [
      { name: 'Fight', resourcesToAdd: -10 },
      { name: 'Run', resourcesToAdd: 0 },
    ],
  }
  const mockGeneratedGame: CreateGamePromptOutput = {
    title: 'Test Adventure',
    description: 'A test adventure game',
    titleImageDescription: 'A mysterious forest path',
    outline: 'Test outline',
    characters: [{ name: 'Hero', imageDescription: 'A brave hero', voice: 'heroic' }],
    inventory: [{ name: 'Sword', imageDescription: 'A sharp sword' }],
    keyInformation: ['Important clue 1', 'Important clue 2'],
    redHerrings: ['False clue 1', 'False clue 2'],
    resourceName: 'Health',
    startingResourceValue: 100,
    lossResourceThreshold: 0,
    choicePoints: Array(10).fill(mockChoice),
  }

  beforeAll(() => {
    Math.random = mockMathRandom
    mockMathRandom.mockReturnValue(0)

    jest.mocked(bedrock).invokeModel.mockResolvedValue(mockGeneratedGame)
    jest.mocked(dynamodb).getGames.mockResolvedValue([])
    jest.mocked(dynamodb).getPromptById.mockResolvedValue(prompt)
    jest.mocked(dynamodb).setGameById.mockResolvedValue({} as any)
    jest.mocked(dynamodb).getGameById.mockRejectedValue(new Error('Game not found'))
  })

  describe('createGame', () => {
    it('should create a game successfully', async () => {
      const result = await createGame()

      expect(dynamodb.getGames).toHaveBeenCalledWith()
      expect(dynamodb.getPromptById).toHaveBeenCalledWith('create-cyoa-game')
      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          storyType: expect.objectContaining({
            name: 'Classic Adventure',
            description: expect.any(String),
          }),
          existingGameTitles: [],
          choiceCount: 10,
          lossCondition: 'accumulate',
          inventoryCount: 0,
          keyInformationCount: 3,
          redHerringCount: 3,
          inspirationWords: expect.arrayContaining(['time', 'be', 'good']),
        }),
      )
      expect(dynamodb.getGameById).toHaveBeenCalledWith('test-adventure')
      expect(dynamodb.setGameById).toHaveBeenCalledWith(
        'test-adventure',
        expect.objectContaining({
          title: 'Test Adventure',
          choicePoints: expect.arrayContaining([expect.any(Object)]),
        }),
      )
      expect(result).toEqual({
        game: expect.objectContaining({
          title: 'Test Adventure',
          choicePoints: expect.arrayContaining([expect.any(Object)]),
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

      expect(bedrock.invokeModel).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          existingGameTitles: ['Existing Game 1', 'Existing Game 2'],
        }),
      )
    })

    it('should throw error when wrong number of choice points generated', async () => {
      const gameWithWrongChoiceCount: CreateGamePromptOutput = {
        ...mockGeneratedGame,
        choicePoints: [],
      }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(gameWithWrongChoiceCount)

      await expect(createGame()).rejects.toThrow('Wrong number of choice points')
    })

    it('should throw error when game ID already exists', async () => {
      jest.mocked(dynamodb).getGameById.mockResolvedValueOnce(cyoaGame)

      await expect(createGame()).rejects.toThrow('Game ID already exists')
    })

    it('should handle formatting errors', async () => {
      const invalidGeneratedGame: CreateGamePromptOutput = {
        ...mockGeneratedGame,
        title: '',
      }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(invalidGeneratedGame)

      await expect(createGame()).rejects.toThrow()
    })

    it('should handle bedrock service errors', async () => {
      jest.mocked(bedrock).invokeModel.mockRejectedValueOnce(new Error('Bedrock error'))

      await expect(createGame()).rejects.toThrow('Bedrock error')
    })

    it('should handle dynamodb errors', async () => {
      jest.mocked(dynamodb).setGameById.mockRejectedValueOnce(new Error('DynamoDB error'))

      await expect(createGame()).rejects.toThrow('DynamoDB error')
    })

    it('should generate unique game ID using slugify', async () => {
      const gameWithSpecialTitle: CreateGamePromptOutput = {
        ...mockGeneratedGame,
        title: 'A Special Adventure!',
      }
      jest.mocked(bedrock).invokeModel.mockResolvedValueOnce(gameWithSpecialTitle)

      const result = await createGame()

      expect(dynamodb.getGameById).toHaveBeenCalledWith('a-special-adventure!')
      expect(dynamodb.setGameById).toHaveBeenCalledWith(
        'a-special-adventure!',
        expect.objectContaining({
          title: 'A Special Adventure!',
        }),
      )
      expect(result).toEqual({
        game: expect.objectContaining({
          title: 'A Special Adventure!',
        }),
        gameId: 'a-special-adventure!',
      })
    })
  })
})
