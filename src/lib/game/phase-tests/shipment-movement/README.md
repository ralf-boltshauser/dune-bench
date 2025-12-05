# Shipment & Movement Phase - Test Suite

## Overview

Comprehensive test suite for the refactored shipment-movement phase handler. Tests are organized into maintainable, reusable modules following DRY principles.

## Test Structure

```
phase-tests/shipment-movement/
├── helpers/
│   ├── assertions.ts              # All assertion helpers (no duplication)
│   ├── fixtures.ts                 # Test data presets (territories, factions, etc.)
│   ├── test-state-builder.ts       # State builder (reuses battle phase builder)
│   ├── agent-response-builder.ts   # Enhanced with fluent API + specialized builders
│   ├── scenario-builder.ts         # Fluent scenario builder (combines setup + execution + assertions)
│   └── test-helpers.ts             # Common test utilities
├── scenarios/                      # Scenario tests (high-level)
│   ├── base-scenario.ts           # Base scenario utilities
│   ├── core-sequential.ts         # Tests 1.1-1.5: Sequential processing
│   ├── guild-handling.ts          # Tests 2.1-2.12: Guild special handling
│   ├── bg-spiritual-advisors.ts   # Tests 3.1-3.9: BG Spiritual Advisor
│   ├── bg-intrusion.ts            # Tests 4.1-4.10: BG INTRUSION (TODO)
│   ├── bg-wartime.ts              # Tests 5.1-5.6: BG WARTIME (TODO)
│   ├── bg-take-up-arms.ts         # Tests 6.1-6.13: BG TAKE UP ARMS (TODO)
│   ├── alliance-constraints.ts    # Tests 7.1-7.5: Alliance constraints (TODO)
│   ├── ornithopter-access.ts      # Tests 8.1-8.6: Ornithopter access
│   ├── fremen-abilities.ts        # Tests 11.5-11.9: Fremen abilities
│   ├── negative-cases.ts          # Tests 10.1-10.14: Invalid actions (TODO)
│   └── edge-cases.ts              # Tests 11.1-11.12: Edge cases (TODO)
├── unit/                          # Unit tests for modules (TODO)
│   ├── state-machine.test.ts
│   ├── guild-handler.test.ts
│   ├── bg-advisors.test.ts
│   └── ...
├── integration/                   # Integration tests (TODO)
│   ├── sequential-processing.test.ts
│   ├── guild-timing-flow.test.ts
│   └── ...
└── test-shipment-movement.ts      # Main test runner
```

## Key Features

### 1. Reusable Infrastructure

**Assertions** (`helpers/assertions.ts`):
- State assertions (forces, spice, reserves, ornithopter access)
- Event assertions (emitted, not emitted, sequence, count, data)
- Phase assertions (complete, not complete, pending requests)
- BG-specific assertions (advisors, fighters)
- Guild-specific assertions (payment received)
- Alliance assertions (forces in tanks)

**Fixtures** (`helpers/fixtures.ts`):
- Territory presets (ARRAKEEN, CARTHAG, IMPERIAL_BASIN, etc.)
- Faction presets (BASIC, WITH_GUILD, WITH_BG, etc.)
- Storm order presets
- Force presets (SMALL, MEDIUM, LARGE, etc.)
- Spice presets (NONE, LOW, MEDIUM, HIGH, etc.)
- Alliance presets
- BG presets (ADVISORS_ONLY, FIGHTERS_ONLY, MIXED, etc.)

**Enhanced Response Builder** (`helpers/agent-response-builder.ts`):
- Fluent API with specialized builders:
  - `forFaction(faction)` - FactionResponseBuilder
  - `forGuild()` - GuildResponseBuilder
  - `forBG()` - BGResponseBuilder
- Common patterns:
  - `queueShipmentThenMovement()`
  - `queuePassBoth()`
  - `queueAllFactionsPass()`
- BG ability helpers:
  - `queueBGIntrusion()`
  - `queueBGWartime()`
  - `queueBGTakeUpArms()`
  - `queueBGPassAbility()`
- Guild helpers:
  - `queueGuildTiming()`
  - `queueGuildShipmentSequence()`

### 2. Test Organization

**Scenario Tests** (`scenarios/`):
- High-level scenario tests
- Use infrastructure helpers
- Easy to read and maintain
- Example:
```typescript
export async function testBasicSequentialFlow() {
  const state = buildTestState({...});
  const responses = new AgentResponseBuilder()
    .forFaction(Faction.ATREIDES)
      .shipment({...})
      .movement({...})
    .forFaction(Faction.HARKONNEN)
      .passBoth();
  
  const result = await runPhaseScenario(state, responses, 'Test Name', 200);
  
  assertions.assertPhaseComplete({ phaseComplete: result.completed } as any);
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  // ... more assertions
}
```

## Usage

### Running Tests

```bash
# Run all tests
pnpm test:shipment-movement

# Or run specific test file
node src/lib/game/phase-tests/shipment-movement/scenarios/core-sequential.ts
```

### Writing New Tests

1. **Use fixtures** - Don't hardcode territory IDs, faction lists, etc.
   ```typescript
   import { TEST_TERRITORIES, TEST_FACTIONS, FORCE_PRESETS } from '../helpers/fixtures';
   ```

2. **Use assertions** - Don't write custom assertion logic
   ```typescript
   import * as assertions from '../helpers/assertions';
   assertions.assertForcesInTerritory(state, faction, territory, sector, count);
   ```

3. **Use enhanced builders** - Use fluent API for readability
   ```typescript
   const responses = new AgentResponseBuilder()
     .forFaction(Faction.ATREIDES)
       .shipment({...})
       .movement({...})
     .forGuild()
       .timing('NOW')
       .normalShipment({...});
   ```

4. **Follow the pattern** - Use `runPhaseScenario` and `logScenarioResults`
   ```typescript
   const result = await runPhaseScenario(state, responses, 'Test Name', 200);
   logScenarioResults('Test Name', result);
   ```

## Test Coverage

### Implemented
- ✅ Foundation infrastructure (assertions, fixtures, builders)
- ✅ Core sequential processing tests (1.1-1.5)
- ✅ Guild handling tests (2.1, 2.5, 2.7)
- ✅ Existing scenario tests (enhanced)

### TODO
- [ ] BG Spiritual Advisor tests (3.1-3.9) - enhance existing
- [ ] BG INTRUSION tests (4.1-4.10)
- [ ] BG WARTIME tests (5.1-5.6)
- [ ] BG TAKE UP ARMS tests (6.1-6.13)
- [ ] Alliance constraint tests (7.1-7.5)
- [ ] Ornithopter access tests (8.1-8.6) - enhance existing
- [ ] Event emission tests (9.1-9.5)
- [ ] Negative test cases (10.1-10.14)
- [ ] Edge cases (11.1-11.12) - enhance existing
- [ ] Unit tests for modules
- [ ] Integration tests for flows

## Principles

1. **DRY (Don't Repeat Yourself)**
   - One place for assertions
   - One place for test data
   - Reusable builders and utilities

2. **Maintainability**
   - Clear organization
   - Descriptive names
   - Helper functions for complex logic
   - Type-safe (TypeScript)

3. **Testability**
   - Pure functions where possible
   - Isolated tests
   - Fast execution
   - Deterministic results

## Examples

See `scenarios/core-sequential.ts` and `scenarios/guild-handling.ts` for complete examples of test implementation.
