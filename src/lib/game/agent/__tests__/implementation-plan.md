# Azure Provider Test Implementation Plan

## Overview

Comprehensive, maintainable test implementation following DRY principles. All reusable components created once and used throughout.

## Directory Structure

```
__tests__/
├── azure-provider.test.ts          # Main test file (organized by category)
├── helpers/
│   ├── index.ts                    # Re-exports all helpers
│   ├── mocks/
│   │   ├── index.ts                # Re-exports all mocks
│   │   ├── azure-client.ts         # Mock Azure OpenAI client
│   │   ├── generate-text.ts        # Mock generateText function
│   │   ├── event-streamer.ts       # Mock event streamer
│   │   └── logger.ts               # Mock logger
│   ├── fixtures/
│   │   ├── index.ts                # Re-exports all fixtures
│   │   ├── game-states.ts          # Game state presets
│   │   ├── requests.ts             # Agent request presets
│   │   ├── responses.ts            # Agent response presets
│   │   └── configs.ts              # Config presets
│   ├── builders/
│   │   ├── index.ts                # Re-exports all builders
│   │   ├── provider-builder.ts    # Fluent provider builder
│   │   ├── request-builder.ts     # Fluent request builder
│   │   └── response-builder.ts    # Fluent response builder
│   ├── assertions/
│   │   ├── index.ts                # Re-exports all assertions
│   │   ├── provider-assertions.ts # Provider structure assertions
│   │   ├── response-assertions.ts  # Response validation
│   │   ├── state-assertions.ts    # State validation
│   │   ├── event-assertions.ts    # Event validation
│   │   └── prompt-assertions.ts   # Prompt validation
│   └── utils/
│       ├── index.ts                # Re-exports all utils
│       ├── test-utils.ts           # General test utilities
│       └── phase-utils.ts          # Phase-specific utilities
└── README.md                       # Documentation
```

## Implementation Phases

### Phase 1: Foundation - Mocks (Do Once, Use Everywhere)

**Goal:** Create reusable mocks that eliminate duplication.

#### 1.1 Mock Azure Client (`helpers/mocks/azure-client.ts`)

**Purpose:** Single source of truth for Azure OpenAI client mocking.

```typescript
export interface MockAzureClient {
  responses: (model: string) => MockModel;
  // ... other methods if needed
}

export interface MockModel {
  // Model interface for generateText
}

export function createMockAzureClient(): MockAzureClient {
  // Returns mock client with responses() method
}

export function resetMockAzureClient(): void {
  // Resets mock state between tests
}
```

**Usage:**
- Mock `createAzure()` to return this
- All tests use same mock structure
- Easy to extend for new test cases

#### 1.2 Mock GenerateText (`helpers/mocks/generate-text.ts`)

**Purpose:** Control generateText responses in tests.

```typescript
export interface MockGenerateTextResult {
  text?: string;
  steps?: Array<{
    toolCalls?: Array<{ toolName: string; input?: Record<string, unknown> }>;
    toolResults?: Array<{ output?: { data?: Record<string, unknown> } }>;
  }>;
}

export interface MockGenerateTextOptions {
  result?: MockGenerateTextResult;
  error?: Error;
  delay?: number;
}

export function setupMockGenerateText(
  options: MockGenerateTextOptions
): () => void {
  // Sets up mock, returns cleanup function
}

export function createMockResult(
  toolCalls?: Array<{ toolName: string; input?: Record<string, unknown> }>,
  toolResults?: Array<{ output?: { data?: Record<string, unknown> } }>,
  text?: string
): MockGenerateTextResult {
  // Factory for creating mock results
}

// Presets for common scenarios
export const MOCK_RESULTS = {
  PASS: createMockResult([{ toolName: 'pass', input: {} }]),
  SINGLE_TOOL_CALL: (toolName: string, input: Record<string, unknown>) =>
    createMockResult([{ toolName, input }]),
  MULTI_STEP: (steps: Array<{ toolName: string; input?: Record<string, unknown> }>) =>
    createMockResult(steps),
  NO_TOOL_CALLS: createMockResult([], [], 'No action taken'),
};
```

**Usage:**
- All tests use same mock setup
- Presets for common scenarios
- Easy to create custom results

#### 1.3 Mock Event Streamer (`helpers/mocks/event-streamer.ts`)

**Purpose:** Track and verify event emissions.

