# Self-Invocation Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `for` loop retry pattern in all three generation lambdas with self-invocation retries, adding a `GenerationStarted` race-condition guard to the choices and narrative lambdas.

**Architecture:** Each Lambda invokes itself asynchronously on failure with `attempt + 1`. `CreateGameChoicesFunction` and `CreateNarrativeFunction` use a top-level `GenerationStarted` DynamoDB attribute (conditional `UpdateItemCommand`) to prevent stale retries from proceeding when a fresh invocation has taken ownership. `CreateGameFunction` is guard-free since each attempt creates a wholly independent game.

**Tech Stack:** TypeScript, AWS Lambda (Node.js 24), AWS SDK v3 (`@aws-sdk/client-dynamodb` `UpdateItemCommand`, `@aws-sdk/client-lambda` `InvokeCommand`), Jest, SAM (`template.yaml`)

---

## File Map

| File                                                  | Change                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jest.setup-test-env.js`                              | Add `CREATE_GAME_FUNCTION_NAME` and `MAX_RETRY_ATTEMPTS` env vars                                                                                                    |
| `src/config.ts`                                       | Add `createGameFunctionName`, `maxRetryAttempts`                                                                                                                     |
| `src/types.ts`                                        | Add `CreateGameEvent`; add `attempt?` + `generationStartedAt?` to `CreateGameChoicesEvent` and `CreateNarrativeEvent`                                                |
| `src/services/dynamodb.ts`                            | Add `setChoicesGenerationStarted`, `resetChoicesGenerationStarted`, `setNarrativeGenerationStarted`, `resetNarrativeGenerationStarted` (all use `UpdateItemCommand`) |
| `src/services/create-game-choices.ts`                 | `queueGameChoicesGeneration`: call `setChoicesGenerationStarted`, pass timestamp in payload. `createGameChoices`: remove retry loop                                  |
| `src/services/narratives.ts`                          | `queueNarrativeGeneration`: call `setNarrativeGenerationStarted`, pass timestamp in payload                                                                          |
| `src/handlers/create-game.ts`                         | Replace for-loop with single attempt + Lambda self-invocation on failure                                                                                             |
| `src/handlers/create-game-choices.ts`                 | Add Lambda client; replace catch-and-swallow with guard check + single attempt + self-invocation                                                                     |
| `src/handlers/create-narrative.ts`                    | Add Lambda client; replace for-loop with guard check + single attempt + self-invocation                                                                              |
| `events/create-game-choices.json`                     | Add `generationStartedAt` field                                                                                                                                      |
| `events/create-narrative.json`                        | Fix to `{ gameId, narrativeId }` shape (currently wrong SQS format)                                                                                                  |
| `template.yaml`                                       | Add `MAX_RETRY_ATTEMPTS`, self-invoke IAM policies, and function name env vars to all three functions                                                                |
| `__tests__/unit/services/dynamodb.test.ts`            | Add `UpdateItemCommand` to mock; add tests for four new functions                                                                                                    |
| `__tests__/unit/services/create-game-choices.test.ts` | Update `queueGameChoicesGeneration` test; remove retry-loop tests from `createGameChoices`                                                                           |
| `__tests__/unit/services/narratives.test.ts`          | Update `queueNarrativeGeneration` test to expect `setNarrativeGenerationStarted` call and timestamp in payload                                                       |
| `__tests__/unit/handlers/create-game.test.ts`         | Add Lambda mock; rewrite tests for new self-invocation pattern                                                                                                       |
| `__tests__/unit/handlers/create-game-choices.test.ts` | Add Lambda mock; rewrite tests for guard + self-invocation pattern                                                                                                   |
| `__tests__/unit/handlers/create-narrative.test.ts`    | Add Lambda mock; rewrite tests for guard + self-invocation pattern                                                                                                   |

---

## Task 1: Config and env setup

**Files:**

- Modify: `src/config.ts`
- Modify: `jest.setup-test-env.js`

- [ ] **Step 1: Write the failing test**

There is no isolated test for config — it's exercised by all tests. Skip to implementation.

- [ ] **Step 2: Add env vars to `jest.setup-test-env.js`**

Add at the end of the `// Lambda` section:

```javascript
process.env.CREATE_GAME_FUNCTION_NAME = 'create-game-function'
process.env.MAX_RETRY_ATTEMPTS = '3'
```

- [ ] **Step 3: Add exports to `src/config.ts`**

Add at the end of the `// Lambda` section (after `createNarrativeFunctionName`):

```typescript
export const createGameFunctionName = process.env.CREATE_GAME_FUNCTION_NAME as string
export const maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS as string, 10)
```

- [ ] **Step 4: Run tests to verify nothing is broken**

```bash
npm test -- --testPathPattern="config" --passWithNoTests
```

Expected: PASS (config is not directly tested; env vars are now available)

- [ ] **Step 5: Commit**

```bash
git add src/config.ts jest.setup-test-env.js
git commit -m "feat: add createGameFunctionName and maxRetryAttempts to config"
```

---

## Task 2: Update event types

**Files:**

- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing test**

No isolated type test. Types are exercised by handler/service tests. Skip to implementation.

- [ ] **Step 2: Add `CreateGameEvent`; extend existing event types**

