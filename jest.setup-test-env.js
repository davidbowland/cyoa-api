// DynamoDB

process.env.DYNAMODB_GAMES_TABLE_NAME = 'games-table'
process.env.DYNAMODB_NARRATIVES_TABLE_NAME = 'narratives-table'
process.env.DYNAMODB_PROMPTS_TABLE_NAME = 'prompts-table'

// Lambda

process.env.CREATE_NARRATIVE_FUNCTION_NAME = 'create-narrative-function'

// LLM

process.env.PROMPT_ID_COVER_IMAGE = 'cover-image'
process.env.PROMPT_ID_CREATE_CHOICES = 'create-choices'
process.env.PROMPT_ID_CREATE_ENDING_NARRATIVE = 'create-ending-narrative'
process.env.PROMPT_ID_CREATE_GAME = 'create-game'
process.env.PROMPT_ID_CREATE_NARRATIVE = 'create-narrative'
process.env.PROMPT_ID_CREATE_OPTION_NARRATIVE = 'create-option-narrative'
process.env.PROMPT_ID_INVENTORY_IMAGE = 'inventory-image'
process.env.PROMPT_ID_NARRATIVE_IMAGE = 'narrative-image'
process.env.PROMPT_ID_RESOURCE_IMAGE = 'resource-image'

// Games

process.env.INSPIRATION_ADJECTIVES_COUNT = '2'
process.env.INSPIRATION_NOUNS_COUNT = '2'
process.env.INSPIRATION_VERBS_COUNT = '2'
process.env.RESOURCE_TO_ADD_PERCENT_MAX = '275'
process.env.RESOURCE_TO_ADD_PERCENT_MIN = '175'

// Logging

process.env.DEBUG_LOGGING = 'true'

// Bedrock

process.env.BEDROCK_REGION = 'us-east-1'
process.env.BEDROCK_IMAGE_MODEL_ID = 'amazon.nova-canvas-v1:0'

// S3

process.env.S3_ASSETS_BUCKET = 'cyoa-api-assets'
process.env.S3_ASSETS_DOMAIN = 'cyoa-assets.dbowland.com'
