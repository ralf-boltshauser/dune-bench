# Shipment & Movement Phase Test Suite

Comprehensive test suite for the shipment-movement phase with all factions and various scenarios.

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
phase-tests/shipment-movement/
├── README.md                    # This file
├── test-shipment-movement.ts     # Main test runner
├── helpers/
│   ├── test-state-builder.ts    # Helper for creating test states
│   └── agent-response-builder.ts # Helper for mocking agent responses
└── scenarios/
    ├── base-scenario.ts         # Base scenario utilities
    ├── hajr-extra-movement.ts   # HAJR card test
    ├── fremen-abilities.ts      # Fremen special abilities
    ├── guild-out-of-order.ts    # Guild act out of order
    ├── guild-cross-ship.ts      # Guild cross-ship and off-planet
    ├── bg-spiritual-advisors.ts # BG spiritual advisors
    ├── ornithopter-access.ts    # Ornithopter access at phase start
    └── complex-multi-faction.ts  # Complex multi-faction scenario
```

## Test Scenarios

### 1. HAJR Extra Movement Card
- **Goal**: Test HAJR card granting extra movement action
- **What to check in logs**:
  - HAJR can be played during movement
  - Extra movement action granted
  - Can move same group or different group
  - Ornithopter access applies to both movements
  - HAJR discarded after use

### 2. Fremen Free Shipment and 2-Territory Movement
- **Goal**: Test Fremen special shipment and movement abilities
- **What to check in logs**:
  - Free shipment to Great Flat
  - Free shipment within 2 territories of Great Flat
  - 2-territory movement (base)
  - Storm migration calculation (half loss, rounded up)
  - Storm restrictions apply

### 3. Spacing Guild Act Out of Order
- **Goal**: Test Guild's ability to act before/after any faction
- **What to check in logs**:
  - Guild can act first
  - Guild can act in middle
  - Guild can delay to end
  - Normal storm order continues after Guild acts
  - Guild receives payment from other factions

### 4. Spacing Guild Cross-Ship and Off-Planet
- **Goal**: Test Guild's special shipment abilities
- **What to check in logs**:
  - Cross-ship works (territory to territory)
  - Off-planet shipment works (board to reserves)
  - Half-price calculation (rounded up)
  - Cost calculations correct

### 5. Bene Gesserit Spiritual Advisors
- **Goal**: Test BG advisor placement when other factions ship
- **What to check in logs**:
  - Advisor sent to Polar Sink option
  - Advisor sent to same territory option
  - Advisor vs fighter distinction
  - Multiple advisors from multiple shipments

### 6. Ornithopter Access at Phase Start
- **Goal**: Test ornithopter access determined at phase start
- **What to check in logs**:
  - Atreides has ornithopters (forces in Arrakeen at start)
  - Harkonnen doesn't have ornithopters (shipped in during phase)
  - 3-territory movement for Atreides
  - 1-territory movement for Harkonnen

### 7. Complex Multi-Faction Scenario
- **Goal**: Test complex scenario with multiple factions and abilities
- **What to check in logs**:
  - All abilities work together
  - Sequential processing correct
  - Alliance constraints applied correctly
  - Complex interactions handled

## Running Tests

```bash
# Run all shipment-movement phase tests
pnpm test:shipment-movement
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/shipment-movement/
├── hajr-extra-movement-card-YYYY-MM-DDTHH-MM-SS.log
├── fremen-free-shipment-and-2-territory-movement-YYYY-MM-DDTHH-MM-SS.log
├── spacing-guild-act-out-of-order-YYYY-MM-DDTHH-MM-SS.log
├── spacing-guild-cross-ship-and-off-planet-YYYY-MM-DDTHH-MM-SS.log
├── bene-gesserit-spiritual-advisors-YYYY-MM-DDTHH-MM-SS.log
├── ornithopter-access-at-phase-start-YYYY-MM-DDTHH-MM-SS.log
└── complex-multi-faction-scenario-YYYY-MM-DDTHH-MM-SS.log
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

1. **Sequential Processing**: Each faction does ship THEN move before next faction
2. **Agent Requests**: Are requests formatted correctly with proper context?
3. **Agent Responses**: Do responses match the requests?
4. **State Changes**: Are state mutations correct after each step?
5. **Event Ordering**: Do events fire in the correct sequence?
6. **Rule Compliance**: Are game rules being followed?
7. **Edge Cases**: Are special cases handled correctly?
8. **Special Abilities**: Do faction abilities work correctly?
9. **Alliance Constraints**: Applied after each faction completes?
10. **Guild Timing**: Can Guild act out of order correctly?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildTestState` to set up the state
3. Use `AgentResponseBuilder` to mock responses
4. Call `runPhaseScenario()` with a descriptive name
5. Run the test and review the generated log file

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    // ... configuration
  });

  const responses = new AgentResponseBuilder();
  responses.queueShipment(Faction.ATREIDES, { /* ... */ });
  responses.queueMovement(Faction.ATREIDES, { /* ... */ });

  // This will write a log file automatically
  return await runPhaseScenario(
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

