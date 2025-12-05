# Azure Provider Test Implementation Plan

## Overview

This plan defines a maintainable, DRY test implementation strategy for the refactored Azure provider. The goal is to create reusable test infrastructure that minimizes duplication and makes tests easy to write and maintain.

**Key Principle:** Do everything once, do it right!

---

## Test Architecture

### Three-Layer Testing Strategy

1. **Unit Tests** - Test individual module functions in isolation
2. **Integration Tests** - Test module interactions and provider behavior
3. **E2E Tests** - Test complete request/response flows (with mocked AI SDK)

---

## Reusable Test Infrastructure

### 1. Enhanced Mock Infrastructure

**Location:** `helpers/mocks/` (enhance existing)

#### 1.1 Enhanced GenerateText Mock (`generate-text.ts`)

**Current State:** Basic mock exists with `setupMockGenerateText()`

**Enhancements:**
- Add fluent builder pattern for easier setup
- Add preset result builders
- Add error scenario builders
- Add call tracking and verification
- Add response sequencing (for multi-step scenarios)

**New API:**
```typescript
// Fluent builder
const mock = new GenerateTextMockBuilder()
  .withResult(MOCK_RESULTS.PASS)
  .withDelay(100)
  .withCallTracking()
  .build();

// Preset builders
MOCK_RESULTS.PASS() // Returns pass response
MOCK_RESULTS.ACTION(toolName, input) // Returns action response
MOCK_RESULTS.MULTI_STEP(steps) // Returns multi-step response
MOCK_RESULTS.ERROR(error) // Returns error
MOCK_RESULTS.SCHEMA_ERROR() // Returns schema serialization error
MOCK_RESULTS.NETWORK_ERROR() // Returns network error
MOCK_RESULTS.TIMEOUT() // Returns timeout error

// Call verification
mock.getCallCount() // Number of times called
mock.getLastCall() // Last call arguments
mock.getCalls() // All calls
mock.verifyCalledWith(expectedArgs) // Assertion helper
```

**Key Features:**
- Single source of truth for AI SDK mocking
- Easy to create common scenarios
- Call tracking for verification
- Error scenario presets

#### 1.2 Enhanced Azure Client Mock (`azure-client.ts`)

**Current State:** Basic mock exists

**Enhancements:**
- Add model validation
- Add call tracking
- Add preset configurations

**New API:**
```typescript
const mock = new AzureClientMockBuilder()
  .withModel("gpt-5-mini")
  .withCallTracking()
  .build();

mock.verifyModelUsed(expectedModel)
mock.getCallCount()
```

#### 1.3 Enhanced Event Streamer Mock (`event-streamer.ts`)

**Current State:** Basic mock exists with `mockEventStreamer`

**Enhancements:**
- Add event verification helpers
- Add event sequence verification
- Add event data validation

**New API:**
```typescript
mockEventStreamer.expectEvent(eventType, dataMatcher?)
mockEventStreamer.expectEventSequence(sequence)
mockEventStreamer.verifyAllEvents()
mockEventStreamer.getEventsByType(eventType)
mockEventStreamer.getEventCount(eventType)
```

#### 1.4 Enhanced Logger Mock (`logger.ts`)

**Current State:** Basic mock exists with `createMockLogger()`

**Enhancements:**
- Add log verification helpers
- Add log sequence verification
- Add log level filtering

**New API:**
```typescript
const logger = createMockLogger();
logger.expectLog(method, ...args)
logger.expectLogSequence(sequence)
logger.verifyAllLogs()
logger.getLogsByMethod(method)
logger.getLogCount(method)
```

---

### 2. Enhanced Builders

**Location:** `helpers/builders/` (enhance existing)

#### 2.1 Enhanced Provider Builder (`provider-builder.ts`)

**Current State:** Basic builder exists

**Enhancements:**
- Add preset configurations
- Add mock injection helpers
- Add state validation

**New API:**
```typescript
// Fluent builder with presets
ProviderBuilder.create()
  .withState(GAME_STATE_PRESETS.TWO_FACTIONS([Faction.ATREIDES, Faction.HARKONNEN]))
  .withConfig(CONFIG_PRESETS.WITH_API_KEY("test-key"))
  .withMockGenerateText(mockGenerateText)
  .withMockAzureClient(mockAzureClient)
  .withVerboseLogging()
  .build()

// Presets
ProviderBuilder.withBasicSetup(factions)
ProviderBuilder.withAllFactions()
ProviderBuilder.withCustomConfig(config)
```

