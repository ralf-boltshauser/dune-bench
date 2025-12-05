# Spice Blow Phase - Test Implementation

## Overview

This directory contains a comprehensive, maintainable test suite for the refactored spice-blow phase handler. The tests are organized using a DRY (Don't Repeat Yourself) approach with reusable infrastructure.

## Test Structure

```
phase-tests/spice-blow/
├── helpers/                    # Reusable test infrastructure
│   ├── fixtures.ts             # Test data (cards, territories, presets)
│   ├── assertions.ts           # Reusable assertion functions
│   ├── module-test-utils.ts    # Module-specific test utilities
│   ├── test-state-builder.ts   # Enhanced state builder (fluent API)
│   └── agent-response-builder.ts # Enhanced response builder (fluent API)
├── unit/                       # Unit tests for individual modules
│   ├── validation.test.ts      # Validation module tests
│   └── placement.test.ts       # Placement module tests
├── integration/                # Integration tests
│   ├── card-revelation.test.ts # Card revelation flow tests
│   └── spice-placement.test.ts # Spice placement flow tests
├── scenarios/                  # End-to-end scenario tests (existing)
│   └── ...                    # Scenario test files
└── test-unit-and-integration.ts # Test runner for unit & integration tests
```

## Running Tests

### Unit and Integration Tests
```bash
pnpm test:spice-blow:unit
# or
tsx src/lib/game/phase-tests/spice-blow/test-unit-and-integration.ts
```

### Scenario Tests (Existing)
```bash
pnpm test:spice-blow
# or
tsx src/lib/game/phase-tests/spice-blow/test-spice-blow-phase.ts
```

## Test Infrastructure

### Fixtures (`helpers/fixtures.ts`)

Reusable test data - single source of truth:

```typescript
import { TEST_CARDS, DECK_PRESETS, STATE_PRESETS } from './helpers/fixtures';

// Use card IDs
TEST_CARDS.TERRITORY_CIELAGO_SOUTH
TEST_CARDS.SHAI_HULUD_1

// Use deck presets
DECK_PRESETS.SINGLE_TERRITORY
DECK_PRESETS.WORM_THEN_TERRITORY
DECK_PRESETS.MULTIPLE_WORMS

// Use state presets
STATE_PRESETS.TURN_2_BASIC
STATE_PRESETS.TURN_2_ADVANCED
```

### Assertions (`helpers/assertions.ts`)

Reusable assertion functions:

```typescript
import { assertSpicePlaced, assertEventEmitted } from './helpers/assertions';

// State assertions
assertSpicePlaced(state, TerritoryId.ARRAKEEN, 3, 3);
assertSpiceNotPlaced(state, TerritoryId.ARRAKEEN, 3);
assertForcesDevoured(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 3, 5);
assertAllianceFormed(state, Faction.ATREIDES, Faction.HARKONNEN);

// Event assertions
assertEventEmitted(events, 'SPICE_PLACED', { territory: TerritoryId.ARRAKEEN });
assertEventNotEmitted(events, 'NEXUS_STARTED');
assertEventCount(events, 'SPICE_CARD_REVEALED', 2);

// Deck assertions
assertCardInDiscard(state, 'A', TEST_CARDS.TERRITORY_CIELAGO_SOUTH);
assertDeckSize(state, 'A', 5);
```

### Test State Builder (`helpers/test-state-builder.ts`)

Fluent API for building test states:

```typescript
import { TestStateBuilder } from './helpers/test-state-builder';
import { DECK_PRESETS } from './helpers/fixtures';

const state = TestStateBuilder.create()
  .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
  .withTurn(2)
  .withStormSector(5)
  .withSpiceDeckA(DECK_PRESETS.SINGLE_TERRITORY)
  .withForces([...])
  .build();
```

### Agent Response Builder (`helpers/agent-response-builder.ts`)

Fluent API for building agent responses:

```typescript
import { AgentResponseBuilder } from './helpers/agent-response-builder';

const responses = new AgentResponseBuilder()
  .forFremen()
    .protectAlly(true)
    .rideWorm(false)
  .forFaction(Faction.ATREIDES)
    .formAlliance(Faction.HARKONNEN)
  .getResponses();
```

### Module Test Utils (`helpers/module-test-utils.ts`)

Module-specific test utilities:

```typescript
import { ValidationTestUtils, PlacementTestUtils } from './helpers/module-test-utils';

// Validation tests
const stormState = ValidationTestUtils.createStormState(3);

// Placement tests
const placementState = PlacementTestUtils.createPlacementState(
  TerritoryId.ARRAKEEN,
  3,
  5 // storm sector
);
```

## Writing Tests

### Unit Test Example

```typescript
import { ValidationTestUtils } from '../helpers/module-test-utils';
import { isInStorm } from '../../../../phases/handlers/spice-blow/validation';

export function testIsInStorm() {
  const state = ValidationTestUtils.createStormState(3);
  const result = isInStorm(state, 3, TerritoryId.RED_CHASM);
  
  if (!result) {
    throw new Error('Expected isInStorm to return true');
  }
  
  console.log('✓ Test passed');
}
```

### Integration Test Example

```typescript
import { TestStateBuilder } from '../helpers/test-state-builder';
import { DECK_PRESETS } from '../helpers/fixtures';
import { assertSpicePlaced, assertEventEmitted } from '../helpers/assertions';
import { SpiceBlowPhaseHandler } from '../../../../phases/handlers/spice-blow';

export async function testSpicePlacement() {
  const state = TestStateBuilder.create()
    .withFactions([Faction.ATREIDES])
    .withTurn(2)
    .withSpiceDeckA(DECK_PRESETS.SINGLE_TERRITORY)
    .build();
  
  const handler = new SpiceBlowPhaseHandler();
  const result = handler.initialize(state);
  
  // Process phase...
  
  // Assertions
  assertSpicePlaced(result.state, TerritoryId.CIELAGO_SOUTH, 1, 12);
  assertEventEmitted(result.events, 'SPICE_PLACED');
}
```

## Test Coverage

### Unit Tests
- ✅ Validation module (`isInStorm`, `validateNoSpiceInStorm`)
- ✅ Placement module (`handleTerritoryCard`)
- ⏳ Reveal module (planned)
- ⏳ Deck module (planned)
- ⏳ Shai-Hulud module (planned)
- ⏳ Nexus module (planned)

### Integration Tests
- ✅ Card revelation flow
- ✅ Spice placement flow
- ⏳ Shai-Hulud flow (planned)
- ⏳ Nexus flow (planned)
- ⏳ Full phase flow (planned)

### Scenario Tests (Existing)
- ✅ Turn 1 multiple worms
- ✅ Multiple worms devouring
- ✅ Fremen worm immunity
- ✅ Fremen ally protection
- ✅ Spice in storm
- ✅ Nexus alliance negotiations
- ✅ Complex multi-faction devouring

## Benefits

### Maintainability
- ✅ Single source of truth for test data (fixtures)
- ✅ Reusable assertions reduce duplication
- ✅ Fluent APIs make tests readable

### Reliability
- ✅ Consistent test patterns
- ✅ Validated test data
- ✅ Comprehensive assertions

### Extensibility
- ✅ Easy to add new tests
- ✅ Easy to add new fixtures
- ✅ Easy to add new assertions

## Next Steps

1. **Complete Unit Tests** - Add tests for remaining modules
2. **Complete Integration Tests** - Add tests for remaining flows
3. **Enhance Scenario Tests** - Use new helpers in existing scenarios
4. **Add More Test Cases** - Cover edge cases from test plan

## Notes

- Tests use `tsx` to run TypeScript directly (no compilation step)
- Unit tests use simple assertions (throw errors on failure)
- Integration tests simulate full phase execution
- Scenario tests write log files for manual review (existing pattern)

