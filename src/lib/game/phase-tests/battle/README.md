# Battle Phase Test Suite

Comprehensive test suite for the battle phase with all 6 factions and various scenarios.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All agent requests and responses
- All phase events
- State snapshots at key points
- Tool calls and their data
- Thoughts and decision points

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Agent interactions are working as expected
- Edge cases are handled properly

This approach is better for complex game logic where automated assertions might miss nuanced issues or where you need to understand the full flow of execution.

## Structure

```
phase-tests/battle/
├── README.md                    # This file
├── QUICK_START.md              # Quick reference guide
├── test-battle-phase.ts         # Main test runner
├── helpers/
│   ├── test-state-builder.ts   # Helper for creating test states
│   ├── agent-response-builder.ts # Helper for mocking agent responses
│   └── test-logger.ts          # Writes detailed log files
├── scenarios/
│   ├── stronghold-battle.ts     # Atreides vs Bene Gesserit in stronghold
│   ├── multi-faction-battle.ts # Fremen vs Harkonnen vs Emperor in sand
│   └── base-scenario.ts        # Base scenario utilities
└── assertions/
    └── battle-assertions.ts    # Optional assertion helpers (not primary goal)
```

## Test Scenarios

### 1. Stronghold Battle (Atreides vs Bene Gesserit)
- **Location**: Stronghold territory
- **Factions**: Atreides (aggressor) vs Bene Gesserit (defender)
- **What to check in logs**: 
  - Prescience ability usage and reveals
  - Voice ability commands
  - Stronghold battle mechanics
  - Battle plan submission
  - Winner determination
  - Card discard choices

### 2. Multi-Faction Battle (Fremen vs Harkonnen vs Emperor)
- **Location**: Sand territory
- **Factions**: Fremen (with elite Fedaykin) vs Harkonnen vs Emperor
- **What to check in logs**:
  - Elite forces (Fedaykin) handling
  - Battle Hardened ability (Fremen no spice needed)
  - Leader capture (Harkonnen)
  - Multiple battles in same territory
  - Aggressor choosing which battle to fight
  - Sequential battle processing

## Running Tests

```bash
# Run all battle phase tests
pnpm test:battle

# Run specific scenario
pnpm test:battle:stronghold
pnpm test:battle:multi
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/battle/
├── stronghold-battle-YYYY-MM-DDTHH-MM-SS.log
└── multi-faction-battle-YYYY-MM-DDTHH-MM-SS.log
```

Each log file contains:
- **Step-by-step execution**: Every step with sub-phase information
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Final Summary**: Overview of what happened

## Reviewing Log Files

When reviewing a log file, check:

1. **Battle Identification**: Are battles correctly identified?
2. **Agent Requests**: Are requests formatted correctly with proper context?
3. **Agent Responses**: Do responses match the requests?
4. **State Changes**: Are state mutations correct after each step?
5. **Event Ordering**: Do events fire in the correct sequence?
6. **Rule Compliance**: Are game rules being followed?
7. **Edge Cases**: Are special cases handled correctly?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `TestStateBuilder` to set up the state
3. Use `AgentResponseBuilder` to mock responses
4. Call `runBattleScenario()` with a descriptive name
5. Run the test and review the generated log file
6. Manually validate correctness by reading the log

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    // ... configuration
  });

  const responses = new AgentResponseBuilder();
  responses.queueBattlePlan(Faction.ATREIDES, { /* ... */ });

  // This will write a log file automatically
  return await runBattleScenario(
    state,
    responses,
    'My Test Scenario' // Used for log file name
  );
}
```

## What Gets Logged

- **Agent Requests**: Full request with prompt, context, available actions
- **Agent Responses**: Action type, data, and whether they passed
- **Phase Events**: All events with type, message, and data
- **State Snapshots**: Complete faction states, forces, leaders, spice, etc.
- **Step Information**: Sub-phase, pending requests, responses queue
- **Errors**: Any errors with stack traces and context

