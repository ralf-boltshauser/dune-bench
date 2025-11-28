# Revival Phase Test Suite

Comprehensive test suite for the revival phase with all factions and various scenarios.

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
phase-tests/revival/
├── README.md                    # This file
├── test-revival-phase.ts        # Main test runner
├── helpers/
│   ├── test-state-builder.ts   # Helper for creating test states
│   └── agent-response-builder.ts # Helper for mocking agent responses
└── scenarios/
    ├── base-scenario.ts         # Base scenario utilities
    ├── basic-force-revival.ts  # Basic force revival mechanics
    ├── fremen-fedaykin-revival.ts # Fremen Fedaykin elite revival
    ├── fremen-alliance-boost.ts # Fremen granting 3 free revivals to ally
    ├── emperor-ally-revival.ts # Emperor paying for ally revivals
    ├── leader-revival.ts        # Leader revival mechanics
    ├── kwisatz-haderach-revival.ts # Atreides KH revival
    ├── tleilaxu-ghola.ts        # Tleilaxu Ghola card usage
    └── complex-multi-faction.ts # Complex multi-faction scenarios
```

## Test Scenarios

### 1. Basic Force Revival
- **Factions**: Atreides, Harkonnen
- **What to check in logs**: 
  - Free revival (2 for Atreides)
  - Paid revival (2 spice per force)
  - Revival limits (max 3 per turn)
  - Spice deduction

### 2. Fremen Fedaykin Revival
- **Factions**: Fremen, Atreides
- **What to check in logs**:
  - Fremen gets 3 free revivals (not 2)
  - Only 1 Fedaykin can be revived per turn
  - Fedaykin count as 1 force in revival (not 2x)

### 3. Fremen Alliance Boost
- **Factions**: Fremen (allied with Atreides)
- **What to check in logs**:
  - Fremen is asked first if they want to grant boost
  - Ally gets 3 free revivals instead of normal amount
  - Boost can be granted or denied each turn

### 4. Emperor Ally Revival Bonus
- **Factions**: Emperor (allied with Atreides)
- **What to check in logs**:
  - Emperor can pay for up to 3 extra ally revivals
  - Cost is 2 spice per force (paid by Emperor)
  - This is beyond ally's normal revival limit

### 5. Leader Revival
- **Factions**: Atreides, Harkonnen
- **What to check in logs**:
  - Can only revive when all leaders dead or all have died once
  - Cost is leader's strength in spice
  - Revived leader goes to leader pool
  - Face-down leaders cannot be revived

### 6. Kwisatz Haderach Revival
- **Factions**: Atreides
- **What to check in logs**:
  - Can revive KH when all leaders have died once
  - Costs 2 spice (KH strength is +2)
  - KH can be revived instead of a leader

### 7. Tleilaxu Ghola Card
- **Factions**: Atreides
- **What to check in logs**:
  - Can revive 1 leader regardless of status
  - Can revive up to 5 forces for free
  - This is in addition to normal revival
  - Card is discarded after use

### 8. Complex Multi-Faction Revival
- **Factions**: Atreides, Fremen, Emperor, Harkonnen
- **What to check in logs**:
  - Multiple factions reviving simultaneously (no storm order)
  - Different revival amounts and costs
  - Mix of force and leader revivals
  - Edge cases with insufficient spice

## Running Tests

```bash
# Run all revival phase tests
pnpm test:revival

# Run specific scenario (if individual scripts are added)
# pnpm test:revival:basic
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/revival/
├── basic-force-revival-YYYY-MM-DDTHH-MM-SS.log
├── fremen-fedaykin-revival-YYYY-MM-DDTHH-MM-SS.log
├── fremen-alliance-boost-YYYY-MM-DDTHH-MM-SS.log
└── ...
```

Each log file contains:
- **Step-by-step execution**: Every step with state information
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Final Summary**: Overview of what happened

## Reviewing Log Files

When reviewing a log file, check:

1. **Revival Limits**: Are free revivals correct? (2 for most, 3 for Fremen)
2. **Spice Costs**: Are costs calculated correctly? (2 spice per paid force)
3. **Elite Forces**: Is the 1-per-turn limit enforced for Fedaykin/Sardaukar?
4. **Alliance Abilities**: Do Fremen/Emperor alliance abilities work correctly?
5. **Leader Revival**: Are leader revival conditions checked properly?
6. **State Changes**: Are forces moved from tanks to reserves correctly?
7. **Event Ordering**: Do events fire in the correct sequence?
8. **Edge Cases**: Are insufficient spice cases handled correctly?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildTestState` to set up the state
3. Use `AgentResponseBuilder` to mock responses
4. Call `runPhaseScenario()` with a descriptive name
5. Run the test and review the generated log file
6. Manually validate correctness by reading the log

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 10 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 20],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses.queueForceRevival(Faction.ATREIDES, 1);

  return await runPhaseScenario(
    state,
    responses,
    'My Test Scenario',
    'revival'
  );
}
```

## What Gets Logged

- **Agent Requests**: Full request with prompt, context, available actions
- **Agent Responses**: Action type, data, and whether they passed
- **Phase Events**: All events with type, message, and data
- **State Snapshots**: Complete faction states, forces, leaders, spice, etc.
- **Step Information**: Pending requests, responses queue
- **Errors**: Any errors with stack traces and context