```typescript
export interface CapturedEvent {
  type: string;
  gameId: string;
  data: unknown;
  timestamp: number;
}

export class MockEventStreamer {
  private events: CapturedEvent[] = [];

  async emit(type: string, gameId: string, data: unknown): Promise<void> {
    this.events.push({ type, gameId, data, timestamp: Date.now() });
  }

  getEvents(): CapturedEvent[] {
    return [...this.events];
  }

  getEventsByType(type: string): CapturedEvent[] {
    return this.events.filter(e => e.type === type);
  }

  clear(): void {
    this.events = [];
  }

  // Helper methods
  hasEvent(type: string, gameId?: string): boolean;
  getLastEvent(): CapturedEvent | undefined;
  getEventCount(type: string): number;
}

export const mockEventStreamer = new MockEventStreamer();
```

**Usage:**
- Single instance used across all tests
- Easy to verify events
- Helper methods for common checks

#### 1.4 Mock Logger (`helpers/mocks/logger.ts`)

**Purpose:** Track logging calls.

```typescript
export interface LogCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

export class MockLogger {
  private calls: LogCall[] = [];

  agentRequest(faction: Faction, requestType: string, prompt: string): void {
    this.record('agentRequest', [faction, requestType, prompt]);
  }

  agentThinking(faction: Faction): void {
    this.record('agentThinking', [faction]);
  }

  agentToolCall(faction: Faction, toolName: string, input: Record<string, unknown>): void {
    this.record('agentToolCall', [faction, toolName, input]);
  }

  agentResponse(faction: Faction, actionType: string, duration: number, reasoning?: string): void {
    this.record('agentResponse', [faction, actionType, duration, reasoning]);
  }

  agentError(factionId: Faction, error: string): void {
    this.record('agentError', [factionId, error]);
  }

  private record(method: string, args: unknown[]): void {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  getCalls(): LogCall[] {
    return [...this.calls];
  }

  getCallsByMethod(method: string): LogCall[] {
    return this.calls.filter(c => c.method === method);
  }

  clear(): void {
    this.calls = [];
  }

  // Helper methods
  wasCalled(method: string): boolean;
  getCallCount(method: string): number;
  getLastCall(): LogCall | undefined;
}

export function createMockLogger(): MockLogger {
  return new MockLogger();
}
```

**Usage:**
- Create instance per test or use shared
- Easy to verify logging
- Helper methods for common checks

### Phase 2: Foundation - Fixtures (Single Source of Truth)

**Goal:** Reusable test data, no duplication.

#### 2.1 Game State Fixtures (`helpers/fixtures/game-states.ts`)

```typescript
import { createGameState, type GameState } from '../../../state';
import { Faction } from '../../../types';

export const GAME_STATE_PRESETS = {
  // Minimal states
  TWO_FACTIONS: (factions: [Faction, Faction]) =>
    createGameState({ factions, maxTurns: 1 }),

  ALL_FACTIONS: () =>
    createGameState({
      factions: [
        Faction.ATREIDES,
        Faction.BENE_GESSERIT,
        Faction.EMPEROR,
        Faction.FREMEN,
        Faction.HARKONNEN,
        Faction.SPACING_GUILD,
      ],
      maxTurns: 1,
    }),

  SINGLE_FACTION: (faction: Faction) =>
    createGameState({ factions: [faction], maxTurns: 1 }),

  // Phase-specific states
  STORM_PHASE: (factions: Faction[]) =>
    createGameState({ factions, maxTurns: 1, phase: Phase.STORM }),

  BIDDING_PHASE: (factions: Faction[]) =>
    createGameState({ factions, maxTurns: 1, phase: Phase.BIDDING }),

  // ... more presets
} as const;

// Helper to create custom states
export function createTestGameState(
  overrides?: Partial<GameState>
): GameState {
  const base = createGameState({ factions: [Faction.ATREIDES], maxTurns: 1 });
  return { ...base, ...overrides };
}
```

#### 2.2 Request Fixtures (`helpers/fixtures/requests.ts`)