#### 2.2 Enhanced Request Builder (`request-builder.ts`)

**Current State:** Basic builder exists

**Enhancements:**
- Add preset request types
- Add context builders
- Add validation

**New API:**
```typescript
RequestBuilder.create()
  .forFaction(Faction.ATREIDES)
  .withType("BID_OR_PASS")
  .withPrompt("Test prompt")
  .withContext({ auctionNumber: 1, currentBid: 0 })
  .withActions(["BID", "PASS"])
  .withTimeout(30000)
  .withUrgent(false)
  .build()

// Presets
RequestBuilder.bidRequest(faction, context)
RequestBuilder.passRequest(faction)
RequestBuilder.peekRequest(faction, cardId)
```

#### 2.3 Response Builder (`response-builder.ts`)

**Current State:** Basic builder exists

**Enhancements:**
- Add preset response types
- Add response sequence builders
- Add validation

**New API:**
```typescript
ResponseBuilder.create()
  .forFaction(Faction.ATREIDES)
  .withActionType("PASS")
  .withData({})
  .withReasoning("Test reasoning")
  .withPassed(true)
  .build()

// Presets
ResponseBuilder.passResponse(faction, reasoning?)
ResponseBuilder.actionResponse(faction, actionType, data, reasoning?)
ResponseBuilder.errorResponse(faction, errorMessage)
```

---

### 3. Enhanced Assertions

**Location:** `helpers/assertions/` (enhance existing)

#### 3.1 Enhanced Provider Assertions (`provider-assertions.ts`)

**Current State:** Basic assertions exist

**Enhancements:**
- Add agent structure validation
- Add tool provider validation
- Add configuration validation
- Add state consistency checks

**New API:**
```typescript
ProviderAssertions.expectAgentCreated(provider, faction)
ProviderAssertions.expectAllAgentsCreated(provider, factions)
ProviderAssertions.expectAgentStructure(provider, faction, structure)
ProviderAssertions.expectToolProviderConfigured(provider, faction, config)
ProviderAssertions.expectStateConsistent(provider)
ProviderAssertions.expectGameIdConsistent(provider, expectedGameId)
```

#### 3.2 Enhanced Response Assertions (`response-assertions.ts`)

**Current State:** Good assertions exist

**Enhancements:**
- Add response structure validation
- Add response data validation
- Add response sequence validation

**New API:**
```typescript
ResponseAssertions.expectValidResponse(response)
ResponseAssertions.expectPassResponse(response, faction)
ResponseAssertions.expectActionResponse(response, faction, actionType)
ResponseAssertions.expectResponseData(response, expectedData)
ResponseAssertions.expectResponseSequence(responses, expectedSequence)
ResponseAssertions.expectResponseCount(responses, expectedCount)
```

#### 3.3 Enhanced State Assertions (`state-assertions.ts`)

**Current State:** Basic assertions exist

**Enhancements:**
- Add state consistency checks
- Add state update validation
- Add state synchronization checks

**New API:**
```typescript
StateAssertions.expectStateUpdated(provider, expectedState)
StateAssertions.expectStateSynced(provider, factions)
StateAssertions.expectStateConsistent(provider)
StateAssertions.expectGameIdUnchanged(provider, originalGameId)
```

#### 3.4 Enhanced Event Assertions (`event-assertions.ts`)

**Current State:** Basic assertions exist

**Enhancements:**
- Add event sequence validation
- Add event data validation
- Add event count validation

**New API:**
```typescript
EventAssertions.expectEventEmitted(events, eventType, dataMatcher?)
EventAssertions.expectEventSequence(events, expectedSequence)
EventAssertions.expectEventCount(events, eventType, expectedCount)
EventAssertions.expectEventData(events, eventType, dataMatcher)
```

#### 3.5 Module-Specific Assertions (NEW)

**Location:** `helpers/assertions/module-assertions.ts` (NEW)

**Purpose:** Assertions for testing refactored modules

