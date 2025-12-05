# Storm Phase Test Suite (Refactored)

## Overview

Comprehensive test suite for the refactored storm phase handler. Tests are organized into maintainable, reusable modules following DRY principles.

## Structure

```
phase-tests/storm/
├── helpers/
│   ├── agent-response-builder.ts          ✅ Enhanced with fluent methods
│   ├── test-state-builder.ts              ✅ Enhanced with builder pattern
│   ├── assertions.ts                      🆕 Core assertion utilities
│   ├── event-assertions.ts                🆕 Event validation utilities
│   ├── state-assertions.ts                🆕 State validation utilities
│   ├── fixtures.ts                        🆕 Pre-built test scenarios
│   └── module-helpers/                    🆕 Module-specific helpers
│       ├── dialing-helpers.ts
│       ├── storm-deck-helpers.ts
│       ├── family-atomics-helpers.ts
│       ├── weather-control-helpers.ts
│       ├── movement-helpers.ts
│       └── order-helpers.ts
├── scenarios/
│   ├── base-scenario.ts                   ✅ Enhanced with assertions
│   ├── unit/                              🆕 Unit tests
│   │   ├── dialing.test.ts
│   │   ├── initialization.test.ts
│   │   ├── family-atomics.test.ts
│   │   ├── weather-control.test.ts
│   │   ├── movement.test.ts
│   │   └── order-calculation.test.ts
│   ├── integration/                       🆕 Integration tests
│   │   └── full-phase-flow.test.ts
│   └── [existing e2e scenarios]
└── test-storm-refactored.ts               🆕 Main test runner
```

## Test Infrastructure

### Core Helpers

1. **Assertions** (`assertions.ts`)
   - `StormAssertions`: Centralized assertion functions
   - Validates storm movement, dials, events, state changes

2. **Event Assertions** (`event-assertions.ts`)
   - `EventAssertions`: Event-specific validation
   - Find events, assert existence, validate data, check order

3. **State Assertions** (`state-assertions.ts`)
   - `StateAssertions`: State validation utilities
   - Assert storm sector, player positions, forces, spice, cards

4. **Fixtures** (`fixtures.ts`)
   - `StormTestFixtures`: Pre-built common scenarios
   - Reusable test states for common patterns

### Enhanced Helpers

1. **AgentResponseBuilder** (enhanced)
   - Fluent chaining: `queueTurn2Dials()`, `queueWeatherControlWithMovement()`
   - Helper methods: `getResponsesArray()`, `getResponseFor()`

2. **TestStateBuilder** (enhanced)
   - Builder pattern: `StormTestStateBuilder.forTurn2().withForces().build()`
   - Static factories: `forTurn1()`, `forTurn2()`, `withFremen()`

### Module Helpers

Each module has specialized helpers:
- **DialingTestHelpers**: Dialer selection, response processing
- **StormDeckTestHelpers**: Deck operations, card management
- **FamilyAtomicsTestHelpers**: Eligibility, destruction
- **WeatherControlTestHelpers**: Card play, movement override
- **MovementTestHelpers**: Sector calculation, destruction
- **OrderTestHelpers**: Order calculation, validation

## Running Tests

### Run All Tests
```bash
pnpm exec tsx src/lib/game/phase-tests/storm/test-storm-refactored.ts
```

### Run Unit Tests Only
```typescript
import { runDialingUnitTests } from './scenarios/unit/dialing.test';
runDialingUnitTests();
```

### Run Integration Tests
```typescript
import { runIntegrationTests } from './scenarios/integration/full-phase-flow.test';
runIntegrationTests();
```

## Writing New Tests

### Example: Unit Test
```typescript
import { Faction } from '../../../types';
import { getStormDialers } from '../../../phases/handlers/storm/dialing';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { DialingTestHelpers } from '../../helpers/module-helpers/dialing-helpers';

export function testMyNewFeature(): boolean {
  console.log('\n📋 Test: My New Feature');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .withForces({
        faction: Faction.ATREIDES,
        territory: TerritoryId.MERIDIAN,
        sector: 12,
        regular: 5,
      })
      .build();

    // Test logic here
    const result = getStormDialers(state);
    
    // Assertions
    DialingTestHelpers.assertDialersSelected(result, [Faction.ATREIDES, Faction.HARKONNEN]);
    
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}
```

### Example: E2E Test
```typescript
import { StormTestFixtures } from '../helpers/fixtures';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runAndValidateScenario } from './base-scenario';

export async function testMyE2EScenario(): Promise<boolean> {
  const { state } = StormTestFixtures.turn2TwoFactions(10);
  
  const responses = new AgentResponseBuilder()
    .queueTurn2Dials(Faction.ATREIDES, 2, Faction.HARKONNEN, 3);

  const result = await runAndValidateScenario(
    state,
    responses,
    'my-scenario',
    {
      stormMoved: { from: 10, to: 15, movement: 5 },
      phaseCompleted: true,
    }
  );

  return result.completed;
}
```

## Test Coverage

### Unit Tests
- ✅ Dialing module (4 tests)
- ✅ Initialization module (5 tests)
- ✅ Family Atomics module (3 tests)
- ✅ Weather Control module (2 tests)
- ✅ Movement module (3 tests)
- ✅ Order Calculation module (2 tests)

### Integration Tests
- ✅ Full phase flow with dialing
- ✅ Fremen storm deck flow

### E2E Tests
- ✅ Turn 1 initial placement
- ✅ Player on storm sector
- ✅ Fremen storm deck
- ✅ Force destruction
- ✅ Fremen half losses

## Best Practices

1. **Use Builders**: Always use `StormTestStateBuilder` for state creation
2. **Use Assertions**: Use assertion helpers instead of manual checks
3. **Use Fixtures**: Reuse `StormTestFixtures` for common scenarios
4. **Use Module Helpers**: Use module-specific helpers for specialized operations
5. **DRY**: Don't repeat code - extract to helpers if used 3+ times

## Maintenance

- All helpers are documented with JSDoc
- Tests are self-documenting with clear names
- Changes to implementation don't break tests (if behavior preserved)
- Helpers abstract implementation details

