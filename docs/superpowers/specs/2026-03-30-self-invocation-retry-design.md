# Self-Invocation Retry Design

**Date:** 2026-03-30

## Overview

Replace the current `for` loop retry patterns in `CreateGameFunction`, `CreateGameChoicesFunction`, and `CreateNarrativeFunction` with a self-invocation retry pattern. Each Lambda invocation makes one attempt; on failure it invokes itself asynchronously with an incremented attempt counter. A `MAX_RETRY_ATTEMPTS` env var (value: 3) caps retries per function.

## Problem

Generation via Bedrock can take a significant portion of each Lambda's timeout window. The current `for` loop means all retries share the same timeout. If attempt 1 consumes most of the timeout and fails, there is no time for attempt 2 in the same invocation.

## Solution

Each invocation attempts generation exactly once. On failure, it invokes itself asynchronously with `attempt + 1`. Each retry gets a fresh timeout window.

`CreateGameChoicesFunction` and `CreateNarrativeFunction` add a race-condition guard using a top-level `GenerationStarted` DynamoDB attribute. This prevents stale retries from proceeding when a newer invocation has taken ownership (via GetGames or get-choice-by-id re-queuing).

`CreateGameFunction` needs no guard — each attempt generates a wholly independent game with a new random title and gameId.

## Event Shapes

```typescript
interface CreateGameEvent {
  attempt?: number // 1-indexed, defaults to 1
}

interface CreateGameChoicesEvent {
  gameId: GameId
  attempt?: number // 1-indexed, defaults to 1
  generationStartedAt?: number // absent on attempt 1, required on attempt 2+
}

interface CreateNarrativeEvent {
  gameId: GameId
  narrativeId: NarrativeId
  attempt?: number // 1-indexed, defaults to 1
  generationStartedAt?: number // absent on attempt 1, required on attempt 2+
}
```

## Handler Flows

### `createGameHandler`

1. Call `createGame()` — one attempt, no loop
2. Success → done
3. Failure AND `attempt < maxRetryAttempts` → invoke self async with `{ attempt: attempt + 1 }`
4. Failure at max → log and give up

### `createGameChoicesHandler`

**Attempt 1 (`generationStartedAt` absent):**

1. Call `setChoicesGenerationStarted(gameId)` → returns timestamp `T`
2. Call `createGameChoices(gameId)` — one attempt, no loop
3. Success → done
4. Failure AND `attempt < maxRetryAttempts` → invoke self async with `{ gameId, attempt: 2, generationStartedAt: T }`
5. Failure at max → log and give up

**Attempt 2+ (`generationStartedAt` present):**

1. Call `resetChoicesGenerationStarted(gameId, generationStartedAt)` → returns new `T` or `false`
   - `false` → another invocation owns this work, bail silently
2. Call `createGameChoices(gameId)` — one attempt
3. Success → done
4. Failure AND `attempt < maxRetryAttempts` → invoke self async with `{ gameId, attempt: attempt + 1, generationStartedAt: T }`
5. Failure at max → log and give up

### `createNarrativeHandler`

Same structure as `createGameChoicesHandler`, substituting `setNarrativeGenerationStarted(gameId, narrativeId)` and `resetNarrativeGenerationStarted(gameId, narrativeId, generationStartedAt)`.

`generationData` is still read from DynamoDB at the start of the handler as today (it lives there from `queueNarrativeGeneration`).

## DynamoDB Changes

A new top-level `GenerationStarted` attribute (type `N`, Unix ms timestamp) is added to items in:

- **GamesTable** — written when choices generation is queued
- **NarrativesTable** — written when narrative generation is queued

### New functions in `src/services/dynamodb.ts`

**`setChoicesGenerationStarted(gameId: GameId): Promise<number>`**
`UpdateItemCommand` on GamesTable: `SET GenerationStarted = now`. Returns the timestamp written.

**`resetChoicesGenerationStarted(gameId: GameId, expectedTimestamp: number): Promise<number | false>`**
`UpdateItemCommand` on GamesTable: `SET GenerationStarted = now WHERE GenerationStarted = expectedTimestamp`.
Returns new timestamp on success, `false` on `ConditionalCheckFailedException`.

