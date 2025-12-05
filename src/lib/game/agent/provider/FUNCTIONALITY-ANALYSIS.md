# Azure Provider Functionality Analysis

## Overview

The Azure Agent Provider implements the `AgentProvider` interface using Azure OpenAI via Vercel AI SDK. It manages AI agents for each faction in the game, handles requests, processes responses, and maintains game state synchronization.

## Core Components

### 1. AzureAgentProvider Class (`azure-provider.ts`)

**Main Responsibilities:**
- Implements `AgentProvider` interface
- Manages Azure OpenAI client connection
- Orchestrates agent request processing
- Handles simultaneous vs sequential request processing
- Maintains game state synchronization

**Key Functionality:**

#### Constructor (`constructor`)
- **Config Management:**
  - Accepts optional `AgentConfig` (apiKey, model, maxTokens, temperature, verbose)
  - Falls back to environment variables via `openai-config.ts`
  - Validates API key presence (throws if missing)
  - Creates required config with defaults (maxTokens: 1024, temperature: 0.7, verbose: false)

- **Azure Client Initialization:**
  - Creates Azure OpenAI client using `createAzure()` from `@ai-sdk/azure`
  - Uses centralized config: resourceName, apiKey, apiVersion
  - Stores client instance for reuse

- **State Management:**
  - Stores initial game state
  - Stores gameId for event streaming consistency
  - Creates logger instance (verbose mode based on config)

- **Agent Creation:**
  - Creates one `FactionAgent` per faction in game
  - Uses `createFactionAgent()` helper
  - Stores agents in Map<Faction, FactionAgent>
  - Each agent has its own tool provider with streaming enabled

#### Public Methods

**`getLogger(): GameLogger`**
- Returns the logger instance for external access

**`updateState(newState: GameState): void`**
- Updates internal game state
- Propagates state update to all faction agents
- Uses `updateFactionAgentState()` for each agent

**`setOrnithopterAccessOverride(faction: Faction, hasAccess: boolean | undefined): void`**
- Sets ornithopter access override for specific faction
- Used during shipment-movement phase to lock access at phase start
- Delegates to agent's tool provider

**`getState(): GameState`**
- Returns current game state
- Gets state from first agent's tool provider (tools may have updated state)
- Falls back to internal gameState if no agents

**`getResponses(requests: AgentRequest[], simultaneous: boolean): Promise<AgentResponse[]>`**
- Main entry point for processing agent requests
- **Simultaneous Mode:**
  - Processes all requests in parallel using `Promise.all()`
  - Syncs state from all agents after completion (merges changes)
  - Uses `syncStateFromAllAgents()`
- **Sequential Mode:**
  - Processes requests one by one
  - After each response, syncs that agent's state to all others
  - Uses `syncStateFromAgent()` for each request
  - Ensures next agent sees updated state

#### Private Methods

**`processRequest(request: AgentRequest): Promise<AgentResponse>`**
- Core request processing logic
- **Timing:**
  - Records start time for duration calculation

- **Prompt Building:**
  - Builds system prompt using `buildSystemPrompt(agent.faction)`
  - Builds user prompt using `buildUserPrompt(request)`
  - Declares outside try block for retry access

- **Tool Preparation:**
  - Gets tools for current phase from agent's tool provider
  - Uses `agent.toolProvider.getToolsForCurrentPhase()`
  - Declares outside try block for retry access

- **Logging & Events:**
  - Logs request via `logger.agentRequest()`
  - Logs thinking via `logger.agentThinking()`
  - Emits `AGENT_THINKING` event via `eventStreamer.emit()`
  - Includes: faction, requestType, phase, prompt

- **AI SDK Call:**
  - Suppresses schema warnings during `generateText()` call
  - Uses `suppressSchemaWarnings()` wrapper
  - Calls `generateText()` with:
    - Model: `azure.responses(config.model)` (responses API)
    - System prompt
    - User prompt
    - Tools (phase-specific)
    - maxOutputTokens: from config
    - stopWhen: `stepCountIs(10)` (allows up to 10 LLM steps)
  - Note: Reasoning models (responses API) don't support temperature
  - Restores console after call

