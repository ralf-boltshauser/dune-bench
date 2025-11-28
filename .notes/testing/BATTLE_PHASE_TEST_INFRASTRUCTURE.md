# Battle Phase Test Infrastructure

## Overview

A comprehensive, well-structured test infrastructure for the battle phase with all 6 factions and multiple battle scenarios.

## Structure

```
src/lib/game/phase-tests/battle/
├── README.md                          # Documentation
├── QUICK_START.md                     # Quick start guide
├── test-battle-phase.ts               # Main test runner
├── helpers/
│   ├── test-state-builder.ts         # State creation utilities
│   └── agent-response-builder.ts     # Mock agent response builder
├── scenarios/
│   ├── base-scenario.ts              # Common scenario utilities
│   ├── stronghold-battle.ts          # Atreides vs Bene Gesserit
│   └── multi-faction-battle.ts       # Fremen vs Harkonnen vs Emperor
└── assertions/
    └── battle-assertions.ts          # Assertion helpers
```

## Test Scenarios

### 1. Stronghold Battle: Atreides vs Bene Gesserit
**Location**: Arrakeen (stronghold territory)  
**Factions**: Atreides (aggressor) vs Bene Gesserit (defender)

**Tests**:
- ✅ Prescience ability (Atreides peeks at BG's weapon)
- ✅ Voice ability (BG commands Atreides not to play poison weapon)
- ✅ Kwisatz Haderach (Atreides uses KH for +2 strength)
- ✅ Winner card discard choice (winner chooses which cards to keep)
- ✅ Stronghold battle mechanics

**Setup**:
- Atreides: 10 forces, 20 spice, KH active
- Bene Gesserit: 8 forces, 15 spice
- Both in Arrakeen sector 9

### 2. Multi-Faction Battle: Fremen vs Harkonnen vs Emperor
**Location**: Great Flat (sand territory)  
**Factions**: Fremen (with elite Fedaykin) vs Harkonnen vs Emperor

**Expected Outcome**: Harkonnen wins both battles

**Tests**:
- ✅ Elite forces (Fremen has 3 Fedaykin)
- ✅ Battle Hardened ability (Fremen doesn't need spice)
- ✅ Leader capture (Harkonnen captures Fremen's leader)
- ✅ Leader kill (Harkonnen kills Emperor's leader for 2 spice)
- ✅ Multiple battles in same territory
- ✅ Aggressor choosing which battle to fight
- ✅ Winner card discard choice

**Setup**:
- Fremen: 6 regular + 3 Fedaykin, 10 spice
- Harkonnen: 10 regular, 25 spice
- Emperor: 4 regular, 30 spice
- All in Great Flat sector 5

## Running Tests

```bash
# Run all battle phase tests
pnpm test:battle

# Run specific scenario
pnpm test:battle:stronghold    # Stronghold battle
pnpm test:battle:multi         # Multi-faction battle
```

## Key Features

### 1. Test State Builder
Easy-to-use utilities for creating test states:

```typescript
const state = buildTestState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
  spice: getDefaultSpice(),
  forces: [
    { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 10 },
  ],
  specialStates: {
    atreides: { kwisatzHaderachActive: true },
  },
});
```

### 2. Agent Response Builder
Fluent API for mocking agent responses:

```typescript
const responses = new AgentResponseBuilder();
responses
  .queuePrescience(Faction.ATREIDES, 'weapon')
  .queueBattlePlan(Faction.ATREIDES, {
    leaderId: 'paul-atreides',
    forcesDialed: 5,
    useKwisatzHaderach: true,
  })
  .queueCardDiscardChoice(Faction.ATREIDES, []);
```

### 3. Assertion Helpers
Easy-to-use assertions:

```typescript
runAssertions(result, [
  assertBattleResolved(),
  assertPrescienceUsed(),
  assertLeaderCaptured(Faction.HARKONNEN, Faction.FREMEN),
  assertFactionSpice(Faction.HARKONNEN, 27, 5), // 25 + 2 from kill
]);
```

### 4. Scenario Runner
Automated scenario execution with event tracking:

```typescript
const result = await runBattleScenario(state, responses);
logScenarioResults('My Scenario', result);
```

## Adding New Tests

1. **Create scenario file** in `scenarios/`:
   ```typescript
   export async function testMyScenario() {
     const state = buildTestState({ /* ... */ });
     const responses = new AgentResponseBuilder();
     // ... queue responses
     return await runBattleScenario(state, responses);
   }
   ```

2. **Add to main test runner** in `test-battle-phase.ts`:
   ```typescript
   const result = await testMyScenario();
   const assertions = runAssertions(result, [
     assertBattleResolved(),
     // ... more assertions
   ]);
   ```

3. **Add npm script** (optional):
   ```json
   "test:battle:my": "tsx src/lib/game/phase-tests/battle/scenarios/my-scenario.ts"
   ```

## Test Output

Each test produces:
- ✅ Step count
- ✅ Completion status
- ✅ All events (filtered for important ones)
- ✅ Assertion results
- ✅ Final state summary

## Benefits

1. **Isolated Testing**: Each scenario is independent
2. **Reproducible**: Same inputs = same results
3. **Extensible**: Easy to add new scenarios
4. **Well-Documented**: Clear structure and examples
5. **Comprehensive**: Tests all major battle mechanics
6. **Maintainable**: Modular structure, easy to update

## Future Enhancements

- [ ] Add more scenarios (traitor battles, lasgun/shield explosion, etc.)
- [ ] Add performance benchmarks
- [ ] Add visual test output (diagrams)
- [ ] Add regression test suite
- [ ] Add integration with CI/CD

## Example Output

```
================================================================================
BATTLE PHASE TEST SUITE
================================================================================

🏰 Setting up Stronghold Battle: Atreides vs Bene Gesserit
✓ Game state created with 2 factions
✓ Phase set to: BATTLE
...

================================================================================
SCENARIO: Stronghold Battle (Atreides vs Bene Gesserit)
================================================================================

Steps: 15
Completed: ✓

Events (23):
  1. [BATTLES_IDENTIFIED] 1 potential battles identified
  2. [PRESCIENCE_USED] Atreides uses Prescience
  3. [VOICE_USED] Bene Gesserit uses Voice
  4. [BATTLE_RESOLVED] Atreides wins the battle
  5. [CARD_DISCARD_CHOICE] Atreides chooses to keep all cards
...

--- Assertions ---
  ✓ Battle resolved
  ✓ Prescience used
  ✓ Voice used
  ✓ Winner card discard choice

Results: 4 passed, 0 failed
```

---

**This is a production-ready test infrastructure that makes it easy to test complex battle scenarios!** 🎉

