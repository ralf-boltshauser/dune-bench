# Azure Provider Refactoring Plan

## Goals

1. **Single Source of Truth**: Each piece of functionality lives in exactly one place
2. **DRY Principle**: No code duplication
3. **Maintainability**: Easy to find, understand, and modify code
4. **Testability**: Each module can be tested independently
5. **Extensibility**: Easy to add new features without modifying existing code

## Current State Analysis

### Current Structure
```
agent/
├── provider/
│   ├── azure-provider.ts (275 lines) - Main provider class
│   ├── faction-agent.ts (43 lines) - Basic agent management
│   ├── response-handler.ts (104 lines) - Response parsing
│   ├── state-sync.ts (62 lines) - State synchronization
│   ├── error-handler.ts (80 lines) - Error handling
│   ├── console-suppress.ts (59 lines) - Console suppression
│   ├── prompt-builder.ts (40 lines) - Prompt building
│   └── types.ts (34 lines) - Types
├── prompts/
│   ├── system-prompt.ts (47 lines) - General system prompt
│   ├── faction-prompt.ts (168 lines) - Faction prompts
│   └── prompt-templates.ts (68 lines) - Prompt templates
└── azure-provider.ts (15 lines) - Re-export file
```

### Issues Identified

1. **azure-provider.ts is still doing too much**:
   - Azure client initialization
   - Request processing orchestration
   - Prompt building (delegates but still coordinates)
   - Logging coordination
   - Event emission coordination
   - Error handling coordination

2. **FactionAgent management is minimal**:
   - Only basic create/update/get functions
   - Could handle more agent lifecycle concerns

3. **Response handler is well-separated**:
   - Already good, just needs to be in right location

4. **Prompt building is split**:
   - `prompt-builder.ts` coordinates but doesn't own the logic
   - System and faction prompts are separate (good)
   - Templates are separate (good)

## Refactoring Plan

### Target Structure

```
agent/
├── provider/
│   ├── azure-provider.ts (~100 lines) - Main orchestrator only
│   ├── azure-client.ts (NEW) - Azure client management
│   ├── faction-agent.ts (~80 lines) - Enhanced agent lifecycle
│   ├── response-handler.ts (104 lines) - Response processing (move here)
│   ├── request-processor.ts (NEW) - Request processing logic
│   ├── state-sync.ts (62 lines) - State synchronization (keep)
│   ├── error-handler.ts (80 lines) - Error handling (keep)
│   ├── console-suppress.ts (59 lines) - Console suppression (keep)
│   └── types.ts (34 lines) - Types (keep)
├── prompts/
│   ├── system-prompt.ts (47 lines) - General system prompt (keep)
│   ├── faction-prompt.ts (168 lines) - Faction prompts (keep)
│   ├── prompt-builder.ts (40 lines) - Prompt building (keep)
│   └── prompt-templates.ts (68 lines) - Templates (keep)
└── azure-provider.ts (15 lines) - Re-export file (keep)
```

### Module Responsibilities

#### 1. `azure-provider.ts` (Main Orchestrator) - ~100 lines
**Single Responsibility**: Coordinate all components, implement AgentProvider interface

**What it does**:
- Implements `AgentProvider` interface
- Holds references to all components
- Delegates to specialized modules
- Manages high-level flow (simultaneous vs sequential)

**What it doesn't do**:
- ❌ Azure client creation (delegates to `azure-client.ts`)
- ❌ Agent creation (delegates to `faction-agent.ts`)
- ❌ Request processing (delegates to `request-processor.ts`)
- ❌ Prompt building (delegates to `prompt-builder.ts`)
- ❌ Response parsing (delegates to `response-handler.ts`)
- ❌ State sync (delegates to `state-sync.ts`)
- ❌ Error handling (delegates to `error-handler.ts`)

**Key Methods**:
```typescript
class AzureAgentProvider {
  constructor(initialState, config)
  getLogger()
  updateState(newState)
  setOrnithopterAccessOverride(faction, hasAccess)
  getState()
  getResponses(requests, simultaneous)
}
```

#### 2. `azure-client.ts` (NEW) - ~50 lines
**Single Responsibility**: Azure OpenAI client lifecycle management

**What it does**:
- Creates Azure client instance
- Manages client configuration
- Validates API key
- Provides client access

**Exports**:
```typescript
export function createAzureClient(config: AgentConfig): AzureClient
export function validateAzureConfig(config: AgentConfig): void
export type AzureClient = ReturnType<typeof createAzure>
```

#### 3. `faction-agent.ts` (Enhanced) - ~80 lines
**Single Responsibility**: Faction agent lifecycle and state management

**What it does**:
- Creates faction agents with tool providers
- Manages agent state updates
- Retrieves agent state
- Handles agent-specific configuration

**Current** (43 lines):
- `createFactionAgent()` - Basic creation
- `updateFactionAgentState()` - State update
- `getFactionAgentState()` - State retrieval

**Enhanced** (add):
- `createAllFactionAgents()` - Batch creation
- `getAgent(faction)` - Agent retrieval with validation
- `hasAgent(faction)` - Agent existence check

**Exports**:
```typescript
export function createFactionAgent(state, faction, gameId): FactionAgent
export function createAllFactionAgents(state, gameId): Map<Faction, FactionAgent>
export function updateFactionAgentState(agent, newState): void
export function getFactionAgentState(agent): GameState
export function getAgent(agents: Map<Faction, FactionAgent>, faction: Faction): FactionAgent
export function hasAgent(agents: Map<Faction, FactionAgent>, faction: Faction): boolean
```

#### 4. `response-handler.ts` (Keep & Move) - 104 lines
**Single Responsibility**: Parse AI SDK responses into AgentResponse format