**`setNarrativeGenerationStarted(gameId: GameId, narrativeId: NarrativeId): Promise<number>`**
`UpdateItemCommand` on NarrativesTable: `SET GenerationStarted = now`. Returns the timestamp written.

**`resetNarrativeGenerationStarted(gameId: GameId, narrativeId: NarrativeId, expectedTimestamp: number): Promise<number | false>`**
`UpdateItemCommand` on NarrativesTable: `SET GenerationStarted = now WHERE GenerationStarted = expectedTimestamp`.
Returns new timestamp on success, `false` on `ConditionalCheckFailedException`.

### Callers updated

- `queueGameChoicesGeneration` — calls `setChoicesGenerationStarted(gameId)` and passes the returned timestamp in the invocation payload as `generationStartedAt`
- `queueNarrativeGeneration` — calls `setNarrativeGenerationStarted(gameId, narrativeId)` (after `setNarrativeGenerationData`) and passes the returned timestamp in the invocation payload as `generationStartedAt`

## Config Changes

**`src/config.ts`** — add:

```typescript
export const createGameFunctionName = process.env.CREATE_GAME_FUNCTION_NAME as string
export const maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS as string, 10)
```

## Infrastructure Changes (`template.yaml`)

All three generation functions receive:

- `MAX_RETRY_ATTEMPTS: 3` env var
- A `lambda:InvokeFunction` policy on their own ARN using `!Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${FunctionName}'` (SAM does not allow `!GetAtt FunctionName.Arn` in a function's own policy)

**`CreateGameFunction`** additionally receives:

- `CREATE_GAME_FUNCTION_NAME: !Ref CreateGameFunction`

**`CreateGameChoicesFunction`** additionally receives:

- `CREATE_GAME_CHOICES_FUNCTION_NAME: !Ref CreateGameChoicesFunction` (new — this function does not currently have its own name in its env vars)

**`CreateNarrativeFunction`** additionally receives:

- `CREATE_NARRATIVE_FUNCTION_NAME: !Ref CreateNarrativeFunction` (new — this function does not currently have its own name in its env vars)

## Modified Files

| File                                  | Change                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/handlers/create-game.ts`         | Replace for-loop with single-attempt + self-invocation                                       |
| `src/handlers/create-game-choices.ts` | Add guard logic + single-attempt + self-invocation                                           |
| `src/services/create-game-choices.ts` | Remove retry loop from `createGameChoices`; update `queueGameChoicesGeneration`              |
| `src/services/narratives.ts`          | Update `queueNarrativeGeneration` to call `setNarrativeGenerationStarted` and pass timestamp |
| `src/handlers/create-narrative.ts`    | Replace for-loop with guard logic + single-attempt + self-invocation                         |
| `src/services/dynamodb.ts`            | Add four new functions                                                                       |
| `src/config.ts`                       | Add `createGameFunctionName`, `maxRetryAttempts`                                             |
| `template.yaml`                       | Add env vars and IAM policies to all three functions                                         |

## Test Changes

**`__tests__/unit/handlers/create-game.test.ts`**

- Attempt 1 success → no self-invocation
- Attempt 1 failure, attempt < max → self-invokes with `{ attempt: 2 }`
- Attempt 1 failure at max → logs, no self-invocation

**`__tests__/unit/handlers/create-game-choices.test.ts`**

- Attempt 1: `setChoicesGenerationStarted` called; success path; failure + self-invocation; failure at max
- Attempt 2+: `resetChoicesGenerationStarted` called (not `set`); returns `false` → bail; returns timestamp → proceeds
- `createGameChoices` called once per invocation (no loop)

**`__tests__/unit/handlers/create-narrative.test.ts`**

- Same structure as choices handler tests above

**`__tests__/unit/services/create-game-choices.test.ts`**

- Remove retry loop tests from `createGameChoices`
- Update `queueGameChoicesGeneration` tests: verify `setChoicesGenerationStarted` is called and timestamp appears in invocation payload

**`__tests__/unit/services/narratives.test.ts`**

- Update `queueNarrativeGeneration` tests: verify `setNarrativeGenerationStarted` is called and timestamp appears in invocation payload

**`__tests__/unit/services/dynamodb.test.ts`**

- Add tests for all four new functions: success path, `ConditionalCheckFailedException` path, unexpected error rethrow path
