import { GameTheme } from '../types'

export const gameThemes: GameTheme[] = [
  {
    name: 'Classic Adventure',
    description:
      'Focuses on exciting journeys, exploration, and external conflicts like treasure hunts or rescue missions.',
    inspirationAuthors: [
      {
        name: 'Robert Louis Stevenson',
        style:
          'Vivid, romantic prose with swashbuckling action and moral clarity. Focuses on honor, courage, and the thrill of discovery.',
      },
      {
        name: 'Jules Verne',
        style:
          'Scientific wonder and meticulous detail. Optimistic exploration with technical accuracy and sense of possibility.',
      },
      {
        name: 'H. Rider Haggard',
        style:
          'Exotic locales and lost civilizations. Victorian sensibilities with mysterious ancient cultures and treasure.',
      },
      {
        name: 'Arthur Conan Doyle',
        style:
          'Analytical adventurer combining reason with action. Clear prose with scientific observation and British pluck.',
      },
    ],
  },
  {
    name: 'Survival',
    description:
      'The main character is placed in a dangerous environment, and choices determine whether they survive.',
    inspirationAuthors: [
      {
        name: 'Jack London',
        style:
          'Raw, naturalistic writing emphasizing harsh environments and primal struggle. Unflinching about danger and the fight to live.',
      },
      {
        name: 'Ernest Hemingway',
        style:
          'Sparse, declarative sentences with "iceberg theory" - what\'s unsaid matters. Stoic characters facing nature with grace under pressure.',
      },
      {
        name: 'Cormac McCarthy',
        style:
          'Biblical, apocalyptic tone with no quotation marks. Harsh beauty in brutal landscapes, philosophical undercurrents.',
      },
      {
        name: 'Daniel Defoe',
        style:
          'Practical, detailed accounting of survival methods. Resourceful problem-solving with journal-like documentation.',
      },
    ],
  },
  {
    name: 'Mystery/Thriller',
    description:
      'Involves solving a puzzle or crime, where choices lead to discovering clues and finding the truth.',
    inspirationAuthors: [
      {
        name: 'Agatha Christie',
        style:
          'Clever plotting with careful clue placement. Measured pacing that builds tension while maintaining clarity and logical deduction.',
      },
      {
        name: 'Arthur Conan Doyle',
        style:
          'Precise deductive reasoning and keen observation. Victorian logic with dramatic reveals and scientific method.',
      },
      {
        name: 'Raymond Chandler',
        style:
          'Noir atmosphere with cynical wit. Hard-boiled metaphors, morally gray characters, and urban decay.',
      },
      {
        name: 'Dashiell Hammett',
        style:
          'Terse, objective prose with tough dialogue. Sparse descriptions letting action and conversation drive the story.',
      },
      {
        name: 'Dorothy L. Sayers',
        style:
          'Intellectual puzzles with literary flair. Witty, educated characters navigating both society and crime.',
      },
    ],
  },
  {
    name: 'Science Fiction',
    description:
      'Stories set in the future or on other planets, exploring technology, space travel, or dystopian futures.',
    inspirationAuthors: [
      {
        name: 'Isaac Asimov',
        style:
          'Clear, idea-driven prose exploring technological and social implications. Emphasizes logical problem-solving and wonder at possibility.',
      },
      {
        name: 'Philip K. Dick',
        style:
          'Paranoid, reality-questioning narratives. Explores identity, consciousness, and "what is real?" with unsettling implications.',
      },
      {
        name: 'Arthur C. Clarke',
        style:
          "Sense of cosmic wonder and deep time. Optimistic about technology with philosophical musings on humanity's place in universe.",
      },
      {
        name: 'Ursula K. Le Guin',
        style:
          'Anthropological approach to alien cultures. Thoughtful, humanistic exploration of society, gender, and psychology.',
      },
      {
        name: 'Ray Bradbury',
        style:
          'Poetic, lyrical prose with nostalgic undertones. Emotional and metaphorical approach to sci-fi concepts.',
      },
    ],
  },
  {
    name: 'Historical Fiction',
    description:
      'Set in real historical periods, weaving choices through actual events, cultural details, and period-appropriate challenges.',
    inspirationAuthors: [
      {
        name: 'Alexandre Dumas',
        style:
          'Energetic storytelling blending historical events with adventure and intrigue. Dramatic dialogue, larger-than-life characters, and swift pacing.',
      },
      {
        name: "Patrick O'Brian",
        style:
          'Meticulous nautical and period detail with dry wit. Precise language evoking the age of sail with technical authenticity.',
      },
      {
        name: 'Hilary Mantel',
        style:
          "Immersive present-tense immediacy with psychological depth. Gets inside historical figures' minds with modern accessibility.",
      },
      {
        name: 'Bernard Cornwell',
        style:
          'Military action with gritty realism. Second-person perspective putting reader in the battle with historical accuracy.',
      },
    ],
  },
  {
    name: 'Horror/Nightmare',
    description: 'Designed to be scary, with choices leading to gruesome or unsettling endings.',
    inspirationAuthors: [
      {
        name: 'Edgar Allan Poe',
        style:
          'Gothic atmosphere with psychological dread. Ornate language building claustrophobic tension and exploring the darkness of the human mind.',
      },
      {
        name: 'H.P. Lovecraft',
        style:
          'Cosmic horror and antiquarian diction. Emphasis on the unknowable, with protagonists facing sanity-breaking revelations.',
      },
      {
        name: 'Shirley Jackson',
        style:
          'Subtle psychological horror with domestic uncanny. Creeping dread through seemingly normal situations turning sinister.',
      },
      {
        name: 'Stephen King',
        style:
          'Accessible, character-driven modern horror. Everyday people in extraordinary situations with emotional authenticity.',
      },
      {
        name: 'Algernon Blackwood',
        style:
          'Atmospheric nature-based horror. Subtle, building dread with emphasis on the supernatural lurking in wilderness.',
      },
    ],
  },
  {
    name: 'Comedy/Parody',
    description:
      'Uses the CYOA format for humor, spoofing genre tropes and featuring absurd situations.',
    inspirationAuthors: [
      {
        name: 'P.G. Wodehouse',
        style:
          'Lighthearted absurdity with impeccable timing. Playful language, ridiculous situations treated with complete seriousness, and gentle satire.',
      },
      {
        name: 'Douglas Adams',
        style:
          'Absurdist sci-fi with satirical edge. Philosophical tangents, unexpected comparisons, and deadpan delivery of cosmic absurdity.',
      },
      {
        name: 'Terry Pratchett',
        style:
          'Satirical fantasy with humanistic warmth. Clever wordplay, footnotes, and using fantasy tropes to comment on real world.',
      },
      {
        name: 'Kurt Vonnegut',
        style:
          'Dark humor with simple, direct sentences. Metafictional elements and tragicomic view of human folly.',
      },
      {
        name: 'Oscar Wilde',
        style:
          'Witty epigrammatic dialogue with social satire. Elegant paradoxes and verbal sparring with sharp observations.',
      },
    ],
  },
]

export const choiceCounts: number[] = [7, 8, 8, 10, 10, 10, 10, 12, 12, 12, 15]

export const inventoryCounts: number[] = [0, 0, 0, 2, 3, 5]

export const keyInformationCounts: number[] = [1, 1, 1, 2, 3, 3, 4]

export const redHerringCounts: number[] = [0, 1, 1, 2, 2, 3]

export const lossConditions: string[] = ['accumulate', 'reduce']