**Structure:**
```typescript
// Azure client assertions
export function assertConfigCreated(config, expected)
export function assertClientCreated(client, expectedConfig)
export function assertConfigValidated(config, shouldPass)

// Faction agent assertions
export function assertAgentCreated(agent, faction, state)
export function assertAllAgentsCreated(agents, factions)
export function assertAgentStateUpdated(agent, newState)
export function assertAgentRetrieved(agents, faction, expectedAgent)

// Request processor assertions
export function assertRequestProcessed(result, expectedResponse)
export function assertPromptsBuilt(systemPrompt, userPrompt, faction, request)
export function assertToolsRetrieved(tools, phase)
export function assertResponseParsed(response, expected)
export function assertEventsEmitted(events, expectedEvents)
export function assertLogsCreated(logs, expectedLogs)

// State sync assertions
export function assertStateSyncedFromAgent(agents, faction, expectedState)
export function assertStateSyncedFromAllAgents(agents, expectedState)
export function assertAllAgentsUpdated(agents, newState)

// Error handler assertions
export function assertErrorHandled(error, expectedResponse)
export function assertSchemaErrorDetected(error, expected)
export function assertPassResponseCreated(response, faction, errorMessage)

// Response handler assertions
export function assertToolCallsExtracted(result, expectedCalls)
export function assertToolResultsExtracted(result, expectedResults)
export function assertPassActionDetected(toolName, expected)
export function assertToolDataMerged(input, result, expected)
export function assertResponseParsedCorrectly(response, request, result)
```

---

### 4. Module Test Utilities (NEW)

**Location:** `helpers/module-test-utils.ts` (NEW)

**Purpose:** Utilities for testing individual modules

**Structure:**
```typescript
// Azure client module utilities
export function createTestConfig(overrides?)
export function testConfigCreation(testCases)
export function testClientCreation(testCases)
export function testConfigValidation(testCases)

// Faction agent module utilities
export function createTestAgent(faction, state, gameId)
export function testAgentCreation(testCases)
export function testBatchAgentCreation(testCases)
export function testAgentStateManagement(testCases)
export function testAgentRetrieval(testCases)

// Request processor module utilities
export function createTestRequestProcessorOptions(overrides?)
export function testRequestProcessing(testCases)
export function testPromptBuilding(testCases)
export function testToolPreparation(testCases)
export function testResponseParsing(testCases)
export function testErrorHandling(testCases)

// State sync module utilities
export function createTestAgentsMap(factions, state, gameId)
export function testStateSyncFromAgent(testCases)
export function testStateSyncFromAllAgents(testCases)

// Error handler module utilities
export function testErrorDetection(testCases)
export function testErrorHandling(testCases)
export function testPassResponseCreation(testCases)

// Response handler module utilities
export function createTestGenerateTextResult(overrides?)
export function testToolCallExtraction(testCases)
export function testToolResultExtraction(testCases)
export function testPassActionDetection(testCases)
export function testToolDataMerging(testCases)
export function testResponseParsing(testCases)
```

---

### 5. Test Fixtures (Enhanced)

**Location:** `helpers/fixtures/` (enhance existing)

#### 5.1 Enhanced Game State Fixtures (`game-states.ts`)

**Current State:** Basic presets exist

**Enhancements:**
- Add more preset scenarios
- Add state mutation helpers
- Add validation helpers

**New Presets:**
```typescript
GAME_STATE_PRESETS.EMPTY_FACTIONS() // No factions (edge case)
GAME_STATE_PRESETS.SINGLE_FACTION(faction)
GAME_STATE_PRESETS.TWO_FACTIONS([f1, f2])
GAME_STATE_PRESETS.ALL_FACTIONS()
GAME_STATE_PRESETS.WITH_PHASE(phase, factions)
GAME_STATE_PRESETS.WITH_TURN(turn, factions)
GAME_STATE_PRESETS.WITH_STATE_UPDATES(baseState, updates)
```

#### 5.2 Enhanced Request Fixtures (`requests.ts`)

**Current State:** Basic presets exist

**Enhancements:**
- Add more request type presets
- Add context builders
- Add validation

**New Presets:**
```typescript
REQUEST_PRESETS.BID_OR_PASS(faction, context)
REQUEST_PRESETS.PEEK_CARD(faction, cardId)
REQUEST_PRESETS.SHIP_FORCES(faction, context)
REQUEST_PRESETS.MOVE_FORCES(faction, context)
REQUEST_PRESETS.CREATE_BATTLE_PLAN(faction, context)
REQUEST_PRESETS.WITH_TIMEOUT(request, timeout)
REQUEST_PRESETS.WITH_URGENT(request, urgent)
REQUEST_PRESETS.WITH_ACTIONS(request, actions)
```

