# Azure Provider Test Definition

Comprehensive test cases to verify the refactored Azure provider maintains exact functionality.

## Test Categories

### 1. Agent Creation Tests

**Purpose:** Verify agents are created correctly for each faction after refactoring.

#### 1.1 Basic Agent Creation
- ✅ **Test:** Create provider with 2 factions → 2 agents created
  - Verify `createAllFactionAgents()` is called
  - Verify agents Map has correct size
  - Verify each faction has an agent
  
- ✅ **Test:** Create provider with all 6 factions → 6 agents created
  - Verify all factions: Atreides, Bene Gesserit, Emperor, Fremen, Harkonnen, Spacing Guild
  - Verify agents Map has size 6
  
- ✅ **Test:** Create provider with single faction → 1 agent created
  - Verify single agent in Map
  - Verify agent has correct faction

#### 1.2 Faction-Specific Agent Creation
- ✅ **Test:** Atreides agent created with correct tool provider
  - Verify agent.faction === Faction.ATREIDES
  - Verify agent.toolProvider exists
  - Verify toolProvider has correct initial state
  
- ✅ **Test:** Bene Gesserit agent created with correct tool provider
- ✅ **Test:** Emperor agent created with correct tool provider
- ✅ **Test:** Fremen agent created with correct tool provider
- ✅ **Test:** Harkonnen agent created with correct tool provider
- ✅ **Test:** Spacing Guild agent created with correct tool provider

#### 1.3 Agent Creation Edge Cases
- ❌ **Test:** Create provider with empty factions map → handles gracefully
  - Should create provider with 0 agents
  - getState() should return initial state
  
- ❌ **Test:** Create provider with invalid faction → handles correctly
  - Should not throw (if validation happens elsewhere)
  
- ✅ **Test:** Agent creation uses correct gameId
  - Verify gameId passed to createAllFactionAgents
  - Verify toolProvider streaming uses correct gameId

### 2. Tool Provider Setup Tests

**Purpose:** Verify tool providers are configured correctly after refactoring.

#### 2.1 Tool Provider Initialization
- ✅ **Test:** Tool provider created with correct initial state
  - Verify toolProvider.getState() matches initial state
  - Verify state.gameId matches
  
- ✅ **Test:** Tool provider created with correct faction
  - Verify toolProvider has access to faction-specific tools
  
- ✅ **Test:** Tool provider has streaming enabled
  - Verify streaming options passed correctly
  - Verify gameId in streaming config

#### 2.2 Tool Provider State Management
- ✅ **Test:** updateState() updates all tool providers
  - Call provider.updateState(newState)
  - Verify all agents' toolProviders have updated state
  - Verify updateAllAgentsState() is called
  
- ✅ **Test:** getState() returns state from tool provider
  - Verify getFactionAgentState() is used
  - Verify state matches toolProvider state
  
