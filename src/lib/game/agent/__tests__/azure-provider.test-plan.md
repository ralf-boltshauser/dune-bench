# Azure Provider Test Plan

Comprehensive test suite to verify the refactored Azure provider maintains exact functionality.

## Test Structure

```
__tests__/
├── azure-provider.test.ts          # Main test file
├── helpers/
│   ├── test-state-builder.ts      # Game state builder for tests
│   ├── mock-azure-client.ts       # Mock Azure OpenAI client
│   ├── mock-generate-text.ts      # Mock generateText function
│   ├── assertions.ts              # Assertion helpers
│   └── fixtures.ts                # Test data constants
└── README.md                      # This file
```

## Test Categories

### 1. Agent Creation Tests

**Purpose:** Verify agents are created correctly for each faction.

#### 1.1 Basic Agent Creation
- ✅ Create provider with 2 factions → 2 agents created
- ✅ Create provider with all 6 factions → 6 agents created
- ✅ Each agent has correct faction assigned
- ✅ Each agent has tool provider initialized
- ✅ Tool providers have streaming enabled with correct gameId
- ✅ Agents are stored in Map with correct keys

#### 1.2 Faction-Specific Agent Creation
- ✅ Atreides agent created with correct tool provider
- ✅ Bene Gesserit agent created with correct tool provider
- ✅ Emperor agent created with correct tool provider
- ✅ Fremen agent created with correct tool provider
- ✅ Harkonnen agent created with correct tool provider
- ✅ Spacing Guild agent created with correct tool provider

#### 1.3 Edge Cases
- ❌ Create provider with empty factions → throws error or handles gracefully
- ❌ Create provider with duplicate factions → handles correctly
- ✅ Create provider with single faction → single agent created

### 2. Tool Provider Setup Tests

**Purpose:** Verify tool providers are configured correctly.

#### 2.1 Tool Provider Initialization
- ✅ Tool provider created with correct initial state
- ✅ Tool provider created with correct faction
- ✅ Tool provider has streaming enabled
- ✅ Tool provider gameId matches provider gameId
- ✅ Tool provider can get tools for current phase

#### 2.2 Tool Provider State Management
- ✅ updateState() updates all tool providers
- ✅ getState() returns state from tool provider
- ✅ Tool provider state stays in sync with provider state
- ✅ Multiple tool providers can have different states (before sync)

#### 2.3 Tool Provider Methods
- ✅ setOrnithopterAccessOverride() works for specific faction
- ✅ setOrnithopterAccessOverride() with undefined clears override
- ✅ setOrnithopterAccessOverride() for non-existent faction → no error
- ✅ getToolsForCurrentPhase() returns correct tools for phase
- ✅ Tool providers are independent per faction

### 3. Agent Response Processing Tests

**Purpose:** Verify agent responses are processed correctly.

#### 3.1 Successful Response Processing
- ✅ Single request → single response returned
- ✅ Multiple requests (sequential) → multiple responses in order
- ✅ Multiple requests (simultaneous) → all responses returned
- ✅ Response contains correct factionId
- ✅ Response contains correct actionType
- ✅ Response contains correct data
- ✅ Response contains reasoning when available
- ✅ Response passed flag is set correctly

#### 3.2 Tool Call Processing
- ✅ Response with tool call → actionType is tool name (uppercase)
- ✅ Response with pass tool → passed flag is true
- ✅ Response with action tool → passed flag is false
- ✅ Tool input merged with tool result data
- ✅ Tool result data takes precedence over input
- ✅ Multiple tool calls → uses last tool call
- ✅ No tool calls → returns PASS response
- ✅ Empty tool input handled correctly
- ✅ Empty tool result handled correctly
- ✅ Conflicting keys handled (result takes precedence)
- ✅ Nested data structures handled correctly

#### 3.3 Response Parsing
- ✅ AI SDK 5.x format (input/output properties) parsed correctly
- ✅ Tool result data extracted from nested structure
- ✅ Empty tool result handled correctly
- ✅ Missing tool result handled correctly
- ✅ Response text used as reasoning

#### 3.4 Request Processing Flow
- ✅ System prompt built correctly for faction
- ✅ User prompt built correctly from request
- ✅ Tools retrieved for current phase
- ✅ generateText called with correct parameters
- ✅ generateText called with `stopWhen: stepCountIs(10)` for multi-step support
- ✅ Console warnings suppressed during generateText
- ✅ Console warnings restored after generateText
- ✅ Tool calls logged correctly
- ✅ Events emitted (AGENT_THINKING, AGENT_DECISION)
- ✅ Response logged correctly

#### 3.5 Multi-Step Decision Making
- ✅ generateText called with `stopWhen: stepCountIs(10)`
- ✅ Agent can make up to 10 tool calls in sequence
- ✅ 11th step is stopped correctly
- ✅ All tool calls from all steps are logged (not just last)
- ✅ Last tool call determines response (not first)
- ✅ Multi-step workflow works (view → analyze → action)
- ✅ Tool calls from multiple steps are all processed

