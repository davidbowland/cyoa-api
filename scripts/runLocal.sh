#!/usr/bin/env bash

# Stop immediately on error
set -e

if [[ -z "$1" ]]; then
  $(./scripts/assumeDeveloperRole.sh)
fi

# Only install production modules
export NODE_ENV=production

# Build the project
SAM_TEMPLATE=template.yaml
sam build --template ${SAM_TEMPLATE}

# Start the API locally
export DYNAMODB_GAMES_TABLE_NAME=cyoa-api-games-test
export CREATE_NARRATIVE_FUNCTION_NAME=cyoa-api-test-CreateNarrativeFunction-aTIJwDsqCRaF
export DEBUG_LOGGING=false
export DYNAMODB_NARRATIVES_TABLE_NAME=cyoa-api-narratives-test
export S3_ASSETS_BUCKET=cyoa-api-assets-test
export S3_ASSETS_DOMAIN=cyoa-assets.bowland.link
sam local start-api --region=us-east-1 --force-image-build --parameter-overrides "Environment=test" --log-file local.log
