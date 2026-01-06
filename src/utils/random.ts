export const getRandomSample = <T>(
  array: T[],
  count: number,
  withDuplicates = false,
  length?: number,
): T[] => {
  const max = length ?? array.length - 1
  const index = Math.floor(Math.random() * max)
  const value = array[index]

  if (count === 1) {
    return [value]
  } else if (withDuplicates) {
    return [value, ...getRandomSample(array, count - 1, true, max)]
  } else {
    array[index] = array[max]
    return [value, ...getRandomSample(array, count - 1, false, max - 1)]
  }
}