```typescript
import type { AgentRequest } from '../../../phases/types';
import { Faction } from '../../../types';

export const REQUEST_PRESETS = {
  SIMPLE_PASS: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: 'USE_KARAMA',
    prompt: 'Test prompt',
    context: {},
    availableActions: ['PASS'],
  }),

  BIDDING_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: 'BID_OR_PASS',
    prompt: 'Make a bid or pass',
    context: { currentBid: 2, card: 'weapon_1' },
    availableActions: ['BID', 'PASS'],
  }),

  // ... more presets
} as const;

// Builder for custom requests
export function createTestRequest(
  overrides?: Partial<AgentRequest>
): AgentRequest {
  return {
    factionId: Faction.ATREIDES,
    requestType: 'USE_KARAMA',
    prompt: 'Test',
    context: {},
    availableActions: ['PASS'],
    ...overrides,
  };
}
```

#### 2.3 Response Fixtures (`helpers/fixtures/responses.ts`)

```typescript
import type { AgentResponse } from '../../../phases/types';
import { Faction } from '../../../types';

export const RESPONSE_PRESETS = {
  PASS: (faction: Faction, reasoning?: string): AgentResponse => ({
    factionId: faction,
    actionType: 'PASS',
    data: {},
    passed: true,
    reasoning,
  }),

  ACTION: (faction: Faction, actionType: string, data: Record<string, unknown>): AgentResponse => ({
    factionId: faction,
    actionType,
    data,
    passed: false,
  }),

  // ... more presets
} as const;
```

#### 2.4 Config Fixtures (`helpers/fixtures/configs.ts`)

```typescript
import type { AgentConfig } from '../../provider/types';

export const CONFIG_PRESETS = {
  DEFAULT: (): AgentConfig => ({}),

  VERBOSE: (): AgentConfig => ({ verbose: true }),

  CUSTOM_MODEL: (model: string): AgentConfig => ({ model }),

  CUSTOM_TOKENS: (maxTokens: number): AgentConfig => ({ maxTokens }),

  FULL: (overrides?: Partial<AgentConfig>): AgentConfig => ({
    apiKey: 'test-key',
    model: 'test-model',
    maxTokens: 2048,
    temperature: 0.5,
    verbose: true,
    ...overrides,
  }),
} as const;
```

### Phase 3: Foundation - Builders (Fluent APIs)

**Goal:** Easy test setup with fluent APIs.

#### 3.1 Provider Builder (`helpers/builders/provider-builder.ts`)

```typescript
export class ProviderBuilder {
  private state?: GameState;
  private config?: AgentConfig;
  private mocks?: {
    azureClient?: MockAzureClient;
    generateText?: MockGenerateTextOptions;
    eventStreamer?: MockEventStreamer;
    logger?: MockLogger;
  };

  static create(): ProviderBuilder {
    return new ProviderBuilder();
  }

  withState(state: GameState): this {
    this.state = state;
    return this;
  }

  withConfig(config: AgentConfig): this {
    this.config = config;
    return this;
  }

  withMockGenerateText(options: MockGenerateTextOptions): this {
    this.mocks = { ...this.mocks, generateText: options };
    return this;
  }

  withMockLogger(logger: MockLogger): this {
    this.mocks = { ...this.mocks, logger };
    return this;
  }

  build(): {
    provider: AzureAgentProvider;
    mocks: typeof this.mocks;
    cleanup: () => void;
  } {
    // Setup mocks, create provider, return cleanup function
  }
}
```

**Usage:**
```typescript
const { provider, mocks, cleanup } = ProviderBuilder.create()
  .withState(GAME_STATE_PRESETS.TWO_FACTIONS([Faction.ATREIDES, Faction.HARKONNEN]))
  .withConfig(CONFIG_PRESETS.VERBOSE())
  .withMockGenerateText({ result: MOCK_RESULTS.PASS })
  .withMockLogger(mockLogger)
  .build();
```

#### 3.2 Request Builder (`helpers/builders/request-builder.ts`)

```typescript
export class RequestBuilder {
  private request: Partial<AgentRequest> = {};

  static create(): RequestBuilder {
    return new RequestBuilder();
  }

  forFaction(faction: Faction): this {
    this.request.factionId = faction;
    return this;
  }

  withType(type: AgentRequestType): this {
    this.request.requestType = type;
    return this;
  }

  withPrompt(prompt: string): this {
    this.request.prompt = prompt;
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.request.context = context;
    return this;
  }

  withActions(actions: string[]): this {
    this.request.availableActions = actions;
    return this;
  }

  build(): AgentRequest {
    return {
      factionId: Faction.ATREIDES,
      requestType: 'USE_KARAMA',
      prompt: 'Test',
      context: {},
      availableActions: ['PASS'],
      ...this.request,
    };
  }
}
```

