import { adjectives } from '../assets/adjectives'
import { nouns } from '../assets/nouns'
import { verbs } from '../assets/verbs'
import { inspirationAdjectivesCount, inspirationNounsCount, inspirationVerbsCount } from '../config'

const getRandomSampleLoop = <T>(
  array: T[],
  count: number,
  withDuplicates = false,
  max: number,
): T[] => {
  const index = Math.floor(Math.random() * max)
  const value = array[index]

  if (count === 1) {
    return [value]
  } else if (withDuplicates) {
    return [value, ...getRandomSampleLoop(array, count - 1, true, max)]
  } else {
    array[index] = array[max]
    return [value, ...getRandomSampleLoop(array, count - 1, false, max - 1)]
  }
}

export const getRandomSample = <T>(
  array: T[],
  count: number,
  withDuplicates = false,
  length?: number,
): T[] => getRandomSampleLoop<T>([...array], count, withDuplicates, length ?? array.length - 1)

export const generateInspirationWords = (): string[] => {
  const inspirationNouns = getRandomSample(nouns, inspirationNounsCount)
  const inspirationVerbs = getRandomSample(verbs, inspirationVerbsCount)
  const inspirationAdjectives = getRandomSample(adjectives, inspirationAdjectivesCount)
  return inspirationNouns.concat(inspirationVerbs).concat(inspirationAdjectives)
}
