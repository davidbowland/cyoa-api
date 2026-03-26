export const calculateResourcesToAdd = (
  choiceNumber: number,
  choiceCount: number,
  resourceToAddPercentMin: number,
  resourceToAddPercentMax: number,
): number => {
  const resourcesToAddRange = resourceToAddPercentMax - resourceToAddPercentMin
  const increaseForChoiceNumber = (resourcesToAddRange * choiceNumber) / choiceCount
  return increaseForChoiceNumber + resourceToAddPercentMin
}

interface OptionWithRank {
  name: string
  rank: number
  consequence: string
}

export const calculateResourcesForOptions = (
  options: OptionWithRank[],
  choiceCount: number,
  startingResourceValue: number,
  lossResourceThreshold: number,
  resourcePercent: number,
): Array<OptionWithRank & { resourcesToAdd: number }> => {
  const range = Math.abs(lossResourceThreshold - startingResourceValue)
  const multiplier = Math.sign(lossResourceThreshold - startingResourceValue) || 1
  const choiceRange = Math.max(range / choiceCount, 1)
  const percentRange = resourcePercent / options.length

  return options.map((o) => {
    const percent = percentRange * o.rank - Math.random() * percentRange
    const randomRange = Math.max(Math.ceil(percent * choiceRange), 1)
    return {
      name: o.name,
      rank: o.rank,
      consequence: o.consequence,
      resourcesToAdd: randomRange * multiplier,
    }
  })
}