#### 3.3 Response Builder (`helpers/builders/response-builder.ts`)

```typescript
export class ResponseBuilder {
  private response: Partial<AgentResponse> = {};

  static create(): ResponseBuilder {
    return new ResponseBuilder();
  }

  forFaction(faction: Faction): this {
    this.response.factionId = faction;
    return this;
  }

  withAction(actionType: string): this {
    this.response.actionType = actionType;
    return this;
  }

  withData(data: Record<string, unknown>): this {
    this.response.data = data;
    return this;
  }

  asPass(reasoning?: string): this {
    this.response.actionType = 'PASS';
    this.response.passed = true;
    this.response.reasoning = reasoning;
    return this;
  }

  build(): AgentResponse {
    return {
      factionId: Faction.ATREIDES,
      actionType: 'PASS',
      data: {},
      passed: true,
      ...this.response,
    };
  }
}
```

### Phase 4: Foundation - Assertions (Reusable Validation)

**Goal:** Single source of truth for assertions.

#### 4.1 Provider Assertions (`helpers/assertions/provider-assertions.ts`)

```typescript
export class ProviderAssertions {
  static expectAgentCreated(
    provider: AzureAgentProvider,
    faction: Faction
  ): void {
    // Verify agent exists
    // Verify agent has correct faction
    // Verify agent has tool provider
  }

  static expectAllAgentsCreated(
    provider: AzureAgentProvider,
    factions: Faction[]
  ): void {
    factions.forEach(f => this.expectAgentCreated(provider, f));
  }

  static expectConfig(
    provider: AzureAgentProvider,
    expected: Partial<AgentConfig>
  ): void {
    // Verify config values
  }

  // ... more assertions
}
```

#### 4.2 Response Assertions (`helpers/assertions/response-assertions.ts`)

```typescript
export class ResponseAssertions {
  static expectValidResponse(response: AgentResponse): void {
    // Basic structure validation
  }

  static expectPassResponse(
    response: AgentResponse,
    faction: Faction
  ): void {
    // Verify pass response
  }

  static expectActionResponse(
    response: AgentResponse,
    faction: Faction,
    actionType: string
  ): void {
    // Verify action response
  }

  static expectResponseData(
    response: AgentResponse,
    expectedData: Record<string, unknown>
  ): void {
    // Verify response data
  }

  // ... more assertions
}
```

#### 4.3 State Assertions (`helpers/assertions/state-assertions.ts`)

```typescript
export class StateAssertions {
  static expectStateSynced(
    provider: AzureAgentProvider,
    expectedState: GameState
  ): void {
    // Verify all agents have same state
  }

  static expectStateUpdated(
    provider: AzureAgentProvider,
    expectedState: GameState
  ): void {
    // Verify state was updated
  }

  // ... more assertions
}
```

#### 4.4 Event Assertions (`helpers/assertions/event-assertions.ts`)

```typescript
export class EventAssertions {
  static expectEventEmitted(
    streamer: MockEventStreamer,
    type: string,
    gameId?: string
  ): void {
    // Verify event was emitted
  }

  static expectEventData(
    streamer: MockEventStreamer,
    type: string,
    expectedData: unknown
  ): void {
    // Verify event data
  }

  static expectEventOrder(
    streamer: MockEventStreamer,
    types: string[]
  ): void {
    // Verify event order
  }

  // ... more assertions
}
```

#### 4.5 Prompt Assertions (`helpers/assertions/prompt-assertions.ts`)

```typescript
export class PromptAssertions {
  static expectSystemPromptIncludes(
    prompt: string,
    content: string
  ): void {
    // Verify prompt includes content
  }

  static expectFactionPrompt(
    prompt: string,
    faction: Faction
  ): void {
    // Verify faction-specific content
  }

  static expectGeneralPrompt(prompt: string): void {
    // Verify general prompt content
  }

  // ... more assertions
}
```

### Phase 5: Test Organization

**Goal:** Organized, maintainable test file.

#### 5.1 Test File Structure (`azure-provider.test.ts`)