#### 3.6 Phase-Specific Tools
- ✅ Tools retrieved match current phase
- ✅ Tools change when phase changes
- ✅ Information tools always available
- ✅ Karama tools available in all phases
- ✅ Phase-specific tools only in correct phase
- ✅ getToolsForCurrentPhase() returns correct tools for each phase

### 4. State Synchronization Tests

**Purpose:** Verify state synchronization works correctly.

#### 4.1 Sequential State Sync
- ✅ Single agent acts → state synced to all other agents
- ✅ Multiple agents act sequentially → each sees previous agent's state
- ✅ State from acting agent propagated to all others
- ✅ Internal gameState updated after sync
- ✅ All tool providers have same state after sync

#### 4.2 Simultaneous State Sync
- ✅ Multiple agents act simultaneously → state synced from all
- ✅ Latest state from any agent used for sync
- ✅ All agents updated with latest state
- ✅ Internal gameState updated with latest state

#### 4.3 State Sync Edge Cases
- ✅ Sync when agent doesn't exist → returns current state
- ✅ Sync with empty agents map → returns current state
- ✅ Sync when no agents acted → state unchanged
- ✅ State sync preserves gameId
- ✅ State sync preserves all game state properties

#### 4.4 State Update Flow
- ✅ updateState() updates internal state
- ✅ updateState() updates all tool providers
- ✅ getState() returns latest state from tool provider
- ✅ getState() falls back to internal state if no agents
- ✅ State updates are reflected in subsequent requests

### 5. Error Handling Tests

**Purpose:** Verify error handling works correctly.

#### 5.1 General Error Handling
- ✅ Network error → returns PASS response with error message
- ✅ Timeout error → returns PASS response with error message
- ✅ Unknown error → returns PASS response with "Unknown error"
- ✅ Error logged via logger.agentError()
- ✅ Error response has correct factionId
- ✅ Error response has actionType "PASS"
- ✅ Error response has passed: true
- ✅ Error response has reasoning with error message

#### 5.2 Schema Serialization Error Handling
- ✅ Schema serialization error detected correctly
- ✅ Schema serialization error throws descriptive error
- ✅ Thrown error has name "SchemaSerializationError"
- ✅ Thrown error includes factionId in message
- ✅ Thrown error includes helpful diagnostic message
- ✅ Schema serialization error NOT logged (will be re-thrown)
- ✅ Schema serialization error propagates to caller

#### 5.3 Missing Agent Error
- ✅ Request for non-existent faction → throws error
- ✅ Error message includes factionId
- ✅ Error thrown before processing starts

#### 5.4 Configuration Errors
- ✅ Missing API key → throws error in constructor
- ✅ Error message indicates which env vars needed
- ✅ Invalid config values handled (if applicable)

### 6. Configuration Tests

**Purpose:** Verify configuration handling works correctly.

#### 6.1 Config Defaults
- ✅ No config provided → uses defaults
- ✅ Default maxTokens is 1024
- ✅ Default temperature is 0.7
- ✅ Default verbose is false
- ✅ Default model from getAzureModel()
- ✅ Default API key from getAzureApiKey()

#### 6.2 Config Overrides
- ✅ Custom apiKey used when provided
- ✅ Custom model used when provided
- ✅ Custom maxTokens used when provided
- ✅ Custom temperature used when provided
- ✅ Custom verbose used when provided

#### 6.3 Azure Client Creation
- ✅ Azure client created with correct resourceName
- ✅ Azure client created with correct apiKey
- ✅ Azure client created with correct apiVersion
- ✅ Azure client uses responses() API

### 7. Logging Tests

**Purpose:** Verify logging works correctly.

#### 7.1 Logger Creation
- ✅ Logger created with verbose flag from config
- ✅ getLogger() returns logger instance
- ✅ Logger is same instance throughout provider lifecycle

#### 7.2 Request Logging
- ✅ agentRequest() called with correct parameters
- ✅ agentThinking() called for each request
- ✅ agentToolCall() called for each tool call
- ✅ agentResponse() called with correct parameters
- ✅ agentError() called for non-schema errors

#### 7.3 Logging Edge Cases
- ✅ Logging works with verbose: false
- ✅ Logging works with verbose: true
- ✅ No errors when logger methods called
- ✅ All tool calls logged (not just last one)
- ✅ Logging with multiple steps works
- ✅ Logging with no tool calls works

### 8. Event Emission Tests

**Purpose:** Verify events are emitted correctly.

#### 8.1 AGENT_THINKING Event
- ✅ Event emitted before generateText call
- ✅ Event has correct gameId
- ✅ Event has correct faction
- ✅ Event has correct requestType
- ✅ Event has correct phase
- ✅ Event has correct prompt

#### 8.2 AGENT_DECISION Event
- ✅ Event emitted after response parsed
- ✅ Event has correct gameId
- ✅ Event has correct faction
- ✅ Event has correct actionType
- ✅ Event has correct reasoning
- ✅ Event has correct data

#### 8.3 Event Emission Order
- ✅ AGENT_THINKING emitted before generateText
- ✅ AGENT_DECISION emitted after response parsed
- ✅ Events emitted in correct order
- ✅ Events not emitted on error (or verify error handling)