#### 5.3 Enhanced Response Fixtures (`responses.ts`)

**Current State:** Basic presets exist

**Enhancements:**
- Add more response type presets
- Add response sequence builders
- Add validation

**New Presets:**
```typescript
RESPONSE_PRESETS.PASS(faction, reasoning?)
RESPONSE_PRESETS.ACTION(faction, actionType, data, reasoning?)
RESPONSE_PRESETS.ERROR(faction, errorMessage)
RESPONSE_PRESETS.SEQUENCE(factions, responses)
```

#### 5.4 Enhanced Config Fixtures (`configs.ts`)

**Current State:** Basic presets exist

**Enhancements:**
- Add more config scenarios
- Add validation helpers

**New Presets:**
```typescript
CONFIG_PRESETS.DEFAULT() // Uses env vars
CONFIG_PRESETS.WITH_API_KEY(key)
CONFIG_PRESETS.WITH_MODEL(model)
CONFIG_PRESETS.WITH_TOKENS(maxTokens)
CONFIG_PRESETS.WITH_TEMPERATURE(temperature)
CONFIG_PRESETS.VERBOSE()
CONFIG_PRESETS.QUIET()
CONFIG_PRESETS.INVALID() // Missing API key
```

---

## Test Organization

### Directory Structure

```
__tests__/
├── azure-provider.test.ts          # Main integration test file (existing, enhance)
├── helpers/                        # Reusable test infrastructure
│   ├── mocks/                      # Mock implementations (enhance existing)
│   │   ├── index.ts
│   │   ├── generate-text.ts        # Enhanced with builder pattern
│   │   ├── azure-client.ts         # Enhanced with tracking
│   │   ├── event-streamer.ts       # Enhanced with verification
│   │   └── logger.ts               # Enhanced with verification
│   ├── builders/                   # Fluent API builders (enhance existing)
│   │   ├── index.ts
│   │   ├── provider-builder.ts     # Enhanced with presets
│   │   ├── request-builder.ts      # Enhanced with presets
│   │   └── response-builder.ts     # Enhanced with presets
│   ├── assertions/                 # Assertion library (enhance existing)
│   │   ├── index.ts
│   │   ├── provider-assertions.ts  # Enhanced
│   │   ├── response-assertions.ts  # Enhanced
│   │   ├── state-assertions.ts     # Enhanced
│   │   ├── event-assertions.ts     # Enhanced
│   │   └── module-assertions.ts    # NEW: Module-specific assertions
│   ├── fixtures/                   # Test data (enhance existing)
│   │   ├── index.ts
│   │   ├── game-states.ts          # Enhanced with more presets
│   │   ├── requests.ts             # Enhanced with more presets
│   │   ├── responses.ts             # Enhanced with more presets
│   │   └── configs.ts              # Enhanced with more presets
│   ├── module-test-utils.ts        # NEW: Module testing utilities
│   └── utils/                      # General utilities (existing)
│       ├── index.ts
│       └── test-utils.ts
├── unit/                           # NEW: Unit tests for modules
│   ├── azure-client.test.ts        # Azure client module tests
│   ├── faction-agent.test.ts       # Faction agent module tests
│   ├── request-processor.test.ts   # Request processor module tests
│   ├── state-sync.test.ts          # State sync module tests
│   ├── error-handler.test.ts       # Error handler module tests
│   └── response-handler.test.ts    # Response handler module tests
├── integration/                    # NEW: Integration tests
│   ├── provider-integration.test.ts # Full provider integration tests
│   ├── request-flow.test.ts        # Request processing flow tests
│   ├── state-sync-flow.test.ts     # State synchronization flow tests
│   └── error-handling-flow.test.ts # Error handling flow tests
└── TEST-IMPLEMENTATION-PLAN.md     # This file
```

---

## Implementation Strategy

### Phase 1: Foundation (Reusable Infrastructure)

**Priority: HIGH - Do this first, everything else depends on it**

#### 1.1 Enhance Mock Infrastructure
- [ ] Enhance `generate-text.ts` with builder pattern and presets
- [ ] Enhance `azure-client.ts` with tracking and validation
- [ ] Enhance `event-streamer.ts` with verification helpers
- [ ] Enhance `logger.ts` with verification helpers
- **Why first:** All tests need mocks, so they must be solid and easy to use

