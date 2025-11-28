# Storm Phase Test Suite

Comprehensive test suite for the storm phase with detailed log files for manual review.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All agent requests and responses
- All phase events
- State snapshots at key points
- Storm movement calculations
- Force and spice destruction
- Storm order determination

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Storm movement is calculated correctly
- Destruction rules are applied properly
- Storm order is determined correctly

## Structure

```
phase-tests/storm/
├── README.md                    # This file
├── test-storm.ts                 # Main test runner
├── helpers/
│   ├── test-state-builder.ts   # Helper for creating test states
│   └── agent-response-builder.ts # Helper for mocking agent responses
└── scenarios/
    ├── base-scenario.ts        # Base scenario utilities
    ├── turn1-initial-placement.ts
    ├── standard-movement-destruction.ts
    ├── weather-control.ts
    ├── fremen-half-losses.ts
    ├── protected-territories.ts
    ├── complex-multi-faction.ts
    └── spice-destruction-rules.ts
```

## Test Scenarios

### 1. Turn 1 Initial Storm Placement
- **Goal**: Test initial storm placement mechanics
- **What to check in logs**:
  - Correct dialer selection (nearest to sector 0 on either side)
  - Dial range 0-20 (not 1-3)
  - Storm starts at sector 0, then moves
  - Storm order determination

### 2. Standard Storm Movement and Destruction
- **Goal**: Test normal storm movement (Turn 2+) with destruction
- **What to check in logs**:
  - Correct dialer selection
  - Dial range 1-3 per player
  - Simultaneous dialing
  - Force destruction in sand territories
  - Spice destruction in storm path
  - Protected territories (Imperial Basin) safe
  - Storm order determination

### 3. Weather Control
- **Goal**: Test Weather Control card overriding normal movement
- **What to check in logs**:
  - Normal dialing skipped
  - Player chooses movement (1-10 or 0)
  - Storm moves based on choice
  - Destruction occurs correctly

### 4. Fremen Half Losses
- **Goal**: Test Fremen only lose half forces (rounded up)
- **What to check in logs**:
  - Fremen lose half (rounded up)
  - Other factions lose all forces
  - Correct calculation (e.g., 5 forces → 3 lost)

### 5. Protected Territories
- **Goal**: Test that protected territories are safe
- **What to check in logs**:
  - Rock territories protected
  - Imperial Basin protected
  - Polar Sink never affected
  - Spice in protected territories safe

### 6. Complex Multi-Faction Destruction
- **Goal**: Test destruction of multiple factions across multiple sectors
- **What to check in logs**:
  - Multiple factions destroyed correctly
  - Fremen half losses applied
  - Protected territories safe
  - Spice destroyed correctly

### 7. Spice Destruction Rules
- **Goal**: Test spice destroyed only in path (not starting sector)
- **What to check in logs**:
  - Spice in starting sector NOT destroyed
  - Spice in path destroyed
  - Spice in ending sector destroyed

## Running Tests

```bash
# Run all storm phase tests
pnpm test:storm
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/storm/
├── turn-1-initial-storm-placement-YYYY-MM-DDTHH-MM-SS.log
├── standard-storm-movement-and-destruction-YYYY-MM-DDTHH-MM-SS.log
├── weather-control-YYYY-MM-DDTHH-MM-SS.log
├── fremen-half-losses-YYYY-MM-DDTHH-MM-SS.log
├── protected-territories-YYYY-MM-DDTHH-MM-SS.log
├── complex-multi-faction-destruction-YYYY-MM-DDTHH-MM-SS.log
└── spice-destruction-rules-YYYY-MM-DDTHH-MM-SS.log
```

Each log file contains:
- **Step-by-step execution**: Every step with context
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Final Summary**: Overview of what happened

## Reviewing Log Files

When reviewing a log file, check:

1. **Dialer Selection**: Are the correct players selected to dial?
2. **Dial Values**: Are dials in correct range (0-20 for Turn 1, 1-3 for Turn 2+)?
3. **Storm Movement**: Is movement calculated correctly?
4. **Force Destruction**: Are forces destroyed correctly?
   - Only in sand territories?
   - Only in affected sectors?
   - Fremen half losses?
   - Protected territories safe?
5. **Spice Destruction**: Is spice destroyed correctly?
   - Only in path (not starting sector)?
   - Protected territories safe?
6. **Storm Order**: Is first player determined correctly?
7. **State Changes**: Are state mutations correct after each step?
8. **Event Ordering**: Do events fire in the correct sequence?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildTestState()` to set up the state
3. Use `AgentResponseBuilder` to mock responses
4. Call `runStormScenario()` with a descriptive name
5. Run the test and review the generated log file

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    stormSector: 5,
    // ... configuration
  });

  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2);
  responses.queueStormDial(Faction.HARKONNEN, 3);

  return await runStormScenario(
    state,
    responses,
    'My Test Scenario'
  );
}
```

## What Gets Logged

- **Agent Requests**: Full request with prompt, context, available actions
- **Agent Responses**: Action type, data, and whether they passed
- **Phase Events**: All events with type, message, and data
- **State Snapshots**: Complete faction states, forces, leaders, spice, storm position, etc.
- **Step Information**: Pending requests, responses queue
- **Errors**: Any errors with stack traces and context