In `src/types.ts`, add `CreateGameEvent` as a new interface (near the other event types, after `CreateNarrativeEvent`):

```typescript
export interface CreateGameEvent {
  attempt?: number
}
```

Update `CreateGameChoicesEvent`:

```typescript
export interface CreateGameChoicesEvent {
  gameId: GameId
  attempt?: number
  generationStartedAt?: number
}
```

Update `CreateNarrativeEvent`:

```typescript
export interface CreateNarrativeEvent {
  gameId: GameId
  narrativeId: NarrativeId
  attempt?: number
  generationStartedAt?: number
}
```

- [ ] **Step 3: Run tests to verify nothing is broken**

```bash
npm test -- --testPathPattern="handlers" --passWithNoTests
```

Expected: PASS (new optional fields are backward-compatible)

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add attempt and generationStartedAt to event types"
```

---

## Task 3: DynamoDB — choices guard functions

**Files:**

- Modify: `src/services/dynamodb.ts`
- Modify: `__tests__/unit/services/dynamodb.test.ts`

- [ ] **Step 1: Add `UpdateItemCommand` to the DynamoDB mock**

In `__tests__/unit/services/dynamodb.test.ts`, update the `jest.mock('@aws-sdk/client-dynamodb', ...)` block to add `UpdateItemCommand`:

```typescript
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDB: jest.fn(() => ({
    send: (...args: any[]) => mockSend(...args),
  })),
  BatchGetItemCommand: jest.fn().mockImplementation((x) => x),
  GetItemCommand: jest.fn().mockImplementation((x) => x),
  PutItemCommand: jest.fn().mockImplementation((x) => x),
  QueryCommand: jest.fn().mockImplementation((x) => x),
  ScanCommand: jest.fn().mockImplementation((x) => x),
  UpdateItemCommand: jest.fn().mockImplementation((x) => x),
}))
```

- [ ] **Step 2: Write failing tests for `setChoicesGenerationStarted`**

Add a new `describe` block at the end of `__tests__/unit/services/dynamodb.test.ts`:

```typescript
describe('setChoicesGenerationStarted', () => {
  it('should write GenerationStarted and return the timestamp', async () => {
    mockSend.mockResolvedValueOnce({})

    const result = await setChoicesGenerationStarted(gameId)

    expect(mockSend).toHaveBeenCalledWith({
      Key: { GameId: { S: gameId } },
      UpdateExpression: 'SET GenerationStarted = :now',
      ExpressionAttributeValues: { ':now': { N: `${mockNow}` } },
      TableName: 'games-table',
    })
    expect(result).toBe(mockNow)
  })
})