- ✅ **Test:** getState() falls back to internal state when no agents
  - Edge case: provider with no agents (shouldn't happen, but test defensive code)

#### 2.3 Tool Provider Methods
- ✅ **Test:** setOrnithopterAccessOverride() works for existing faction
  - Call setOrnithopterAccessOverride(faction, true)
  - Verify toolProvider.setOrnithopterAccessOverride() is called
  
- ❌ **Test:** setOrnithopterAccessOverride() handles non-existent faction
  - Call with faction not in game
  - Should not throw (graceful handling)
  
- ✅ **Test:** setOrnithopterAccessOverride() with undefined clears override
  - Call with undefined
  - Verify override is cleared

### 3. Agent Response Processing Tests

**Purpose:** Verify agent responses are processed correctly through refactored modules.

#### 3.1 Request Processing Flow
- ✅ **Test:** processRequest() delegates to processAgentRequest()
  - Verify getAgent() is called with correct faction
  - Verify processAgentRequest() receives correct options
  - Verify all required options passed: agent, request, azureClient, config, gameState, gameId, logger
  
- ✅ **Test:** timeout parameter passed correctly
  - Create request with timeout
  - Verify timeout is available in request context
  - Note: timeout is handled by phase manager, but verify it's preserved
  
- ✅ **Test:** urgent flag handled correctly
  - Create request with urgent flag
  - Verify urgent flag is available in request context
  - Note: urgent flag is informational, verify it's preserved
  
- ✅ **Test:** availableActions filtering works
  - Create request with availableActions
  - Verify availableActions passed to tool provider
  - Verify tools filtered based on availableActions

#### 3.2 Prompt Building (via request-processor)
- ✅ **Test:** System prompt built correctly for each faction
  - Verify buildSystemPrompt() is called with correct faction
  - Verify prompt contains faction-specific content
  
- ✅ **Test:** User prompt built correctly from request
  - Verify buildUserPrompt() is called with request
  - Verify prompt contains request.prompt

#### 3.3 Tool Preparation
- ✅ **Test:** Tools retrieved from tool provider
  - Verify agent.toolProvider.getToolsForCurrentPhase() is called
  - Verify tools are passed to generateText()

#### 3.4 AI SDK Integration
- ✅ **Test:** generateText() called with correct parameters
  - Verify model: azureClient.responses(config.model)
  - Verify system prompt
  - Verify user prompt
  - Verify tools
  - Verify maxOutputTokens: config.maxTokens
  - Verify stopWhen: stepCountIs(10)

#### 3.5 Response Parsing (via request-processor)
- ✅ **Test:** Response parsed correctly
  - Verify parseAgentResponse() is called
  - Verify response has correct structure
  - Verify response.actionType is set
  - Verify response.reasoning is set
  - Verify response.data is set
  
- ✅ **Test:** extractToolCalls() with empty result.steps
  - Mock result with empty steps array
  - Verify extractToolCalls() returns empty array
  - Verify no errors thrown
  
- ✅ **Test:** extractToolResults() with empty result.steps
  - Mock result with empty steps array
  - Verify extractToolResults() returns empty array
  - Verify no errors thrown
  
- ✅ **Test:** isPassAction() with various pass patterns
  - Test with "pass" in tool name
  - Test with "PASS" in tool name
  - Test with "passAction" in tool name
  - Verify pattern matching works correctly
  
- ✅ **Test:** mergeToolData() with overlapping keys
  - Test with tool input and result data having same keys
  - Verify result data takes precedence
  - Verify all keys from both sources present

#### 3.6 Tool Call Extraction
- ✅ **Test:** Tool calls extracted from result
  - Verify extractToolCalls() is called
  - Verify tool calls are logged
  - Verify logger.agentToolCall() is called for each tool call

#### 3.7 Event Emission
- ✅ **Test:** AGENT_THINKING event emitted
  - Verify eventStreamer.emit() called with AGENT_THINKING
  - Verify event data: faction, requestType, phase, prompt
  
- ✅ **Test:** AGENT_DECISION event emitted
  - Verify eventStreamer.emit() called with AGENT_DECISION
  - Verify event data: faction, actionType, reasoning, data

#### 3.8 Logging
- ✅ **Test:** Request logged correctly
  - Verify logger.agentRequest() called with faction, requestType, prompt
  
- ✅ **Test:** Thinking logged correctly
  - Verify logger.agentThinking() called with faction
  
- ✅ **Test:** Response logged correctly
  - Verify logger.agentResponse() called with faction, actionType, duration, reasoning

#### 3.9 Console Suppression
- ✅ **Test:** Schema warnings suppressed during generateText
  - Verify suppressSchemaWarnings() is called
  - Verify restoreConsole() is called in finally block
  - Verify console is restored even on error

### 4. State Synchronization Tests

**Purpose:** Verify state synchronization works correctly after refactoring.

#### 4.1 Sequential Request State Sync
- ✅ **Test:** State synced after each sequential request
  - Process request for faction A
  - Verify syncStateFromAgent() is called
  - Verify all other agents receive updated state
  - Verify updateAllAgentsState() is called for other agents
  
- ✅ **Test:** State synced correctly between sequential requests
  - Process request 1 for faction A
  - Process request 2 for faction B
  - Verify faction B sees state changes from faction A

#### 4.2 Simultaneous Request State Sync
- ✅ **Test:** State synced after all simultaneous requests
  - Process multiple requests simultaneously
  - Verify syncStateFromAllAgents() is called
  - Verify all agents receive latest state
  - Verify updateAllAgentsState() is called for all agents

#### 4.3 State Sync Edge Cases
- ❌ **Test:** syncStateFromAgent() handles missing agent
  - Call with faction not in agents Map
  - Should return currentState unchanged
  
- ✅ **Test:** syncStateFromAllAgents() uses latest state
  - Multiple agents with different states
  - Verify latest state (from last agent) is used
  - Verify all agents updated to latest state
  
- ✅ **Test:** State remains consistent during simultaneous requests
  - Process multiple simultaneous requests
  - Verify state doesn't get corrupted
  - Verify all agents see consistent state after sync
  
- ✅ **Test:** State remains consistent during sequential requests
  - Process multiple sequential requests
  - Verify each request sees state from previous
  - Verify state doesn't get lost between requests
  
- ✅ **Test:** State updates don't lose data
  - Update state with new fields
  - Verify all existing fields preserved
  - Verify new fields added correctly

#### 4.4 State Update Flow
- ✅ **Test:** updateState() updates internal state
  - Call provider.updateState(newState)
  - Verify this.gameState is updated
  - Verify updateAllAgentsState() is called
  
- ✅ **Test:** Multiple state updates work correctly
  - Call updateState() multiple times
  - Verify each update is applied
  - Verify all agents stay in sync

### 5. Error Handling Tests

**Purpose:** Verify error handling works correctly after refactoring.

#### 5.1 Configuration Errors
- ❌ **Test:** Missing API key throws error
  - Create provider without apiKey and without env var
  - Verify Error: "OPENAI_API_KEY or AZURE_API_KEY is required"
  - Verify createAgentConfig() throws
  
- ❌ **Test:** Invalid config values handled
  - Test with invalid maxTokens (negative, zero, too large)
  - Test with invalid temperature (negative, >1)
  - Verify defaults or errors appropriately

#### 5.2 Agent Errors
- ❌ **Test:** Request for non-existent faction throws error
  - Call getResponses() with faction not in game
  - Verify Error: "No agent for faction {faction}"
  - Verify getAgent() throws
  
- ❌ **Test:** Empty request array handled
  - Call getResponses([], true)
  - Should return empty array
  
- ❌ **Test:** Duplicate faction requests handled
  - Call getResponses() with same faction twice
  - Should process both (or handle appropriately)

#### 5.3 Request Processing Errors
- ❌ **Test:** Network error handled correctly
  - Mock generateText() to throw network error
  - Verify handleAgentError() is called
  - Verify error is logged (unless schema serialization error)
  - Verify appropriate response returned (pass or error)
  
- ❌ **Test:** Schema serialization error handled correctly
  - Mock generateText() to throw schema error
  - Verify isSchemaSerializationError() is called
  - Verify error is NOT logged
  - Verify error is re-thrown or handled appropriately
  
- ❌ **Test:** Timeout error handled correctly
  - Mock generateText() to throw timeout
  - Verify handleAgentError() is called
  - Verify appropriate response returned

#### 5.4 Error Logging
- ✅ **Test:** Non-schema errors are logged
  - Mock generateText() to throw non-schema error
  - Verify logger.agentError() is called
  - Verify error message logged
  
- ✅ **Test:** Schema errors are NOT logged
  - Mock generateText() to throw schema error
  - Verify logger.agentError() is NOT called

#### 5.5 Error Handler Details
- ✅ **Test:** handleAgentError() returns correct pass response structure
  - Mock error (non-schema)
  - Verify response has: factionId, actionType: "PASS", data: {}, passed: true, reasoning
  - Verify reasoning contains error message
  
- ✅ **Test:** isSchemaSerializationError() matches correct pattern
  - Test with error containing "Transforms cannot be represented in JSON Schema"
  - Test with error not containing pattern
  - Verify pattern matching works correctly
  
- ✅ **Test:** createSchemaSerializationError() creates correct error
  - Call with factionId and message
  - Verify error.name === "SchemaSerializationError"
  - Verify error.message contains factionId and helpful message
  - Verify error is throwable

#### 5.5 Console Restoration on Error
- ✅ **Test:** Console restored even when generateText throws
  - Mock generateText() to throw error
  - Verify restoreConsole() is called in finally block
  - Verify console methods restored

### 6. Azure Client Module Tests

**Purpose:** Verify azure-client.ts module works correctly.

#### 6.1 Configuration Creation
- ✅ **Test:** createAgentConfig() with full config
  - Provide all config values
  - Verify all values used (no defaults)
  
- ✅ **Test:** createAgentConfig() with partial config
  - Provide only apiKey
  - Verify defaults used: model from env, maxTokens: 1024, temperature: 0.7, verbose: false
  
- ✅ **Test:** createAgentConfig() with no config
  - Provide empty config
  - Verify apiKey from env, other defaults
  
- ❌ **Test:** createAgentConfig() throws on missing API key
  - No apiKey in config and no env var
  - Verify Error: "OPENAI_API_KEY or AZURE_API_KEY is required"

#### 6.2 Client Creation
- ✅ **Test:** createAzureClient() creates client with correct config
  - Verify createAzure() called with resourceName, apiKey, apiVersion
  - Verify config values passed correctly

#### 6.3 Configuration Validation
- ✅ **Test:** validateAzureConfig() validates correctly
  - With valid config: no error
  - With missing apiKey: throws error

### 7. Faction Agent Module Tests

**Purpose:** Verify faction-agent.ts module works correctly.

#### 7.1 Single Agent Creation
- ✅ **Test:** createFactionAgent() creates agent correctly
  - Verify agent.faction matches input
  - Verify agent.toolProvider created with correct state and faction
  - Verify streaming options passed correctly

#### 7.2 Batch Agent Creation
- ✅ **Test:** createAllFactionAgents() creates all agents
  - Verify Map size matches faction count
  - Verify each faction has agent
  - Verify each agent has correct faction

#### 7.3 Agent State Management
- ✅ **Test:** updateFactionAgentState() updates single agent
  - Call with agent and newState
  - Verify agent.toolProvider.updateState() called
  
- ✅ **Test:** updateAllAgentsState() updates all agents
  - Call with agents Map and newState
  - Verify all agents' toolProviders updated

#### 7.4 Agent Retrieval
- ✅ **Test:** getAgent() returns agent for existing faction
  - Call with existing faction
  - Verify agent returned
  
- ❌ **Test:** getAgent() throws for non-existent faction
  - Call with faction not in Map
  - Verify Error: "No agent for faction {faction}"
  
- ✅ **Test:** hasAgent() returns true for existing faction
- ✅ **Test:** hasAgent() returns false for non-existent faction

### 8. Request Processor Module Tests

**Purpose:** Verify request-processor.ts module works correctly.

#### 8.1 Request Processing Flow
- ✅ **Test:** processAgentRequest() processes request end-to-end
  - Mock generateText() to return valid response
  - Verify all steps executed: prompts, tools, AI call, parsing, events, logging
  - Verify response returned

#### 8.2 Options Validation
- ✅ **Test:** processAgentRequest() validates all required options
  - Test with missing agent → should fail
  - Test with missing request → should fail
  - Test with missing azureClient → should fail
  - Test with missing config → should fail
  - Test with missing gameState → should fail
  - Test with missing gameId → should fail
  - Test with missing logger → should fail

#### 8.3 Error Handling in Request Processor
- ❌ **Test:** processAgentRequest() handles generateText errors
  - Mock generateText() to throw
  - Verify handleAgentError() called
  - Verify error logged (if not schema error)
  - Verify response returned (pass or error)

### 9. State Sync Module Tests

**Purpose:** Verify state-sync.ts module works correctly.

#### 9.1 Single Agent Sync
- ✅ **Test:** syncStateFromAgent() syncs state correctly
  - Call with agent and faction
  - Verify getFactionAgentState() called
  - Verify updateAllAgentsState() called for other agents
  - Verify updated state returned

#### 9.2 All Agents Sync
- ✅ **Test:** syncStateFromAllAgents() syncs state correctly
  - Call with agents Map
  - Verify getFactionAgentState() called for each agent
  - Verify latest state used
  - Verify updateAllAgentsState() called for all agents
  - Verify latest state returned

#### 9.3 Edge Cases
- ❌ **Test:** syncStateFromAgent() handles missing agent
  - Call with faction not in Map
  - Verify currentState returned unchanged

### 10. Integration Tests

**Purpose:** Verify all modules work together correctly.

#### 10.1 Full Request Flow
- ✅ **Test:** Complete request flow works
  - Create provider
  - Create request
  - Call getResponses()
  - Verify response received
  - Verify state updated
  - Verify events emitted
  - Verify logs created

#### 10.2 Sequential Requests
- ✅ **Test:** Multiple sequential requests work
  - Process request 1
  - Verify state synced
  - Process request 2
  - Verify state includes changes from request 1

#### 10.3 Simultaneous Requests
- ✅ **Test:** Multiple simultaneous requests work
  - Process multiple requests in parallel
  - Verify all responses received
  - Verify state synced after all complete

#### 10.4 State Consistency
- ✅ **Test:** State remains consistent across operations
  - Create provider
  - Update state multiple times
  - Process requests
  - Verify state always consistent
  - Verify gameId never changes

#### 10.5 Phase Manager Integration
- ✅ **Test:** Provider works correctly when used by phase manager
  - Create provider
  - Use in PhaseManager
  - Process phase requests
  - Verify responses received correctly
  - Verify state updates propagate
  
- ✅ **Test:** State updates from phase manager propagate correctly
  - Phase manager calls updateState()
  - Verify all agents receive update
  - Verify getState() returns updated state
  
- ✅ **Test:** Requests from phase manager processed correctly
  - Phase manager calls getResponses()
  - Verify requests processed
  - Verify responses returned
  - Verify state synced correctly

### 11. Negative Test Cases

**Purpose:** Test invalid inputs and edge cases.

#### 11.1 Invalid Inputs
- ❌ **Test:** Null/undefined state → throws error
- ❌ **Test:** Invalid faction in request → throws error
- ❌ **Test:** Missing required request fields → throws error
- ❌ **Test:** Invalid config values → handled appropriately

#### 11.2 Edge Cases
- ❌ **Test:** Empty factions map → handles gracefully
- ❌ **Test:** Request for faction not in game → throws error
- ❌ **Test:** State update with invalid state → handles appropriately
- ❌ **Test:** Simultaneous requests with same faction → handles correctly
- ❌ **Test:** Empty request array → returns empty array
- ❌ **Test:** Duplicate faction requests → handles correctly
- ❌ **Test:** Invalid requestType → handled appropriately
- ❌ **Test:** Missing context fields → handled appropriately

#### 11.3 Error Scenarios
- ❌ **Test:** API key missing → throws error
- ❌ **Test:** Network failure → handled gracefully
- ❌ **Test:** Timeout → handled gracefully
- ❌ **Test:** Invalid response format → handled gracefully
- ❌ **Test:** Tool provider error → handled gracefully
- ❌ **Test:** Console suppression restore on error → works correctly
- ❌ **Test:** Only schema warnings suppressed → other warnings still appear

### 12. Refactoring-Specific Tests

**Purpose:** Verify refactoring didn't break anything.

#### 12.1 Module Integration
- ✅ **Test:** All modules work together
  - Verify azure-client used correctly
  - Verify faction-agent used correctly
  - Verify request-processor used correctly
  - Verify state-sync used correctly

#### 12.2 Backward Compatibility
- ✅ **Test:** Public API unchanged
  - Verify all public methods exist
  - Verify method signatures unchanged
  - Verify factory function works

#### 12.3 Behavior Preservation
- ✅ **Test:** Behavior matches pre-refactoring
  - Compare responses (if possible)
  - Verify same events emitted
  - Verify same logs created
  - Verify same state updates

## Test Implementation Notes

### Mocking Strategy
- Mock `generateText()` from `ai` package
- Mock `createAzure()` from `@ai-sdk/azure`
- Mock `eventStreamer` for event verification
- Mock `logger` for log verification

### Test Data
- Use fixtures for game states
- Use fixtures for requests
- Use fixtures for responses
- Use fixtures for configs

### Assertions
- Use assertion helpers for consistency
- Verify structure (agents, tool providers)
- Verify behavior (state updates, events)
- Verify error handling

### Coverage Goals
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
✅ All refactored modules tested  
✅ Integration between modules verified  