#### 1.2 Enhance Builders
- [ ] Enhance `provider-builder.ts` with presets and mock injection
- [ ] Enhance `request-builder.ts` with presets
- [ ] Enhance `response-builder.ts` with presets
- **Why second:** Builders are used by all tests

#### 1.3 Enhance Assertions
- [ ] Enhance existing assertion classes
- [ ] Create `module-assertions.ts` for module-specific assertions
- **Why third:** All tests need assertions

#### 1.4 Enhance Fixtures
- [ ] Enhance `game-states.ts` with more presets
- [ ] Enhance `requests.ts` with more presets
- [ ] Enhance `responses.ts` with more presets
- [ ] Enhance `configs.ts` with more presets
- **Why fourth:** Fixtures provide test data

### Phase 2: Module Utilities

#### 2.1 Create Module Test Utils
- [ ] Create `module-test-utils.ts` with utilities for each module
- [ ] Add test case runners for common patterns
- **Why fifth:** Needed for unit tests

### Phase 3: Unit Tests

#### 3.1 Write Unit Tests for Modules
- [ ] `unit/azure-client.test.ts` - Config creation, client creation, validation
- [ ] `unit/faction-agent.test.ts` - Agent creation, state management, retrieval
- [ ] `unit/request-processor.test.ts` - Request processing, prompts, tools, parsing, errors
- [ ] `unit/state-sync.test.ts` - State synchronization (single, all, edge cases)
- [ ] `unit/error-handler.test.ts` - Error detection, handling, pass responses
- [ ] `unit/response-handler.test.ts` - Tool extraction, parsing, merging
- **Why sixth:** Test modules in isolation first

### Phase 4: Integration Tests

#### 4.1 Write Integration Tests
- [ ] `integration/provider-integration.test.ts` - Full provider integration
- [ ] `integration/request-flow.test.ts` - Complete request processing flow
- [ ] `integration/state-sync-flow.test.ts` - State synchronization flows
- [ ] `integration/error-handling-flow.test.ts` - Error handling flows
- **Why seventh:** Test module interactions

### Phase 5: Enhance Main Test File

#### 5.1 Enhance Existing Test File
- [ ] Enhance `azure-provider.test.ts` with new infrastructure
- [ ] Add tests for refactored modules
- [ ] Add tests for new functionality
- [ ] Verify all existing tests still pass
- **Why eighth:** Integrate everything together

---

## Test Writing Patterns

### Unit Test Pattern

```typescript
import { describe, test } from './helpers/utils/test-utils';
import { assertConfigCreated, assertClientCreated } from './helpers/assertions/module-assertions';
import { createTestConfig, testConfigCreation } from './helpers/module-test-utils';
import { createAgentConfig, createAzureClient } from '../../provider/azure-client';

describe('Azure Client Module', () => {
  describe('createAgentConfig', () => {
    test('should create config with defaults', () => {
      const config = createAgentConfig({ apiKey: 'test-key' });
      assertConfigCreated(config, {
        apiKey: 'test-key',
        model: expect.any(String),
        maxTokens: 1024,
        temperature: 0.7,
        verbose: false,
      });
    });

    test('should throw on missing API key', () => {
      expect(() => createAgentConfig({})).toThrow('OPENAI_API_KEY or AZURE_API_KEY is required');
    });
  });
});
```

### Integration Test Pattern

```typescript
import { describe, test } from './helpers/utils/test-utils';
import { ProviderBuilder } from './helpers/builders';
import { RequestBuilder } from './helpers/builders';
import { ResponseAssertions, EventAssertions } from './helpers/assertions';
import { GAME_STATE_PRESETS, CONFIG_PRESETS } from './helpers/fixtures';
import { setupMockGenerateText, MOCK_RESULTS } from './helpers/mocks';
import { Faction } from '@/lib/game/types';

describe('Provider Integration', () => {
  test('should process request and return response', async () => {
    const state = GAME_STATE_PRESETS.TWO_FACTIONS([Faction.ATREIDES, Faction.HARKONNEN]);
    const { provider, cleanup } = ProviderBuilder.create()
      .withState(state)
      .withConfig(CONFIG_PRESETS.WITH_API_KEY('test-key'))
      .build();

    const mockCleanup = setupMockGenerateText({
      result: MOCK_RESULTS.PASS(),
    });

    try {
      const request = RequestBuilder.create()
        .forFaction(Faction.ATREIDES)
        .withType('BID_OR_PASS')
        .withPrompt('Test')
        .build();

      const responses = await provider.getResponses([request], false);

      ResponseAssertions.expectResponseCount(responses, 1);
      ResponseAssertions.expectPassResponse(responses[0], Faction.ATREIDES);
      EventAssertions.expectEventEmitted(mockEventStreamer.getEvents(), 'AGENT_THINKING');
      EventAssertions.expectEventEmitted(mockEventStreamer.getEvents(), 'AGENT_DECISION');
    } finally {
      mockCleanup();
      cleanup();
    }
  });
});
```