- **Tool Call Processing:**
  - Extracts tool calls using `extractToolCalls(result)`
  - Logs each tool call via `logger.agentToolCall()`
  - Includes: faction, toolName, toolInput
  - Note: Events are emitted automatically by streaming-wrapped tools

- **Response Parsing:**
  - Parses AI SDK result into `AgentResponse` using `parseAgentResponse()`
  - Calculates duration
  - Emits `AGENT_DECISION` event via `eventStreamer.emit()`
  - Includes: faction, actionType, reasoning, data
  - Logs response via `logger.agentResponse()`
  - Includes: faction, actionType, duration, reasoning

- **Error Handling:**
  - Catches all errors
  - Extracts error message
  - Checks if schema serialization error (doesn't log these)
  - Logs other errors via `logger.agentError()`
  - Delegates to `handleAgentError()` which:
    - Throws schema serialization errors (prevents infinite retries)
    - Returns pass response for other errors

#### Factory Function

**`createAgentProvider(state: GameState, config?: AgentConfig): AzureAgentProvider`**
- Convenience factory function
- Creates and returns new `AzureAgentProvider` instance

---

### 2. Faction Agent Management (`faction-agent.ts`)

**Functions:**

**`createFactionAgent(state: GameState, faction: Faction, gameId: string): FactionAgent`**
- Creates a new faction agent
- Creates tool provider with streaming enabled
- Returns `FactionAgent` object with:
  - `faction`: The faction this agent represents
  - `toolProvider`: Tool provider instance with streaming config

**`updateFactionAgentState(agent: FactionAgent, newState: GameState): void`**
- Updates game state for a specific agent
- Delegates to agent's tool provider `updateState()` method
- Ensures agent's tools have latest state

**`getFactionAgentState(agent: FactionAgent): GameState`**
- Gets current game state from agent
- Delegates to agent's tool provider `getState()` method
- Tools may have updated state during execution

---

### 3. Response Handler (`response-handler.ts`)

**Functions:**

**`extractToolCalls(result: GenerateTextResult): ToolCall[]`**
- Extracts all tool calls from AI SDK result
- Flattens tool calls from all steps
- Returns array of tool call objects

**`extractToolResults(result: GenerateTextResult): ToolResult[]`**
- Extracts all tool results from AI SDK result
- Flattens tool results from all steps
- Returns array of tool result objects

**`isPassAction(toolName: string): boolean`**
- Checks if tool name indicates a pass action
- Simple string check: `toolName.includes("pass")`

**`mergeToolData(toolInput: Record<string, unknown>, toolResultData: Record<string, unknown>): Record<string, unknown>`**
- Merges tool input with tool result data
- Result data takes precedence (for computed values like cost)
- Returns merged object

**`parseAgentResponse(request: AgentRequest, result: GenerateTextResult): AgentResponse`**
- Main response parsing function
- **Tool Call Path:**
  - Extracts tool calls and tool results
  - If tool calls exist:
    - Gets last tool call and last tool result
    - Checks if pass action
    - Extracts tool input from `lastToolCall.input` (AI SDK 5.x format)
    - Extracts tool result data from `lastToolResult.output.data` (nested format)
    - Merges input and result data
    - Returns `AgentResponse` with:
      - `factionId`: from request
      - `actionType`: tool name in uppercase
      - `data`: merged tool data
      - `passed`: boolean (true if pass action)
      - `reasoning`: result text or undefined
- **No Tool Call Path:**
  - Returns pass response with:
    - `factionId`: from request
    - `actionType`: "PASS"
    - `data`: empty object
    - `passed`: true
    - `reasoning`: result text or "No action taken"

---

### 4. State Synchronization (`state-sync.ts`)

**Functions:**

**`syncStateFromAgent(agents: Map<Faction, FactionAgent>, factionId: Faction, currentState: GameState): GameState`**
- Syncs state from one agent to all others
- Used in sequential request processing
- Gets updated state from acting agent
- Updates all other agents with this state
- Returns updated state

**`syncStateFromAllAgents(agents: Map<Faction, FactionAgent>, currentState: GameState): GameState`**
- Syncs state from all agents (for simultaneous actions)
- Gets latest state from any agent (tools may have updated state)
- Updates all agents with latest state
- Note: Imperfect for true simultaneous actions but works for most cases
- Returns latest state

---

### 5. Error Handler (`error-handler.ts`)

**Functions:**

**`isSchemaSerializationError(error: unknown): boolean`**
- Checks if error is schema serialization error
- Pattern: "Transforms cannot be represented in JSON Schema"
- Returns boolean

**`createSchemaSerializationError(factionId: Faction, originalMessage: string): Error`**
- Creates descriptive schema serialization error
- Includes faction ID and helpful message
- Sets error name to "SchemaSerializationError"
- Indicates tool schema has transforms that can't be serialized

**`handleAgentError(error: unknown, factionId: Faction): AgentResponse`**
- Main error handling function
- Extracts error message
- **Schema Serialization Error:**
  - Throws descriptive error (prevents infinite retries)
  - Error occurs during `generateText()` setup, so retrying won't help
- **Other Errors:**
  - Returns pass response with error message in reasoning

**`createPassResponse(factionId: Faction, reasoning: string): AgentResponse`**
- Creates a standard pass response
- Returns `AgentResponse` with:
  - `factionId`: provided faction
  - `actionType`: "PASS"
  - `data`: empty object
  - `passed`: true
  - `reasoning`: provided reasoning

---

### 6. Console Suppression (`console-suppress.ts`)

**Functions:**

**`isSchemaWarning(message: string): boolean`**
- Checks if message is schema serialization warning
- Pattern: "Transforms cannot be represented in JSON Schema"
- Returns boolean

**`suppressSchemaWarnings(): () => void`**
- Suppresses AI SDK schema serialization warnings
- Temporarily replaces `console.warn` and `console.error`
- Filters out schema warnings
- Returns restore function to call after operation
- Used during `generateText()` call to reduce noise

---

### 7. Prompt Builder (`prompt-builder.ts`)

**Functions:**

**`buildSystemPrompt(faction: Faction): string`**
- Builds complete system prompt for a faction
- Combines:
  - General agent system prompt (from `system-prompt.ts`)
  - Faction-specific prompt (from `faction-prompt.ts`)
  - Faction name
- Uses `buildSystemPromptTemplate()` to format

**`buildUserPrompt(request: AgentRequest): string`**
- Builds user prompt from request
- Combines:
  - Request prompt text
  - Context (formatted as key-value pairs)
  - Available actions (comma-separated list)
- Uses `buildUserPromptTemplate()` to format

---

### 8. System Prompt (`prompts/system-prompt.ts`)

**Functions:**

**`getGeneralAgentSystemPrompt(): string`**
- Returns general system prompt for all agents
- Defines core behavior and expectations
- Includes:
  - Goal: Win by controlling 3 strongholds (or 4 if allied)
  - Core principles: Win, use tools, think strategically, be proactive
  - Multi-step decision making: Up to 10 LLM calls
  - Decision-making process: Gather info → Analyze → Act → Explain

---

### 9. Faction Prompt (`prompts/faction-prompt.ts`)

**Constants:**
- `ATREIDES_PROMPT`: Atreides-specific instructions
- `BENE_GESSERIT_PROMPT`: Bene Gesserit-specific instructions
- `EMPEROR_PROMPT`: Emperor-specific instructions
- `FREMEN_PROMPT`: Fremen-specific instructions
- `HARKONNEN_PROMPT`: Harkonnen-specific instructions
- `SPACING_GUILD_PROMPT`: Spacing Guild-specific instructions

**Record:**
- `FACTION_PROMPTS`: Maps each faction to its prompt string

**Functions:**

**`getFactionPrompt(faction: Faction): string`**
- Returns faction-specific prompt for given faction
- Looks up in `FACTION_PROMPTS` record

**`getAllFactionPrompts(): Record<Faction, string>`**
- Returns all faction prompts (for debugging/reference)
- Returns copy of `FACTION_PROMPTS` record

---

### 10. Prompt Templates (`prompts/prompt-templates.ts`)

**Constants:**
- `GAME_RULES_SUMMARY`: Brief summary of game rules
- `RESPONSE_FORMAT`: Instructions on response format

**Functions:**

**`buildSystemPromptTemplate(generalPrompt: string, factionPrompt: string, factionName: string): string`**
- Combines prompts into complete system prompt
- Format:
  - General prompt
  - Separator
  - Faction-specific instructions section
  - Faction name
  - Faction prompt
  - Game rules summary
  - Response format

**`buildUserPromptTemplate(prompt: string, context: Record<string, unknown>, availableActions: string[]): string`**
- Combines user prompt components
- Format:
  - Request prompt
  - Current Context section (formatted key-value pairs)
  - Available Actions (comma-separated)
  - Decision instruction

---

### 11. Types (`types.ts`)

**Interfaces:**

**`AgentConfig`**
- Configuration for Azure Agent Provider
- Properties:
  - `apiKey?: string` - Azure OpenAI API key (defaults to env var)
  - `model?: string` - Model/deployment name (defaults to gpt-5-mini)
  - `maxTokens?: number` - Maximum tokens per response
  - `temperature?: number` - Temperature (0-1, not used with reasoning models)
  - `verbose?: boolean` - Whether to log agent interactions

**`FactionAgent`**
- Faction agent with its tool provider
- Properties:
  - `faction: Faction` - The faction this agent represents
  - `toolProvider: ReturnType<typeof createAgentToolProvider>` - Tool provider instance

---

### 12. Azure Configuration (`openai-config.ts`)

**Constants:**
- `AZURE_CONFIG`: Centralized Azure OpenAI configuration
  - `resourceName`: 'flprd'
  - `apiVersion`: 'v1'
  - `defaultModel`: 'gpt-5-mini'
  - `apiKeyEnvVar`: 'OPENAI_API_KEY'
  - `modelEnvVar`: 'OPENAI_MODEL'

**Functions:**

**`getAzureResourceName(): string`**
- Gets Azure resource name from env or default

**`getAzureApiVersion(): string`**
- Gets API version (always returns 'v1')

**`getAzureApiKey(): string`**
- Gets API key from environment variables
- Checks `OPENAI_API_KEY` or `AZURE_API_KEY`

**`getAzureModel(): string`**
- Gets model name from env or default

**`validateAzureConfig(): { valid: boolean; error?: string }`**
- Validates that API key is set
- Returns validation result

**Legacy Exports:**
- `OPENAI_CONFIG` (alias for `AZURE_CONFIG`)
- `getOpenAIBaseURL()` (constructs base URL)
- `getOpenAIApiKey()` (alias for `getAzureApiKey`)
- `getOpenAIModel()` (alias for `getAzureModel`)
- `validateOpenAIConfig()` (alias for `validateAzureConfig`)

---

## Dependencies

### External Libraries
- `@ai-sdk/azure`: Azure OpenAI client creation
- `ai`: Vercel AI SDK (generateText, stepCountIs, GenerateTextResult)

### Internal Modules
- `../../phases/phase-manager`: AgentProvider interface
- `../../phases/types`: AgentRequest, AgentResponse types
- `../../stream/event-streamer`: Event streaming
- `../../stream/types`: AgentActivityEvent
- `../../types`: Faction, GameState, FACTION_NAMES
- `../logger`: GameLogger, createLogger
- `../openai-config`: Azure configuration functions
- `../../tools`: createAgentToolProvider

---

## Event Flow

### Request Processing Flow

1. **Request Received** → `getResponses()`
2. **Mode Selection** → Simultaneous or Sequential
3. **For Each Request** → `processRequest()`
4. **Prompt Building** → System + User prompts
5. **Tool Preparation** → Get phase-specific tools
6. **Event: AGENT_THINKING** → Emitted
7. **AI SDK Call** → `generateText()` with tools
8. **Tool Execution** → Tools execute (emit events automatically)
9. **Tool Call Logging** → Log each tool call
10. **Response Parsing** → Parse AI SDK result
11. **Event: AGENT_DECISION** → Emitted
12. **Response Logging** → Log response with duration
13. **State Sync** → Sync state to all agents
14. **Return Response** → Return AgentResponse

### Error Flow

1. **Error Occurs** → Caught in try-catch
2. **Error Type Check** → Schema serialization or other
3. **Logging** → Log error (unless schema serialization)
4. **Error Handling** → `handleAgentError()`
5. **Schema Error** → Throw descriptive error
6. **Other Error** → Return pass response

---

## State Management

### State Flow

1. **Initial State** → Stored in constructor
2. **State Updates** → `updateState()` propagates to all agents
3. **Tool Execution** → Tools may update state internally
4. **State Retrieval** → `getState()` gets from tool provider
5. **State Sync** → Sequential: after each request, Simultaneous: after all requests

### State Synchronization Modes

**Sequential:**
- After each agent acts, sync their state to all others
- Ensures next agent sees updated state
- Uses `syncStateFromAgent()`

**Simultaneous:**
- After all agents act, merge state from all agents
- Uses state from last agent in iteration order
- Uses `syncStateFromAllAgents()`

---

## Configuration

### Environment Variables
- `OPENAI_API_KEY` or `AZURE_API_KEY`: API key
- `OPENAI_MODEL`: Model override
- `AZURE_RESOURCE_NAME`: Resource name override

### Config Defaults
- `maxTokens`: 1024
- `temperature`: 0.7 (not used with reasoning models)
- `verbose`: false
- `model`: 'gpt-5-mini'
- `resourceName`: 'flprd'
- `apiVersion`: 'v1'

---

## Key Design Decisions

1. **One Agent Per Faction**: Each faction has its own agent instance
2. **Tool Provider Per Agent**: Each agent has its own tool provider with streaming
3. **State Synchronization**: State synced after each request (sequential) or after all (simultaneous)
4. **Error Handling**: Schema errors throw (prevent retries), others return pass
5. **Console Suppression**: Suppresses schema warnings during AI SDK calls
6. **Event Streaming**: Tools automatically emit events when streaming enabled
7. **Multi-Step Reasoning**: Supports up to 10 LLM steps per request
8. **Responses API**: Uses Azure OpenAI responses API (reasoning models)

---

## Integration Points

### Phase Manager
- Implements `AgentProvider` interface
- Called by `PhaseManager` for agent decisions
- Receives `AgentRequest[]` and returns `AgentResponse[]`

### Event Streamer
- Emits `AGENT_THINKING` events
- Emits `AGENT_DECISION` events
- Tools emit `AGENT_TOOL_CALL` and `AGENT_TOOL_RESULT` automatically

### Tool Provider
- Creates tool provider per agent
- Gets phase-specific tools
- Tools update state internally
- Streaming enabled for event emission

### Logger
- Logs requests, thinking, tool calls, responses, errors
- Verbose mode controlled by config
- Color-coded output with faction badges

---

## Summary

The Azure Agent Provider is a comprehensive system that:
- Manages Azure OpenAI connections
- Creates and manages faction agents
- Processes agent requests (simultaneous or sequential)
- Builds prompts (system + user)
- Handles AI SDK calls with error handling
- Parses responses into AgentResponse format
- Synchronizes game state across agents
- Emits events for streaming
- Logs all interactions
- Handles errors gracefully

All functionality is preserved and must be maintained during refactoring.

