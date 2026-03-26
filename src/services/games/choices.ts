import Ajv from 'ajv'

import { keyInformationCounts, redHerringCounts } from '../../assets/configurations'
import {
  initialChoiceId,
  promptIdCreateChoices,
  resourceToAddPercentMax,
  resourceToAddPercentMin,
} from '../../config'
import {
  Author,
  CreateChoicesPromptOutput,
  CyoaChoicePoint,
  CyoaGame,
  CyoaGameFormatted,
  GameTheme,
  TextPrompt,
} from '../../types'
import { log } from '../../utils/logging'
import { generateInspirationWords, getRandomSample } from '../../utils/random'
import { invokeModel } from '../bedrock'
import { getPromptById } from '../dynamodb'
import { calculateResourcesForOptions, calculateResourcesToAdd } from './options'

const ajv = new Ajv({ allErrors: true })

const clampResourceRange = (
  choiceCount: number,
  starting: number,
  ending: number,
): { starting: number; ending: number } => {
  const minRange = Math.ceil(choiceCount * 5)
  if (Math.abs(starting - ending) >= minRange) {
    return { starting, ending }
  }
  if (ending === 0) {
    return { starting: minRange, ending }
  } else {
    return { starting: 0, ending: minRange }
  }
}

export const generateGameChoices = async (
  gameData: CyoaGameFormatted,
  storyType: GameTheme,
  inspirationAuthor: Author,
  choiceCount: number,
): Promise<CyoaGame> => {
  const keyInformationCount = getRandomSample(keyInformationCounts, 1)[0]
  const redHerringCount = getRandomSample(redHerringCounts, 1)[0]

  const choicesModelContext = {
    resourceName: gameData.resourceName,
    startingResourceValue: gameData.startingResourceValue,
    lossResourceThreshold: gameData.lossResourceThreshold,
    choiceCount,
    keyInformationCount,
    redHerringCount,
    outline: gameData.outline,
    characters: gameData.characters?.map((c) => c.name),
    inventory: gameData.inventory?.map((i) => i.name),
    style: {
      name: storyType.name,
      description: storyType.description,
      inspirationAuthor: inspirationAuthor.name,
    },
    inspirationWords: generateInspirationWords(),
  }
  log('Creating choices with context', { choicesModelContext })

  const choicesPrompt = await getPromptById<TextPrompt>(promptIdCreateChoices)
  const choicesOutput = await invokeModel<CreateChoicesPromptOutput>(
    choicesPrompt,
    choicesModelContext,
  )
  Object.entries(choicesOutput).map(([key, value]) =>
    log('Choices generated', { [key]: JSON.stringify(value, null, 2) }),
  )

  const filteredChoicesOutput = {
    ...choicesOutput,
    redHerrings: choicesOutput.redHerrings?.filter(
      (item) => !choicesOutput.keyInformation?.includes(item),
    ),
  }

  return formatCreateChoicesOutput(filteredChoicesOutput, gameData, inspirationAuthor)
}

const formatCreateChoicesOutput = (
  input: CreateChoicesPromptOutput,
  gameData: Partial<CyoaGame>,
  inspirationAuthor: Author,
): CyoaGame => {
  const jsonTypeDefinition = {
    type: 'object',
    required: ['keyInformation', 'redHerrings', 'choicePoints', 'winNarrative'],
    properties: {
      keyInformation: {
        type: 'array',
        items: { type: 'string' },
      },
      redHerrings: {
        type: 'array',
        items: { type: 'string' },
      },
      choicePoints: {
        type: 'array',
        items: { type: 'object' },
      },
      winNarrative: { type: 'string', minLength: 1 },
    },
  }
  if (ajv.validate(jsonTypeDefinition, input) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  }

  const choicePoints = input.choicePoints as CyoaChoicePoint[]
  const { starting, ending } = clampResourceRange(
    choicePoints.length,
    gameData.startingResourceValue as number,
    gameData.lossResourceThreshold as number,
  )

  const choicePointsWithResources = choicePoints.map((choicePoint, index) => {
    const resourcePercent = calculateResourcesToAdd(
      index,
      choicePoints.length,
      resourceToAddPercentMin,
      resourceToAddPercentMax,
    )
    const optionsWithResources = calculateResourcesForOptions(
      getRandomSample(choicePoint.options, choicePoint.options.length),
      choicePoints.length,
      starting,
      ending,
      resourcePercent,
    )
    return {
      ...choicePoint,
      options: optionsWithResources,
    }
  })

  return {
    ...gameData,
    keyInformation: input.keyInformation as string[],
    redHerrings: input.redHerrings as string[],
    startingResourceValue: starting,
    lossResourceThreshold: ending,
    choicePoints: choicePointsWithResources,
    inspirationAuthor,
    initialChoiceId,
    winNarrative: input.winNarrative as string,
  } as CyoaGame
}
