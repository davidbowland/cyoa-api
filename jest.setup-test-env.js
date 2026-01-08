// DynamoDB

process.env.DYNAMODB_GAMES_TABLE_NAME = 'games-table'
process.env.DYNAMODB_NARRATIVES_TABLE_NAME = 'narratives-table'
process.env.DYNAMODB_PROMPTS_TABLE_NAME = 'prompts-table'

// Lambda

process.env.CREATE_NARRATIVE_FUNCTION_NAME = 'create-narrative-function'

// LLM

process.env.PROMPT_ID_CREATE_GAME = 'create-game'
process.env.PROMPT_ID_CREATE_NARRATIVE = 'create-narrative'
process.env.PROMPT_ID_LOSE_GAME = 'lose-game'
process.env.PROMPT_ID_WIN_GAME = 'win-game'

// Games

process.env.INSPIRATION_ADJECTIVES_COUNT = '2'
process.env.INSPIRATION_NOUNS_COUNT = '2'
process.env.INSPIRATION_VERBS_COUNT = '2'

// Logging

process.env.DEBUG_LOGGING = 'true'
