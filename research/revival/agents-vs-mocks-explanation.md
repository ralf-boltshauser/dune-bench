# Agents vs Mocks - Test Architecture Explanation

## Current Test Implementation: **MOCK AGENTS** (Not Real Agents)

### What the Tests Use

The revival phase tests use **`MockAgentProvider`**, which is a **hard-coded response system**, NOT real AI agents.

```typescript
// From base-scenario.ts
const provider = new MockAgentProvider('pass');  // ← This is a MOCK
```

### How MockAgentProvider Works

1. **Pre-queued Responses**: Responses are hard-coded before the test runs:
   ```typescript
   const responses = new AgentResponseBuilder();
   responses.queueForceRevival(Faction.ATREIDES, 1);  // Hard-coded
   responses.queuePass(Faction.HARKONNEN);            // Hard-coded
   ```

2. **No AI Calls**: `MockAgentProvider` just returns the pre-queued responses:
   ```typescript
   async getResponses(requests: AgentRequest[]): Promise<AgentResponse[]> {
     return requests.map((request) => {
       const queue = this.responseQueue.get(request.requestType);
       if (queue && queue.length > 0) {
         return queue.shift()!;  // ← Just returns pre-queued response
       }
       return this.generateDefaultResponse(request);  // Default: pass
     });
   }
   ```

3. **No API Calls**: Zero network requests, zero AI processing, zero cost.

### Why Use Mocks?

✅ **Fast**: No API latency  
✅ **Deterministic**: Same inputs = same outputs  
✅ **Free**: No API costs  
✅ **Focused**: Tests the phase handler logic, not agent behavior  
✅ **Reliable**: No flakiness from AI responses  

---

## Real Agents: `ClaudeAgentProvider`

### What Real Agents Would Use

For actual gameplay, the system uses **`ClaudeAgentProvider`**, which:

1. **Calls Claude API**: Makes real API requests to Anthropic
2. **Uses AI Decision-Making**: Agents analyze the game state and make decisions
3. **Has Tool Access**: Agents can call game tools (revive_forces, etc.)
4. **Costs Money**: Each API call costs money
5. **Takes Time**: API calls have latency

```typescript
// Real game would use:
const provider = new ClaudeAgentProvider(initialState, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
});

// This makes real API calls:
const response = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  system: systemPrompt,
  prompt: userPrompt,
  tools,  // Agents can use game tools
  ...
});
```

---

## Test Architecture Pattern

### What Gets Tested

✅ **Phase Handler Logic**: The real `RevivalPhaseHandler` class  
✅ **State Management**: Real state mutations and queries  
✅ **Rule Enforcement**: Real validation and limits  
✅ **Event Firing**: Real event system  
✅ **Integration**: How all components work together  

### What Doesn't Get Tested

❌ **Agent Decision-Making**: Not testing if agents make good choices  
❌ **AI Behavior**: Not testing Claude's responses  
❌ **Tool Usage**: Not testing if agents use tools correctly  

---

## The Pattern: Real Implementation + Mocked Inputs

This follows the testing pattern:

```
┌─────────────────────────────────────────┐
│  Real Implementation (RevivalPhaseHandler) │
│  - Real state mutations                  │
│  - Real rule validation                  │
│  - Real event system                     │
└─────────────────────────────────────────┘
              ↑
              │ Uses
              │
┌─────────────────────────────────────────┐
│  Mocked Inputs (MockAgentProvider)      │
│  - Hard-coded responses                 │
│  - Pre-queued actions                   │
│  - No AI involved                       │
└─────────────────────────────────────────┘
```

**This is the correct approach** because:
- We test the **real game logic** (not mocked)
- We control the **inputs** to test specific scenarios
- We avoid **flakiness** from AI responses
- We get **deterministic** results

---

## Summary

| Aspect | Tests (Current) | Real Game |
|--------|----------------|-----------|
| **Provider** | `MockAgentProvider` | `ClaudeAgentProvider` |
| **AI Calls** | ❌ None | ✅ Real API calls |
| **Decision-Making** | ❌ Hard-coded | ✅ AI-powered |
| **Cost** | ✅ Free | ❌ Costs money |
| **Speed** | ✅ Instant | ❌ API latency |
| **Deterministic** | ✅ Yes | ❌ Variable |
| **Tests** | ✅ Phase logic | ❌ Agent behavior |

**The tests are working correctly** - they test the real phase handler implementation with controlled inputs, which is exactly what we want for testing game logic.