**What it does**:
- Extracts tool calls from AI SDK results
- Extracts tool results from AI SDK results
- Parses responses into AgentResponse format
- Handles pass detection
- Merges tool data

**Current Location**: `provider/response-handler.ts` ✅ (already correct)

**No changes needed** - already well-structured

#### 5. `request-processor.ts` (NEW) - ~150 lines
**Single Responsibility**: Process a single agent request end-to-end

**What it does**:
- Builds prompts (delegates to prompt-builder)
- Gets tools from agent
- Calls AI SDK (delegates to azure-client)
- Handles logging (delegates to logger)
- Emits events (delegates to event-streamer)
- Parses response (delegates to response-handler)
- Handles errors (delegates to error-handler)

**Exports**:
```typescript
export interface ProcessRequestOptions {
  agent: FactionAgent
  request: AgentRequest
  azureClient: AzureClient
  config: Required<AgentConfig>
  gameState: GameState
  gameId: string
  logger: GameLogger
}

export async function processAgentRequest(
  options: ProcessRequestOptions
): Promise<AgentResponse>
```

**Benefits**:
- Single function that handles entire request flow
- Easy to test in isolation
- Clear dependencies via options object
- Can be reused by other providers

#### 6. `state-sync.ts` (Keep) - 62 lines
**Single Responsibility**: Synchronize game state across agents

**No changes needed** - already well-structured

#### 7. `error-handler.ts` (Keep) - 80 lines
**Single Responsibility**: Handle and transform errors

**No changes needed** - already well-structured

#### 8. `console-suppress.ts` (Keep) - 59 lines
**Single Responsibility**: Suppress console warnings

**No changes needed** - already well-structured

#### 9. `prompt-builder.ts` (Keep) - 40 lines
**Single Responsibility**: Build prompts from components

**No changes needed** - already well-structured

#### 10. `prompts/system-prompt.ts` (Keep) - 47 lines
**Single Responsibility**: General system prompt

**No changes needed** - already well-structured

#### 11. `prompts/faction-prompt.ts` (Keep) - 168 lines
**Single Responsibility**: Faction-specific prompts

**No changes needed** - already well-structured

#### 12. `prompts/prompt-templates.ts` (Keep) - 68 lines
**Single Responsibility**: Prompt composition templates

**No changes needed** - already well-structured

#### 13. `types.ts` (Keep) - 34 lines
**Single Responsibility**: Type definitions

**No changes needed** - already well-structured

## Refactoring Steps

### Phase 1: Extract Azure Client Management
1. Create `azure-client.ts`
2. Move Azure client creation logic from `azure-provider.ts`
3. Move config validation logic
4. Update `azure-provider.ts` to use new module
5. Test: Verify Azure client creation works

### Phase 2: Enhance Faction Agent Management
1. Add batch creation function to `faction-agent.ts`
2. Add agent retrieval/validation helpers
3. Update `azure-provider.ts` to use enhanced functions
4. Test: Verify agent creation and management works

### Phase 3: Extract Request Processing
1. Create `request-processor.ts`
2. Move `processRequest()` logic from `azure-provider.ts`
3. Extract all dependencies into options object
4. Update `azure-provider.ts` to use new module
5. Test: Verify request processing works

### Phase 4: Simplify Main Provider
1. Refactor `azure-provider.ts` to be pure orchestrator
2. Remove all implementation details
3. Keep only coordination logic
4. Test: Verify full integration works

### Phase 5: Verify & Cleanup
1. Run all existing tests
2. Verify no functionality changed
3. Check for any code duplication
4. Update documentation

## Code Organization Principles

### Single Source of Truth
- Each function/class has one clear purpose
- No duplicate logic across modules
- Types defined once in `types.ts`
- Constants defined once in appropriate module

### Dependency Flow
```
azure-provider.ts (orchestrator)
  ├── azure-client.ts (client management)
  ├── faction-agent.ts (agent lifecycle)
  ├── request-processor.ts (request handling)
  │   ├── prompt-builder.ts (prompt building)
  │   │   ├── prompts/system-prompt.ts
  │   │   ├── prompts/faction-prompt.ts
  │   │   └── prompts/prompt-templates.ts
  │   ├── response-handler.ts (response parsing)
  │   ├── error-handler.ts (error handling)
  │   └── console-suppress.ts (console suppression)
  └── state-sync.ts (state synchronization)
```

### Module Boundaries
- **Provider Layer**: Orchestration and coordination
- **Service Layer**: Business logic (request processing, response handling)
- **Infrastructure Layer**: External integrations (Azure client, logging, events)
- **Domain Layer**: Game-specific logic (prompts, state sync)

## Testing Strategy

### Unit Tests
- Each module can be tested independently
- Mock dependencies via options/parameters
- Test edge cases and error paths

### Integration Tests
- Test module interactions
- Test full request flow
- Test state synchronization

### Benefits
- **Maintainability**: Clear module boundaries, easy to find code
- **Testability**: Each module testable in isolation
- **Extensibility**: Add new features by adding modules, not modifying existing
- **DRY**: No code duplication, single source of truth

## Migration Path

1. **Backward Compatibility**: Keep all exports in `azure-provider.ts`
2. **Gradual Migration**: Extract modules one at a time
3. **Test After Each Step**: Ensure functionality preserved
4. **No Breaking Changes**: All existing code continues to work

## Success Criteria

✅ `azure-provider.ts` is < 150 lines (orchestration only)
✅ Each module has single responsibility
✅ No code duplication
✅ All tests pass
✅ All functionality preserved
✅ Code is more maintainable and testable