### 9. Prompt Building Tests

**Purpose:** Verify prompts are built correctly.

#### 9.1 System Prompt Building
- ✅ System prompt includes general prompt
- ✅ System prompt includes faction-specific prompt
- ✅ System prompt includes faction name
- ✅ System prompt includes game rules summary
- ✅ System prompt includes response format
- ✅ Different factions get different prompts

#### 9.2 User Prompt Building
- ✅ User prompt includes request prompt
- ✅ User prompt includes context (formatted)
- ✅ User prompt includes available actions
- ✅ Empty context handled correctly
- ✅ Empty availableActions handled correctly

#### 9.3 Faction-Specific Content
- ✅ Prompt includes faction-specific abilities (e.g., Fremen free placement)
- ✅ Prompt matches faction prompt constant exactly
- ✅ Different factions get different content
- ✅ Faction name correctly formatted in prompt
- ✅ Faction-specific strategic priorities included

### 10. Factory Function Tests

**Purpose:** Verify factory function works correctly.

#### 10.1 createAgentProvider
- ✅ Factory creates AzureAgentProvider instance
- ✅ Factory passes state correctly
- ✅ Factory passes config correctly
- ✅ Factory works with no config
- ✅ Factory works with partial config

### 11. Integration Tests

**Purpose:** Verify all components work together.

#### 11.1 Full Request Flow
- ✅ Create provider → create request → get response → verify response
- ✅ Multiple sequential requests → all processed correctly
- ✅ Multiple simultaneous requests → all processed correctly
- ✅ State updates between requests → reflected correctly

#### 11.2 State Lifecycle
- ✅ Initial state → update state → get state → verify consistency
- ✅ Multiple state updates → all agents stay in sync
- ✅ State from tool execution → propagated correctly

#### 11.3 Error Recovery
- ✅ Error in one request → doesn't affect other requests
- ✅ Error logged → provider continues to work
- ✅ Schema error → propagates correctly

#### 11.4 Multi-Step Workflow
- ✅ Agent makes multiple tool calls in sequence
- ✅ All steps are processed correctly
- ✅ Response uses last tool call
- ✅ All tool calls are logged
- ✅ Up to 10 steps allowed
- ✅ 11th step is stopped

#### 11.5 Phase Transitions
- ✅ Tools update when phase changes
- ✅ Agent can still respond after phase change
- ✅ State sync works across phase changes
- ✅ Tool provider reflects new phase

#### 11.6 GameId Consistency
- ✅ gameId consistent across all operations
- ✅ gameId used in streaming config
- ✅ gameId used in events
- ✅ gameId doesn't change after state updates
- ✅ gameId matches initial state gameId

## Test Implementation Strategy

### Mocking Strategy

1. **Mock Azure OpenAI Client**
   - Mock `createAzure()` to return mock client
   - Mock `client.responses()` to return mock model
   - Mock `generateText()` to return controlled responses

2. **Mock Event Streamer**
   - Mock `eventStreamer.emit()` to track events
   - Verify events are emitted with correct data

3. **Mock Logger**
   - Mock logger methods to track calls
   - Verify logging calls with correct parameters

4. **Mock Tool Provider (if needed)**
   - For isolated tests, mock tool provider
   - For integration tests, use real tool provider

### Test Data

- Use `createGameState()` for real game states
- Use test fixtures for common scenarios
- Use minimal states for focused tests

### Assertions

- Custom assertion helpers for:
  - Agent structure validation
  - Response validation
  - State equality
  - Event validation
  - Error validation

## Negative Test Cases

### Invalid Inputs
- ❌ Null/undefined state
- ❌ Invalid faction in request
- ❌ Missing required request fields
- ❌ Invalid config values

### Edge Cases
- ❌ Empty factions map
- ❌ Request for faction not in game
- ❌ State update with invalid state
- ❌ Simultaneous requests with same faction
- ❌ Empty request array
- ❌ Duplicate faction requests
- ❌ Invalid requestType
- ❌ Missing context fields
- ❌ Timeout handling (if implemented)
- ❌ Urgent flag handling (if implemented)

### Error Scenarios
- ❌ API key missing
- ❌ Network failure
- ❌ Timeout
- ❌ Invalid response format
- ❌ Tool provider error
- ❌ Console suppression restore on error
- ❌ Only schema warnings suppressed (other warnings still appear)

## Test Coverage Goals

- **Line Coverage:** >90%
- **Branch Coverage:** >85%
- **Function Coverage:** 100%
- **Edge Cases:** All identified cases covered

## Test Execution

```bash
# Run all Azure provider tests
pnpm test:agent:provider

# Run specific test category
pnpm test:agent:provider --category=creation
pnpm test:agent:provider --category=responses
pnpm test:agent:provider --category=sync
pnpm test:agent:provider --category=errors
```

## Success Criteria

✅ All tests pass  
✅ All functionality preserved from original  
✅ All edge cases handled  
✅ Error handling works correctly  
✅ State synchronization works correctly  
✅ No regressions introduced  

