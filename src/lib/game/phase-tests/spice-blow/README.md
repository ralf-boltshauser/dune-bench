# Spice Blow Phase Test Suite

Comprehensive test suite for the spice blow phase with detailed log files for manual review.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All agent requests and responses
- All phase events
- State snapshots at key points
- Tool calls and their data
- Spice card reveals and placements
- Worm devouring events
- Nexus negotiations

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Spice is placed correctly (or not placed when in storm)
- Worms devour at correct locations
- Fremen abilities work correctly
- Nexus negotiations proceed properly

## Structure

```
phase-tests/spice-blow/
├── README.md                    # This file
├── test-spice-blow-phase.ts     # Main test runner
├── helpers/
│   ├── test-state-builder.ts   # Helper for creating test states with spice decks
│   └── agent-response-builder.ts # Helper for mocking agent responses
└── scenarios/
    ├── base-scenario.ts        # Base scenario utilities
    ├── turn-1-multiple-worms.ts
    ├── multiple-worms-devouring.ts
    ├── fremen-worm-immunity.ts
    ├── fremen-ally-protection.ts
    ├── spice-in-storm.ts
    ├── nexus-alliance-negotiations.ts
    └── complex-multi-faction-devouring.ts
```

## Test Scenarios

### 1. Turn 1 Multiple Worms
- **Goal**: Test Turn 1 special rules
- **Setup**: Multiple Shai-Hulud cards on Turn 1
- **What to check in logs**: 
  - Worms set aside (not discarded)
  - No Nexus triggered
  - Worms reshuffled into both decks A and B

### 2. Multiple Worms Devouring
- **Goal**: Test multiple worms in sequence
- **Setup**: Territory Card, Worm, Territory Card, Worm, Territory Card
- **What to check in logs**:
  - Each worm devours at correct location (topmost Territory Card in discard)
  - Forces and spice destroyed correctly
  - Nexus triggered after Territory Card appears

### 3. Fremen Worm Immunity
- **Goal**: Test Fremen forces immune to worms
- **Setup**: Fremen, Atreides, Harkonnen forces in same territory
- **What to check in logs**:
  - Fremen forces survive
  - Other factions' forces devoured
  - Spice destroyed

### 4. Fremen Ally Protection
- **Goal**: Test Fremen protecting ally from worm
- **Setup**: Fremen allied with Atreides, both have forces in territory
- **What to check in logs**:
  - Fremen asked to protect ally
  - Fremen chooses to protect
  - Atreides forces protected
  - Other forces devoured

### 5. Spice in Storm
- **Goal**: Test spice not placed when sector in storm
- **Setup**: Territory Card with sector matching storm sector
- **What to check in logs**:
  - No spice placed
  - Card discarded
  - Event indicates spice not placed

### 6. Nexus Alliance Negotiations
- **Goal**: Test Nexus with alliance formation/breaking
- **Setup**: Multiple factions, existing alliance
- **What to check in logs**:
  - Nexus triggered after worm
  - All factions asked in storm order
  - Alliances formed/broken correctly
  - Nexus ends properly

### 7. Complex Multi-Faction Devouring
- **Goal**: Test complex scenario with multiple factions, Fremen immunity, protected ally
- **Setup**: 4 factions, Fremen-Atreides alliance, forces in same territory
- **What to check in logs**:
  - Fremen protection decision
  - Fremen forces immune
  - Atreides forces protected
  - Other forces devoured
  - Nexus negotiations

## Running Tests

```bash
# Run all spice blow phase tests
pnpm test:spice-blow
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/spice-blow/
├── turn-1-multiple-worms-YYYY-MM-DDTHH-MM-SS.log
├── multiple-worms-devouring-YYYY-MM-DDTHH-MM-SS.log
├── fremen-worm-immunity-YYYY-MM-DDTHH-MM-SS.log
├── fremen-ally-protection-YYYY-MM-DDTHH-MM-SS.log
├── spice-in-storm-YYYY-MM-DDTHH-MM-SS.log
├── nexus-alliance-negotiations-YYYY-MM-DDTHH-MM-SS.log
└── complex-multi-faction-devouring-YYYY-MM-DDTHH-MM-SS.log
```

Each log file contains:
- **Step-by-step execution**: Every step with state information
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Spice Card Reveals**: What cards were revealed and their effects
- **Worm Devouring**: What forces/spice were devoured
- **Nexus Negotiations**: Alliance formation/breaking

## Reviewing Log Files

When reviewing a log file, check:

1. **Spice Card Reveals**: Are cards revealed correctly?
2. **Spice Placement**: Is spice placed correctly (or not placed when in storm)?
3. **Worm Devouring**: Do worms devour at correct locations?
4. **Fremen Abilities**: Do Fremen forces survive? Are allies protected correctly?
5. **Nexus**: Is Nexus triggered correctly? Do negotiations proceed properly?
6. **State Changes**: Are state mutations correct after each step?
7. **Event Ordering**: Do events fire in the correct sequence?
8. **Rule Compliance**: Are game rules being followed?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildTestState` to set up the state with specific spice decks
3. Use `AgentResponseBuilder` to mock responses
4. Call `runSpiceBlowScenario()` with a descriptive name
5. Run the test and review the generated log file

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    turn: 2,
    spiceDeckA: ['spice_south_mesa', 'shai_hulud_1', 'spice_basin'],
    // ... configuration
  });

  const responses = new AgentResponseBuilder();
  responses.queueFremenProtection(Faction.FREMEN, true);

  // This will write a log file automatically
  return await runSpiceBlowScenario(
    state,
    responses,
    'my-test-scenario'
  );
}
```

## Key Mechanics Tested

- **Turn 1 Rules**: Worms set aside, no Nexus
- **Spice Placement**: Normal placement and storm blocking
- **Worm Devouring**: Correct location (topmost Territory Card in discard)
- **Fremen Immunity**: Forces not devoured
- **Fremen Protection**: Ally protection decision
- **Nexus**: Alliance negotiations
- **Two-Pile System**: Deck A and Deck B (advanced rules)
- **Multiple Worms**: Sequential worm handling

