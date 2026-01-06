import { CyoaGame, CyoaGameSerialized } from '../types'

export const serializeCyoaGame = (game: CyoaGame): CyoaGameSerialized => ({
  description: game.description,
  image: game.image,
  resourceName: game.resourceName,
  title: game.title,
})