---

## Key Principles

### DRY (Don't Repeat Yourself)

- **One place for mocks** - Enhanced mock infrastructure
- **One place for builders** - Enhanced builders with presets
- **One place for assertions** - Enhanced assertions
- **One place for fixtures** - Enhanced fixtures
- **One place for module utilities** - Module test utils

### Maintainability

- **Clear organization** - Unit, integration, main tests separated
- **Descriptive names** - Test names explain what they test
- **Helper functions** - Complex logic in helpers, not tests
- **Type safety** - TypeScript for all test code
- **Documentation** - Comments for complex test logic

### Testability

- **Pure functions** - Module functions are easy to test
- **Isolated tests** - Each test is independent
- **Fast tests** - Unit tests run quickly
- **Deterministic** - Tests produce same results every time
- **Mockable** - External dependencies are easily mocked

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Enhance `helpers/mocks/generate-text.ts`
- [ ] Enhance `helpers/mocks/azure-client.ts`
- [ ] Enhance `helpers/mocks/event-streamer.ts`
- [ ] Enhance `helpers/mocks/logger.ts`
- [ ] Enhance `helpers/builders/provider-builder.ts`
- [ ] Enhance `helpers/builders/request-builder.ts`
- [ ] Enhance `helpers/builders/response-builder.ts`
- [ ] Enhance `helpers/assertions/provider-assertions.ts`
- [ ] Enhance `helpers/assertions/response-assertions.ts`
- [ ] Enhance `helpers/assertions/state-assertions.ts`
- [ ] Enhance `helpers/assertions/event-assertions.ts`
- [ ] Create `helpers/assertions/module-assertions.ts`
- [ ] Enhance `helpers/fixtures/game-states.ts`
- [ ] Enhance `helpers/fixtures/requests.ts`
- [ ] Enhance `helpers/fixtures/responses.ts`
- [ ] Enhance `helpers/fixtures/configs.ts`

### Phase 2: Module Utilities
- [ ] Create `helpers/module-test-utils.ts`

### Phase 3: Unit Tests
- [ ] Write `unit/azure-client.test.ts`
- [ ] Write `unit/faction-agent.test.ts`
- [ ] Write `unit/request-processor.test.ts`
- [ ] Write `unit/state-sync.test.ts`
- [ ] Write `unit/error-handler.test.ts`
- [ ] Write `unit/response-handler.test.ts`

### Phase 4: Integration Tests
- [ ] Write `integration/provider-integration.test.ts`
- [ ] Write `integration/request-flow.test.ts`
- [ ] Write `integration/state-sync-flow.test.ts`
- [ ] Write `integration/error-handling-flow.test.ts`

### Phase 5: Enhance Main Tests
- [ ] Enhance `azure-provider.test.ts`
- [ ] Verify all tests pass
- [ ] Add missing test cases from test definition

---

## Success Criteria

✅ All module functions have unit tests  
✅ All module interactions have integration tests  
✅ All test cases from test definition are covered  
✅ All tests use reusable infrastructure (no duplication)  
✅ Tests are easy to write and maintain  
✅ Tests run fast (unit tests < 1s each)  
✅ Tests are deterministic and reliable  
✅ Test coverage > 90% for all modules  
✅ All mocks are centralized and reusable  
✅ All assertions are centralized and reusable  
✅ All fixtures are centralized and reusable  

---

## Next Steps

1. **Start with Phase 1 (Foundation)** - Build the reusable infrastructure
   - This is the most important phase
   - Everything else depends on it
   - Do it once, do it right!

2. **Then Phase 2 (Module Utilities)** - Build module-specific helpers

3. **Then Phase 3 (Unit Tests)** - Write unit tests using the infrastructure

4. **Then Phase 4 (Integration Tests)** - Write integration tests

5. **Finally Phase 5 (Enhance Main Tests)** - Integrate everything

**Remember:** Do everything once, and do it right! Build the infrastructure first, then write tests using it.