describe('resetChoicesGenerationStarted', () => {
  it('should conditionally update GenerationStarted and return new timestamp', async () => {
    mockSend.mockResolvedValueOnce({})

    const result = await resetChoicesGenerationStarted(gameId, 12345)

    expect(mockSend).toHaveBeenCalledWith({
      Key: { GameId: { S: gameId } },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${mockNow}` },
        ':expected': { N: '12345' },
      },
      TableName: 'games-table',
    })
    expect(result).toBe(mockNow)
  })

  it('should return false when condition check fails', async () => {
    const error = new Error('Condition failed')
    ;(error as any).name = 'ConditionalCheckFailedException'
    mockSend.mockRejectedValueOnce(error)

    const result = await resetChoicesGenerationStarted(gameId, 12345)

    expect(result).toBe(false)
  })

  it('should rethrow unexpected errors', async () => {
    const error = new Error('Network error')
    mockSend.mockRejectedValueOnce(error)

    await expect(resetChoicesGenerationStarted(gameId, 12345)).rejects.toThrow('Network error')
  })
})
```

Also add `setChoicesGenerationStarted` and `resetChoicesGenerationStarted` to the import at the top of the test file.

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="services/dynamodb" --passWithNoTests
```

Expected: FAIL — `setChoicesGenerationStarted` and `resetChoicesGenerationStarted` are not exported

- [ ] **Step 4: Add `UpdateItemCommand` import and implement the two functions in `src/services/dynamodb.ts`**

Add `UpdateItemCommand` to the existing AWS SDK import at the top of `src/services/dynamodb.ts`:

```typescript
import {
  BatchGetItemCommand,
  BatchGetItemCommandOutput,
  DynamoDB,
  GetItemCommand,
  GetItemCommandOutput,
  PutItemCommand,
  PutItemOutput,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
```

Add these two functions at the end of the `/* Games */` section (after `getGameGenerationData`):

```typescript
export const setChoicesGenerationStarted = async (gameId: GameId): Promise<number> => {
  const now = Date.now()
  const command = new UpdateItemCommand({
    Key: {
      GameId: { S: `${gameId}` },
    },
    UpdateExpression: 'SET GenerationStarted = :now',
    ExpressionAttributeValues: {
      ':now': { N: `${now}` },
    },
    TableName: dynamodbGamesTableName,
  })
  await dynamodb.send(command)
  return now
}

export const resetChoicesGenerationStarted = async (
  gameId: GameId,
  expectedTimestamp: number,
): Promise<number | false> => {
  const now = Date.now()
  try {
    const command = new UpdateItemCommand({
      Key: {
        GameId: { S: `${gameId}` },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${now}` },
        ':expected': { N: `${expectedTimestamp}` },
      },
      TableName: dynamodbGamesTableName,
    })
    await dynamodb.send(command)
    return now
  } catch (error: unknown) {
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return false
    }
    throw error
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="services/dynamodb"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/dynamodb.ts __tests__/unit/services/dynamodb.test.ts
git commit -m "feat: add setChoicesGenerationStarted and resetChoicesGenerationStarted"
```

---

## Task 4: DynamoDB — narrative guard functions

**Files:**

- Modify: `src/services/dynamodb.ts`
- Modify: `__tests__/unit/services/dynamodb.test.ts`

- [ ] **Step 1: Write failing tests for `setNarrativeGenerationStarted` and `resetNarrativeGenerationStarted`**

Add to `__tests__/unit/services/dynamodb.test.ts` (after the `resetChoicesGenerationStarted` describe block):

```typescript
describe('setNarrativeGenerationStarted', () => {
  it('should write GenerationStarted and return the timestamp', async () => {
    mockSend.mockResolvedValueOnce({})

    const result = await setNarrativeGenerationStarted(gameId, narrativeId)

    expect(mockSend).toHaveBeenCalledWith({
      Key: {
        GameId: { S: gameId },
        NarrativeId: { S: narrativeId },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ExpressionAttributeValues: { ':now': { N: `${mockNow}` } },
      TableName: 'narratives-table',
    })
    expect(result).toBe(mockNow)
  })
})

describe('resetNarrativeGenerationStarted', () => {
  it('should conditionally update GenerationStarted and return new timestamp', async () => {
    mockSend.mockResolvedValueOnce({})

    const result = await resetNarrativeGenerationStarted(gameId, narrativeId, 12345)

    expect(mockSend).toHaveBeenCalledWith({
      Key: {
        GameId: { S: gameId },
        NarrativeId: { S: narrativeId },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${mockNow}` },
        ':expected': { N: '12345' },
      },
      TableName: 'narratives-table',
    })
    expect(result).toBe(mockNow)
  })

  it('should return false when condition check fails', async () => {
    const error = new Error('Condition failed')
    ;(error as any).name = 'ConditionalCheckFailedException'
    mockSend.mockRejectedValueOnce(error)

    const result = await resetNarrativeGenerationStarted(gameId, narrativeId, 12345)

    expect(result).toBe(false)
  })

  it('should rethrow unexpected errors', async () => {
    const error = new Error('DynamoDB error')
    mockSend.mockRejectedValueOnce(error)

    await expect(resetNarrativeGenerationStarted(gameId, narrativeId, 12345)).rejects.toThrow(
      'DynamoDB error',
    )
  })
})
```

Also add `setNarrativeGenerationStarted` and `resetNarrativeGenerationStarted` to the import at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="services/dynamodb"
```

Expected: FAIL — functions not yet exported

- [ ] **Step 3: Implement the two functions in `src/services/dynamodb.ts`**

Add these two functions at the end of the `/* Narratives */` section (after `setNarrativeGenerationData`):

```typescript
export const setNarrativeGenerationStarted = async (
  gameId: GameId,
  narrativeId: NarrativeId,
): Promise<number> => {
  const now = Date.now()
  const command = new UpdateItemCommand({
    Key: {
      GameId: { S: gameId },
      NarrativeId: { S: narrativeId },
    },
    UpdateExpression: 'SET GenerationStarted = :now',
    ExpressionAttributeValues: {
      ':now': { N: `${now}` },
    },
    TableName: dynamodbNarrativesTableName,
  })
  await dynamodb.send(command)
  return now
}

export const resetNarrativeGenerationStarted = async (
  gameId: GameId,
  narrativeId: NarrativeId,
  expectedTimestamp: number,
): Promise<number | false> => {
  const now = Date.now()
  try {
    const command = new UpdateItemCommand({
      Key: {
        GameId: { S: gameId },
        NarrativeId: { S: narrativeId },
      },
      UpdateExpression: 'SET GenerationStarted = :now',
      ConditionExpression: 'GenerationStarted = :expected',
      ExpressionAttributeValues: {
        ':now': { N: `${now}` },
        ':expected': { N: `${expectedTimestamp}` },
      },
      TableName: dynamodbNarrativesTableName,
    })
    await dynamodb.send(command)
    return now
  } catch (error: unknown) {
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return false
    }
    throw error
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="services/dynamodb"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/dynamodb.ts __tests__/unit/services/dynamodb.test.ts
git commit -m "feat: add setNarrativeGenerationStarted and resetNarrativeGenerationStarted"
```

---

## Task 5: Update `queueGameChoicesGeneration`

**Files:**

- Modify: `src/services/create-game-choices.ts`
- Modify: `__tests__/unit/services/create-game-choices.test.ts`

- [ ] **Step 1: Write the failing test**

In `__tests__/unit/services/create-game-choices.test.ts`, add `setChoicesGenerationStarted` to the `jest.mock('@services/dynamodb')` mock and update `queueGameChoicesGeneration` test:

First, add to `beforeAll` in the top-level describe:

```typescript
jest.mocked(dynamodb).setChoicesGenerationStarted.mockResolvedValue(1640995200000)
```

Then replace the existing `queueGameChoicesGeneration` test:

```typescript
describe('queueGameChoicesGeneration', () => {
  it('should set GenerationStarted, then invoke the choices lambda with gameId and timestamp', async () => {
    await queueGameChoicesGeneration(gameId)

    expect(dynamodb.setChoicesGenerationStarted).toHaveBeenCalledWith(gameId)
    expect(mockLambdaSend).toHaveBeenCalledWith(
      expect.objectContaining({
        FunctionName: 'create-game-choices-function',
        InvocationType: 'Event',
        Payload: JSON.stringify({ gameId, generationStartedAt: 1640995200000 }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- --testPathPattern="services/create-game-choices"
```

Expected: FAIL — `setChoicesGenerationStarted` not called, payload doesn't include `generationStartedAt`

- [ ] **Step 3: Update `queueGameChoicesGeneration` in `src/services/create-game-choices.ts`**

Add `setChoicesGenerationStarted` to the dynamodb import:

```typescript
import { getGameGenerationData, setChoicesGenerationStarted, setGameById } from './dynamodb'
```

Replace the `queueGameChoicesGeneration` function body:

```typescript
export const queueGameChoicesGeneration = async (gameId: GameId): Promise<void> => {
  const generationStartedAt = await setChoicesGenerationStarted(gameId)
  const command = new InvokeCommand({
    FunctionName: createGameChoicesFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId, generationStartedAt }),
  })
  await lambda.send(command)
  log('Game choices generation queued', { gameId })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="services/create-game-choices"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/create-game-choices.ts __tests__/unit/services/create-game-choices.test.ts
git commit -m "feat: pass GenerationStarted timestamp in queueGameChoicesGeneration payload"
```

---

## Task 6: Update `queueNarrativeGeneration`

**Files:**

- Modify: `src/services/narratives.ts`
- Modify: `__tests__/unit/services/narratives.test.ts`

- [ ] **Step 1: Write the failing tests**

In `__tests__/unit/services/narratives.test.ts`, add `setNarrativeGenerationStarted` to the dynamodb mock setup:

```typescript
jest.mocked(dynamodb).setNarrativeGenerationStarted.mockResolvedValue(1640995200000)
```

Then update the two existing `queueNarrativeGeneration` tests that assert on the Lambda payload to also expect `generationStartedAt`. Replace the `Payload` assertion in each:

In the "should queue initial narrative generation" test, change:

```typescript
Payload: JSON.stringify({ gameId, narrativeId: 'narrative-0' }),
```

to:

```typescript
Payload: JSON.stringify({ gameId, narrativeId: 'narrative-0', generationStartedAt: mockNow }),
```

In the "should queue ending narrative generation" test, change:

```typescript
Payload: JSON.stringify({
  gameId,
  narrativeId: `narrative-${cyoaGame.choicePoints.length}`,
}),
```

to:

```typescript
Payload: JSON.stringify({
  gameId,
  narrativeId: `narrative-${cyoaGame.choicePoints.length}`,
  generationStartedAt: mockNow,
}),
```

Also add a new assertion to both tests:

```typescript
expect(dynamodb.setNarrativeGenerationStarted).toHaveBeenCalledWith(gameId, expect.any(String))
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- --testPathPattern="services/narratives"
```

Expected: FAIL — `setNarrativeGenerationStarted` not called, payload missing `generationStartedAt`

- [ ] **Step 3: Update `queueNarrativeGeneration` in `src/services/narratives.ts`**

Add `setNarrativeGenerationStarted` to the dynamodb import:

```typescript
import { setNarrativeGenerationData, setNarrativeGenerationStarted } from './dynamodb'
```

In `queueNarrativeGeneration`, after the `setNarrativeGenerationData` call, add the `setNarrativeGenerationStarted` call and update the Lambda payload:

```typescript
export const queueNarrativeGeneration = async (
  gameId: GameId,
  game: CyoaGame,
  choiceIndex: number,
): Promise<void> => {
  const currentChoice = game.choicePoints[choiceIndex]
  const lastChoice = game.choicePoints[choiceIndex - 1]
  const narrativeId = getNarrativeIdByIndex(choiceIndex)

  const generationData: NarrativeGenerationData = {
    inventoryAvailable: currentChoice?.inventoryAvailable ?? [],
    existingNarrative: currentChoice?.choiceNarrative ?? '',
    previousNarrative: lastChoice?.choiceNarrative,
    previousChoice: lastChoice?.choice,
    previousOptions: lastChoice?.options,
    nextChoice: currentChoice?.choice,
    nextOptions: currentChoice?.options,
    outline: game.outline,
    lossNarrative: currentChoice?.lossNarrative ?? '',
    inspirationAuthor: game.inspirationAuthor,
    generationStartTime: Date.now(),
  }
  await setNarrativeGenerationData(gameId, narrativeId, generationData)

  const generationStartedAt = await setNarrativeGenerationStarted(gameId, narrativeId)

  const command = new InvokeCommand({
    FunctionName: createNarrativeFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ gameId, narrativeId, generationStartedAt }),
  })
  await lambda.send(command)
  log('Narrative generation queued', { gameId, narrativeId })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="services/narratives"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/narratives.ts __tests__/unit/services/narratives.test.ts
git commit -m "feat: pass GenerationStarted timestamp in queueNarrativeGeneration payload"
```

---

## Task 7: Remove retry loop from `createGameChoices` service

**Files:**

- Modify: `src/services/create-game-choices.ts`
- Modify: `__tests__/unit/services/create-game-choices.test.ts`

- [ ] **Step 1: Remove retry-loop tests and update `createGameChoices` tests**

In `__tests__/unit/services/create-game-choices.test.ts`, delete these two tests from the `createGameChoices` describe block:

- `"should retry when game choices generation fails on first attempt"` (the one asserting `toHaveBeenCalledTimes(2)`)
- `"should throw error when game choices generation fails after 2 attempts"` (the one asserting the string rejection)

After deletion, the `createGameChoices` describe block should have only:

- `"should read generation data, generate choices, save, and queue narrative"`
- `"should continue when narrative generation fails"`

Add a new test:

```typescript
it('should throw when generateGameChoices fails', async () => {
  jest.mocked(gameChoices).generateGameChoices.mockRejectedValueOnce(new Error('Generation failed'))

  await expect(createGameChoices(gameId)).rejects.toThrow('Generation failed')
})
```

- [ ] **Step 2: Run tests to verify the new test fails**

```bash
npm test -- --testPathPattern="services/create-game-choices"
```

Expected: FAIL — the retry loop currently swallows the error and retries, so the test expects a throw but gets undefined

- [ ] **Step 3: Remove the retry loop from `createGameChoices` in `src/services/create-game-choices.ts`**

Replace the `createGameChoices` function body (removing the for-loop and the final throw):

```typescript
export const createGameChoices = async (
  gameId: GameId,
): Promise<{ game: CyoaGame; gameId: GameId }> => {
  const { gameData, storyType, inspirationAuthor, choiceCount, image, inventory, resourceImage } =
    await getGameGenerationData(gameId)

  const game = await generateGameChoices(gameData, storyType, inspirationAuthor, choiceCount)

  const gameWithImages: CyoaGame = {
    ...game,
    image,
    inventory,
    resourceImage,
  }

  await setGameById(gameId, gameWithImages)

  try {
    await queueNarrativeGeneration(gameId, gameWithImages, 0)
  } catch (error: unknown) {
    logError('Error creating initial narrative', {
      gameId,
      error,
    })
  }

  return { game: gameWithImages, gameId }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="services/create-game-choices"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/create-game-choices.ts __tests__/unit/services/create-game-choices.test.ts
git commit -m "feat: remove retry loop from createGameChoices service"
```

---

## Task 8: Rework `createGameHandler`

**Files:**

- Modify: `src/handlers/create-game.ts`
- Modify: `__tests__/unit/handlers/create-game.test.ts`

- [ ] **Step 1: Write failing tests**

Replace the entire contents of `__tests__/unit/handlers/create-game.test.ts`:

```typescript
import { gameId } from '../__mocks__'
import { createGameHandler } from '@handlers/create-game'
import * as createGames from '@services/create-games'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/create-games')
jest.mock('@utils/logging')

describe('create-game', () => {
  describe('createGameHandler', () => {
    beforeAll(() => {
      jest.mocked(createGames).createGame.mockResolvedValue({ gameId })
      mockLambdaSend.mockResolvedValue({})
    })

    it('should create a game successfully and not self-invoke', async () => {
      await createGameHandler()

      expect(createGames.createGame).toHaveBeenCalledWith()
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should self-invoke with attempt 2 when attempt 1 fails', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Creation failed'))

      await createGameHandler({ attempt: 1 })

      expect(createGames.createGame).toHaveBeenCalledTimes(1)
      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({ attempt: 2 }),
        }),
      )
    })

    it('should self-invoke with incremented attempt when intermediate attempt fails', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Creation failed'))

      await createGameHandler({ attempt: 2 })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Payload: JSON.stringify({ attempt: 3 }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest.mocked(createGames).createGame.mockRejectedValueOnce(new Error('Persistent failure'))

      await createGameHandler({ attempt: 3 })

      expect(createGames.createGame).toHaveBeenCalledTimes(1)
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="handlers/create-game"
```

Expected: FAIL — handler doesn't have self-invocation logic yet

- [ ] **Step 3: Rewrite `src/handlers/create-game.ts`**

```typescript
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createGameFunctionName, maxRetryAttempts } from '../config'
import { createGame } from '../services/create-games'
import { CreateGameEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createGameHandler = async (event: CreateGameEvent = {}): Promise<void> => {
  const attempt = event.attempt ?? 1
  try {
    const { gameId } = await createGame()
    log('Game created successfully', { gameId })
  } catch (error: unknown) {
    if (attempt < maxRetryAttempts) {
      logError('Game creation failed, retrying', { error, attempt })
      const command = new InvokeCommand({
        FunctionName: createGameFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({ attempt: attempt + 1 }),
      })
      await lambda.send(command)
    } else {
      logError('Game creation failed, giving up', { error, attempt })
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="handlers/create-game"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/handlers/create-game.ts __tests__/unit/handlers/create-game.test.ts
git commit -m "feat: replace retry loop in createGameHandler with self-invocation"
```

---

## Task 9: Rework `createGameChoicesHandler`

**Files:**

- Modify: `src/handlers/create-game-choices.ts`
- Modify: `__tests__/unit/handlers/create-game-choices.test.ts`

**Implementation note:** `queueGameChoicesGeneration` (updated in Task 5) now always passes `generationStartedAt` in the event payload. So in normal operation, `generationStartedAt` is always present. The handler uses `resetChoicesGenerationStarted` when `generationStartedAt` is present (both attempt 1 from queue and self-retries), and falls back to `setChoicesGenerationStarted` only for direct invocations where `generationStartedAt` is absent.

- [ ] **Step 1: Write failing tests**

Replace the entire contents of `__tests__/unit/handlers/create-game-choices.test.ts`:

```typescript
import { cyoaGame, gameId } from '../__mocks__'
import createGameChoicesEvent from '@events/create-game-choices.json'
import { createGameChoicesHandler } from '@handlers/create-game-choices'
import * as createGameChoicesService from '@services/create-game-choices'
import * as dynamodb from '@services/dynamodb'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/create-game-choices')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('create-game-choices', () => {
  describe('createGameChoicesHandler', () => {
    const mockNow = 1640995200000

    beforeAll(() => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockResolvedValue({ game: cyoaGame, gameId })
      jest.mocked(dynamodb).setChoicesGenerationStarted.mockResolvedValue(mockNow)
      jest.mocked(dynamodb).resetChoicesGenerationStarted.mockResolvedValue(mockNow)
      mockLambdaSend.mockResolvedValue({})
    })

    it('should call resetChoicesGenerationStarted when generationStartedAt is present', async () => {
      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(dynamodb.resetChoicesGenerationStarted).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
        12345,
      )
      expect(dynamodb.setChoicesGenerationStarted).not.toHaveBeenCalled()
    })

    it('should call setChoicesGenerationStarted when generationStartedAt is absent', async () => {
      await createGameChoicesHandler(createGameChoicesEvent)

      expect(dynamodb.setChoicesGenerationStarted).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
      )
      expect(dynamodb.resetChoicesGenerationStarted).not.toHaveBeenCalled()
    })

    it('should bail silently when resetChoicesGenerationStarted returns false', async () => {
      jest.mocked(dynamodb).resetChoicesGenerationStarted.mockResolvedValueOnce(false)

      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(createGameChoicesService.createGameChoices).not.toHaveBeenCalled()
    })

    it('should invoke createGameChoices once on success', async () => {
      await createGameChoicesHandler({ ...createGameChoicesEvent, generationStartedAt: 12345 })

      expect(createGameChoicesService.createGameChoices).toHaveBeenCalledWith(
        createGameChoicesEvent.gameId,
      )
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should self-invoke with attempt+1 and new timestamp on failure', async () => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockRejectedValueOnce(new Error('Failed'))

      await createGameChoicesHandler({
        ...createGameChoicesEvent,
        attempt: 1,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-game-choices-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId: createGameChoicesEvent.gameId,
            attempt: 2,
            generationStartedAt: mockNow,
          }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest
        .mocked(createGameChoicesService)
        .createGameChoices.mockRejectedValueOnce(new Error('Persistent failure'))

      await createGameChoicesHandler({
        ...createGameChoicesEvent,
        attempt: 3,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="handlers/create-game-choices"
```

Expected: FAIL — handler doesn't have guard or self-invocation logic yet

- [ ] **Step 3: Rewrite `src/handlers/create-game-choices.ts`**

```typescript
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createGameChoicesFunctionName, maxRetryAttempts } from '../config'
import { createGameChoices } from '../services/create-game-choices'
import { resetChoicesGenerationStarted, setChoicesGenerationStarted } from '../services/dynamodb'
import { CreateGameChoicesEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createGameChoicesHandler = async (event: CreateGameChoicesEvent): Promise<void> => {
  const { gameId, attempt = 1, generationStartedAt } = event
  log('Received game choices event', { gameId, attempt })

  let currentTimestamp: number
  if (generationStartedAt === undefined) {
    currentTimestamp = await setChoicesGenerationStarted(gameId)
  } else {
    const result = await resetChoicesGenerationStarted(gameId, generationStartedAt)
    if (result === false) {
      log('Game choices generation superseded, bailing', { gameId, attempt })
      return
    }
    currentTimestamp = result
  }

  try {
    const { gameId: createdGameId } = await createGameChoices(gameId)
    log('Game choices created successfully', { gameId: createdGameId })
  } catch (error: unknown) {
    if (attempt < maxRetryAttempts) {
      logError('Game choices creation failed, retrying', { error, gameId, attempt })
      const command = new InvokeCommand({
        FunctionName: createGameChoicesFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          gameId,
          attempt: attempt + 1,
          generationStartedAt: currentTimestamp,
        }),
      })
      await lambda.send(command)
    } else {
      logError('Game choices creation failed, giving up', { error, gameId, attempt })
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="handlers/create-game-choices"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/handlers/create-game-choices.ts __tests__/unit/handlers/create-game-choices.test.ts
git commit -m "feat: replace retry loop in createGameChoicesHandler with guard and self-invocation"
```

---

## Task 10: Rework `createNarrativeHandler`

**Files:**

- Modify: `src/handlers/create-narrative.ts`
- Modify: `__tests__/unit/handlers/create-narrative.test.ts`

**Implementation note:** Same guard pattern as choices. `queueNarrativeGeneration` (Task 6) always passes `generationStartedAt`, so in normal operation `generationStartedAt` is always present. The handler uses `resetNarrativeGenerationStarted` when present, `setNarrativeGenerationStarted` as fallback.

- [ ] **Step 1: Write failing tests**

Replace the entire contents of `__tests__/unit/handlers/create-narrative.test.ts`:

```typescript
import { createNarrativeEvent, cyoaNarrative, narrativeGenerationData } from '../__mocks__'
import { createNarrativeHandler } from '@handlers/create-narrative'
import * as createNarratives from '@services/create-narratives'
import * as dynamodb from '@services/dynamodb'
import * as logging from '@utils/logging'

const mockLambdaSend = jest.fn()
jest.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: jest.fn().mockImplementation((x) => x),
  LambdaClient: jest.fn(() => ({
    send: (...args: any[]) => mockLambdaSend(...args),
  })),
}))
jest.mock('@services/create-narratives')
jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('create-narrative', () => {
  describe('createNarrativeHandler', () => {
    const mockNow = 1640995200000

    beforeAll(() => {
      jest
        .mocked(dynamodb)
        .getNarrativeById.mockResolvedValue({ generationData: narrativeGenerationData })
      jest.mocked(createNarratives).createNarrative.mockResolvedValue(cyoaNarrative)
      jest.mocked(dynamodb).setNarrativeGenerationStarted.mockResolvedValue(mockNow)
      jest.mocked(dynamodb).resetNarrativeGenerationStarted.mockResolvedValue(mockNow)
      mockLambdaSend.mockResolvedValue({})
    })

    it('should call resetNarrativeGenerationStarted when generationStartedAt is present', async () => {
      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(dynamodb.resetNarrativeGenerationStarted).toHaveBeenCalledWith(
        createNarrativeEvent.gameId,
        createNarrativeEvent.narrativeId,
        12345,
      )
      expect(dynamodb.setNarrativeGenerationStarted).not.toHaveBeenCalled()
    })

    it('should call setNarrativeGenerationStarted when generationStartedAt is absent', async () => {
      await createNarrativeHandler(createNarrativeEvent)

      expect(dynamodb.setNarrativeGenerationStarted).toHaveBeenCalledWith(
        createNarrativeEvent.gameId,
        createNarrativeEvent.narrativeId,
      )
      expect(dynamodb.resetNarrativeGenerationStarted).not.toHaveBeenCalled()
    })

    it('should bail silently when resetNarrativeGenerationStarted returns false', async () => {
      jest.mocked(dynamodb).resetNarrativeGenerationStarted.mockResolvedValueOnce(false)

      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(createNarratives.createNarrative).not.toHaveBeenCalled()
    })

    it('should create narrative with gameId and narrativeId on success', async () => {
      await createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 })

      expect(dynamodb.getNarrativeById).toHaveBeenCalledWith('a-friendly-adventure', 'narrative-0')
      expect(createNarratives.createNarrative).toHaveBeenCalledWith(
        'a-friendly-adventure',
        'narrative-0',
        narrativeGenerationData,
      )
      expect(mockLambdaSend).not.toHaveBeenCalled()
    })

    it('should throw error when generation data not found', async () => {
      jest.mocked(dynamodb).getNarrativeById.mockResolvedValueOnce({ generationData: undefined })

      await expect(
        createNarrativeHandler({ ...createNarrativeEvent, generationStartedAt: 12345 }),
      ).rejects.toThrow('No generation data found')

      expect(logging.logError).toHaveBeenCalledWith(
        'Failed to create narrative',
        expect.objectContaining({
          error: expect.any(Error),
          event: expect.objectContaining(createNarrativeEvent),
        }),
      )
    })

    it('should self-invoke with attempt+1 and new timestamp on failure', async () => {
      jest
        .mocked(createNarratives)
        .createNarrative.mockRejectedValueOnce(new Error('First failure'))

      await createNarrativeHandler({
        ...createNarrativeEvent,
        attempt: 1,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'create-narrative-function',
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId: createNarrativeEvent.gameId,
            narrativeId: createNarrativeEvent.narrativeId,
            attempt: 2,
            generationStartedAt: mockNow,
          }),
        }),
      )
    })

    it('should give up without self-invoking when max attempts reached', async () => {
      jest
        .mocked(createNarratives)
        .createNarrative.mockRejectedValueOnce(new Error('Persistent failure'))

      await createNarrativeHandler({
        ...createNarrativeEvent,
        attempt: 3,
        generationStartedAt: 12345,
      })

      expect(mockLambdaSend).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="handlers/create-narrative"
```

Expected: FAIL — handler doesn't have guard or self-invocation logic yet

- [ ] **Step 3: Rewrite `src/handlers/create-narrative.ts`**

```typescript
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

import { createNarrativeFunctionName, maxRetryAttempts } from '../config'
import { createNarrative } from '../services/create-narratives'
import {
  getNarrativeById,
  resetNarrativeGenerationStarted,
  setNarrativeGenerationStarted,
} from '../services/dynamodb'
import { CreateNarrativeEvent } from '../types'
import { log, logError, xrayCapture } from '../utils/logging'

const lambda = xrayCapture(new LambdaClient({ apiVersion: '2012-08-10' }))

export const createNarrativeHandler = async (event: CreateNarrativeEvent): Promise<void> => {
  const { gameId, narrativeId, attempt = 1, generationStartedAt } = event
  log('Received narrative event', { event })

  try {
    let currentTimestamp: number
    if (generationStartedAt === undefined) {
      currentTimestamp = await setNarrativeGenerationStarted(gameId, narrativeId)
    } else {
      const result = await resetNarrativeGenerationStarted(gameId, narrativeId, generationStartedAt)
      if (result === false) {
        log('Narrative generation superseded, bailing', { gameId, narrativeId, attempt })
        return
      }
      currentTimestamp = result
    }

    const { generationData } = await getNarrativeById(gameId, narrativeId)
    if (!generationData) {
      throw new Error('No generation data found')
    }

    try {
      await createNarrative(gameId, narrativeId, generationData)
      log('Narrative created successfully', { gameId, narrativeId })
    } catch (error: unknown) {
      if (attempt < maxRetryAttempts) {
        logError('Narrative creation failed, retrying', { error, gameId, narrativeId, attempt })
        const command = new InvokeCommand({
          FunctionName: createNarrativeFunctionName,
          InvocationType: 'Event',
          Payload: JSON.stringify({
            gameId,
            narrativeId,
            attempt: attempt + 1,
            generationStartedAt: currentTimestamp,
          }),
        })
        await lambda.send(command)
      } else {
        logError('Narrative creation failed, giving up', { error, gameId, narrativeId, attempt })
      }
    }
  } catch (error: unknown) {
    logError('Failed to create narrative', { error, event })
    throw error
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="handlers/create-narrative"
```

Expected: PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: PASS with coverage thresholds met

- [ ] **Step 6: Commit**

```bash
git add src/handlers/create-narrative.ts __tests__/unit/handlers/create-narrative.test.ts
git commit -m "feat: replace retry loop in createNarrativeHandler with guard and self-invocation"
```

---

## Task 11: Update event JSON files

**Files:**

- Modify: `events/create-game-choices.json`
- Modify: `events/create-narrative.json`

These files are used for local SAM testing, not unit tests.

- [ ] **Step 1: Update `events/create-game-choices.json`**

```json
{
  "gameId": "a-friendly-adventure",
  "generationStartedAt": 1640995200000
}
```

- [ ] **Step 2: Update `events/create-narrative.json`**

```json
{
  "gameId": "a-friendly-adventure",
  "narrativeId": "narrative-0",
  "generationStartedAt": 1640995200000
}
```

- [ ] **Step 3: Commit**

```bash
git add events/create-game-choices.json events/create-narrative.json
git commit -m "chore: update event JSON files to include generationStartedAt"
```

---

## Task 12: Update `template.yaml`

**Files:**

- Modify: `template.yaml`

- [ ] **Step 1: Add `MAX_RETRY_ATTEMPTS`, self-invoke IAM, and function name to `CreateGameFunction`**

In the `CreateGameFunction` resource:

Add to `Environment.Variables`:

```yaml
CREATE_GAME_FUNCTION_NAME: !Ref CreateGameFunction
MAX_RETRY_ATTEMPTS: 3
```

Add a new policy statement to `Policies` (alongside the existing `lambda:InvokeFunction` statement for `CreateGameChoicesFunction`):

```yaml
- Version: 2012-10-17
  Statement:
    - Action:
        - 'lambda:InvokeFunction'
      Effect: Allow
      Resource: !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${CreateGameFunction}'
```

- [ ] **Step 2: Add `MAX_RETRY_ATTEMPTS`, self-invoke IAM, and function name to `CreateGameChoicesFunction`**

In the `CreateGameChoicesFunction` resource:

Add to `Environment.Variables`:

```yaml
CREATE_GAME_CHOICES_FUNCTION_NAME: !Ref CreateGameChoicesFunction
MAX_RETRY_ATTEMPTS: 3
```

Add a new policy statement to `Policies`:

```yaml
- Version: 2012-10-17
  Statement:
    - Action:
        - 'lambda:InvokeFunction'
      Effect: Allow
      Resource: !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${CreateGameChoicesFunction}'
```

- [ ] **Step 3: Add `MAX_RETRY_ATTEMPTS`, self-invoke IAM, and function name to `CreateNarrativeFunction`**

In the `CreateNarrativeFunction` resource:

Add to `Environment.Variables`:

```yaml
CREATE_NARRATIVE_FUNCTION_NAME: !Ref CreateNarrativeFunction
MAX_RETRY_ATTEMPTS: 3
```

Add a new policy statement to `Policies`:

```yaml
- Version: 2012-10-17
  Statement:
    - Action:
        - 'lambda:InvokeFunction'
      Effect: Allow
      Resource: !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${CreateNarrativeFunction}'
```

- [ ] **Step 4: Run the full test suite one final time**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add template.yaml
git commit -m "feat: add self-invoke IAM policies and MAX_RETRY_ATTEMPTS to generation functions"
```
