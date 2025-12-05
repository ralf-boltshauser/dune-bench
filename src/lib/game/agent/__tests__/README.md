# Azure Provider Tests

Comprehensive test suite for the refactored Azure provider.

## Structure

```
__tests__/
├── azure-provider.test.ts    # Main test file
├── test-runner.ts            # Test runner entry point
├── helpers/                  # Reusable test infrastructure
│   ├── mocks/                # Mock implementations
│   ├── fixtures/             # Test data presets
│   ├── builders/             # Fluent API builders
│   ├── assertions/           # Reusable assertions
│   └── utils/                # Test utilities
└── README.md                 # This file
```

## Running Tests

```bash
# Run all tests
tsx src/lib/game/agent/__tests__/test-runner.ts

# Or run the test file directly
tsx src/lib/game/agent/__tests__/azure-provider.test.ts
```

## Test Coverage

### ✅ Currently Tested (No API Calls Required)

1. **Agent Creation**
   - Agent creation for each faction
   - Tool provider initialization
   - GameId consistency

2. **Tool Provider Setup**
   - State management
   - Ornithopter access override
   - Tool provider methods

3. **Configuration**
   - Default values
   - Config overrides
   - Error handling

4. **State Synchronization**
   - State updates
   - State retrieval
   - Multiple updates

5. **Logging**
   - Logger creation
   - Logger access

6. **Factory Function**
   - Provider creation
   - Config passing

### ⚠️ Requires Additional Setup

The following tests require either:
- Real API keys (for integration tests)
- Module mocking framework (vitest/jest)
- Or manual dependency injection

1. **Request Processing**
   - `getResponses()` - requires mocked `generateText()`
   - `processRequest()` - requires mocked `generateText()`

2. **Response Parsing**
   - Tool call parsing
   - Response data merging
   - Multi-step handling

3. **Event Emission**
   - AGENT_THINKING events
   - AGENT_DECISION events

4. **Error Handling**
   - Network errors
   - Schema serialization errors
   - Timeout errors

5. **Multi-Step Decision Making**
   - Step counting
   - Tool call logging
   - Response determination

## Testing Strategy

### Current Approach

Tests focus on **structure and setup** that can be verified without API calls:
- Agent creation and configuration
- State management
- Tool provider setup
- Basic integration

### For Full Coverage

To test request processing and API interactions:

1. **Option 1: Integration Tests** (Recommended)
   - Use real API keys
   - Test with actual Azure OpenAI
   - Run separately from unit tests
   - Document expected costs

2. **Option 2: Module Mocking**
   - Use vitest or jest for module mocking
   - Mock `@ai-sdk/azure` and `ai` packages
   - Full control over responses

3. **Option 3: Dependency Injection**
   - Refactor provider to accept generateText function
   - Inject mock in tests
   - More invasive but testable

## Test Infrastructure

All helpers are reusable and follow DRY principles:

- **Mocks**: Single source of truth for mocks
- **Fixtures**: Reusable test data
- **Builders**: Fluent APIs for setup
- **Assertions**: Reusable validations

## Adding New Tests

1. Use fixtures for test data
2. Use builders for setup
3. Use assertions for validation
4. Follow existing patterns

Example:
```typescript
test('should do something', () => {
  const { provider } = ProviderBuilder.create()
    .withState(GAME_STATE_PRESETS.TWO_FACTIONS([Faction.ATREIDES, Faction.HARKONNEN]))
    .withConfig(CONFIG_PRESETS.WITH_API_KEY('test-key'))
    .build();

  // Test code
  ProviderAssertions.expectAgentCreated(provider, Faction.ATREIDES);
});
```