```typescript
import { describe, test, beforeEach, afterEach } from './helpers/test-utils';
import { ProviderBuilder } from './helpers/builders';
import { GAME_STATE_PRESETS, REQUEST_PRESETS, CONFIG_PRESETS } from './helpers/fixtures';
import { MOCK_RESULTS, setupMockGenerateText } from './helpers/mocks';
import { ProviderAssertions, ResponseAssertions, EventAssertions } from './helpers/assertions';
import { mockEventStreamer, createMockLogger } from './helpers/mocks';

describe('AzureAgentProvider', () => {
  beforeEach(() => {
    // Reset all mocks
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Agent Creation', () => {
    // Section 1 tests
  });

  describe('Tool Provider Setup', () => {
    // Section 2 tests
  });

  describe('Agent Response Processing', () => {
    // Section 3 tests
  });

  // ... more sections
});
```

#### 5.2 Test Utilities (`helpers/utils/test-utils.ts`)

```typescript
// Simple test framework (matching codebase pattern)
export function test(name: string, fn: () => void | Promise<void>): void {
  // Test runner
}

export function describe(name: string, fn: () => void): void {
  // Describe block
}

export function beforeEach(fn: () => void | Promise<void>): void {
  // Before each hook
}

export function afterEach(fn: () => void | Promise<void>): void {
  // After each hook
}
```

### Phase 6: Implementation Order

1. **Phase 1: Mocks** (Do once, use everywhere)
   - Mock Azure client
   - Mock generateText
   - Mock event streamer
   - Mock logger

2. **Phase 2: Fixtures** (Single source of truth)
   - Game state presets
   - Request presets
   - Response presets
   - Config presets

3. **Phase 3: Builders** (Fluent APIs)
   - Provider builder
   - Request builder
   - Response builder

4. **Phase 4: Assertions** (Reusable validation)
   - Provider assertions
   - Response assertions
   - State assertions
   - Event assertions
   - Prompt assertions

5. **Phase 5: Test Utilities** (Test framework)
   - Test runner
   - Hooks

6. **Phase 6: Write Tests** (Use infrastructure)
   - Write tests using all helpers
   - No duplication
   - Easy to maintain

## Key Principles

### 1. DRY (Don't Repeat Yourself)
- ✅ Mocks created once, reused everywhere
- ✅ Fixtures for all test data
- ✅ Assertions for all validations
- ✅ Builders for all setup

### 2. Single Source of Truth
- ✅ One place for mocks
- ✅ One place for fixtures
- ✅ One place for assertions
- ✅ One place for builders

### 3. Easy to Use
- ✅ Fluent APIs for setup
- ✅ Presets for common scenarios
- ✅ Helper methods for common checks
- ✅ Clear, readable tests

### 4. Easy to Extend
- ✅ Add new presets easily
- ✅ Add new assertions easily
- ✅ Add new builders easily
- ✅ Add new mocks easily

## Example Test (After Implementation)

```typescript
test('should create agent for each faction', () => {
  const { provider } = ProviderBuilder.create()
    .withState(GAME_STATE_PRESETS.ALL_FACTIONS())
    .withConfig(CONFIG_PRESETS.DEFAULT())
    .build();

  ProviderAssertions.expectAllAgentsCreated(provider, [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.HARKONNEN,
    Faction.SPACING_GUILD,
  ]);
});

test('should process request and return response', async () => {
  const mockLogger = createMockLogger();
  const { provider, cleanup } = ProviderBuilder.create()
    .withState(GAME_STATE_PRESETS.TWO_FACTIONS([Faction.ATREIDES, Faction.HARKONNEN]))
    .withMockGenerateText({ result: MOCK_RESULTS.PASS })
    .withMockLogger(mockLogger)
    .build();

  const request = RequestBuilder.create()
    .forFaction(Faction.ATREIDES)
    .withType('USE_KARAMA')
    .build();

  const response = await provider.getResponses([request], false);

  ResponseAssertions.expectPassResponse(response[0], Faction.ATREIDES);
  expect(mockLogger.getCallCount('agentRequest')).toBe(1);
  
  cleanup();
});
```

## Benefits

1. **No Duplication:** Everything created once
2. **Easy to Maintain:** Change in one place affects all tests
3. **Easy to Read:** Tests are clear and concise
4. **Easy to Extend:** Add new tests easily
5. **Comprehensive:** All test cases covered
6. **Fast:** Reusable components reduce setup time

## Success Criteria

✅ All mocks created once and reused  
✅ All fixtures in single source of truth  
✅ All assertions reusable  
✅ All builders provide fluent APIs  
✅ Tests are clear and maintainable  
✅ No code duplication  
✅ Easy to add new tests  

