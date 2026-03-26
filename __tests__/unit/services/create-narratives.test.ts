import { cyoaGame, cyoaNarrative, gameId, narrativeGenerationData, narrativeId } from '../__mocks__'
import { createNarrative } from '@services/create-narratives'
import * as dynamodb from '@services/dynamodb'
import * as endingNarrativeContent from '@services/narratives/ending-narrative-content'
import * as narrativeContent from '@services/narratives/narrative-content'
import * as narrativeImageGeneration from '@services/narratives/narrative-image-generation'

jest.mock('@services/dynamodb')
jest.mock('@services/narratives/ending-narrative-content')
jest.mock('@services/narratives/narrative-content')
jest.mock('@services/narratives/narrative-image-generation')
jest.mock('@utils/logging')

describe('create-narratives', () => {
  beforeAll(() => {
    jest.mocked(dynamodb).getGameById.mockResolvedValue(cyoaGame)
    jest.mocked(narrativeContent).generateNarrativeContent.mockResolvedValue({
      narrative: cyoaNarrative,
      imageDescription: 'A dark cave with a massive sleeping dragon surrounded by treasure',
    })
    jest
      .mocked(narrativeImageGeneration)
      .generateNarrativeImage.mockResolvedValue(
        'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      )
    jest.mocked(dynamodb).setNarrativeById.mockResolvedValue(undefined)
  })

  describe('createNarrative', () => {
    it('creates narrative successfully', async () => {
      const result = await createNarrative(gameId, narrativeId, narrativeGenerationData)

      expect(dynamodb.getGameById).toHaveBeenCalledWith(gameId)
      expect(narrativeContent.generateNarrativeContent).toHaveBeenCalledWith(
        cyoaGame,
        narrativeGenerationData,
      )
      expect(narrativeImageGeneration.generateNarrativeImage).toHaveBeenCalledWith(
        gameId,
        narrativeId,
        'A dark cave with a massive sleeping dragon surrounded by treasure',
      )
      expect(dynamodb.setNarrativeById).toHaveBeenCalledWith(gameId, narrativeId, {
        ...cyoaNarrative,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
      expect(result).toEqual({
        ...cyoaNarrative,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
    })

    it('creates narrative with undefined image when image generation fails', async () => {
      jest.mocked(narrativeImageGeneration).generateNarrativeImage.mockResolvedValueOnce(undefined)

      const result = await createNarrative(gameId, narrativeId, narrativeGenerationData)

      expect(dynamodb.setNarrativeById).toHaveBeenCalledWith(gameId, narrativeId, {
        ...cyoaNarrative,
        image: undefined,
      })
      expect(result.image).toBeUndefined()
    })

    it('creates ending narrative when nextChoice is undefined', async () => {
      const endingGenerationData = { ...narrativeGenerationData, nextChoice: undefined }
      const endingNarrative = {
        ...cyoaNarrative,
        choice: undefined,
        options: [],
        inventory: [],
        losingTitle: '',
        losingNarrative: '',
      }
      jest.mocked(endingNarrativeContent).generateEndingNarrativeContent.mockResolvedValueOnce({
        narrative: endingNarrative,
        imageDescription: 'A triumphant hero standing in golden sunlight',
      })

      const result = await createNarrative(gameId, narrativeId, endingGenerationData)

      expect(endingNarrativeContent.generateEndingNarrativeContent).toHaveBeenCalledWith(
        cyoaGame,
        endingGenerationData,
      )
      expect(result).toEqual({
        ...endingNarrative,
        image: 'https://cyoa-assets.dbowland.com/images/a-friendly-adventure/test-narrative-id.png',
      })
    })
  })
})
