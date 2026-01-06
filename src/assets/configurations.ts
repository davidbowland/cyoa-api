import { GameTheme } from '../types'

export const gameThemes: GameTheme[] = [
  {
    name: 'Classic Adventure',
    description:
      'Focuses on exciting journeys, exploration, and external conflicts like treasure hunts or rescue missions.',
  },
  {
    name: 'Survival',
    description:
      'The main character is placed in a dangerous environment (like a strange land or a post-apocalyptic world), and the choices determine if they survive.',
  },
  {
    name: 'Mystery/Thriller',
    description:
      'Involves solving a puzzle or a crime, where choices lead to discovering clues and finding the truth.',
  },
  {
    name: 'Science Fiction',
    description:
      'Stories are set in the future or on other planets, often exploring technology, space travel, or dystopian futures.',
  },
  {
    name: 'Urban Fantasy',
    description: 'Blends magical or mythical elements into a contemporary, real-world setting.',
  },
  {
    name: 'Horror/Nightmare',
    description: 'Designed to be scary, with choices leading to gruesome or unsettling endings.',
  },
  {
    name: 'Comedy/Parody',
    description:
      'Uses the CYOA format for humor, often spoofing genre tropes and featuring absurd situations.',
  },
]

export const choiceCounts: number[] = [
  10, 10, 11, 12, 12, 12, 12, 13, 13, 14, 15, 15, 15, 16, 16, 17, 18,
]

export const inventoryCounts: number[] = [0, 0, 0, 0, 0, 3, 6, 8, 12]

export const keyInformationCounts: number[] = [3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 8]

export const redHerringCounts: number[] = [3, 3, 5, 5, 5, 7, 8, 9]

export const lossConditions: string[] = ['accumulate', 'reduce']
