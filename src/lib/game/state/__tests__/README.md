# Mutation Tests

Comprehensive test suite for state mutation functions.

## Structure

```
__tests__/
├── helpers/                          # Reusable test utilities
│   ├── test-state-builder.ts        # Fluent API for building test states
│   ├── immutability-helpers.ts      # State cloning and immutability verification
│   ├── assertion-helpers.ts         # Domain-specific assertions
│   └── test-fixtures.ts             # Common test data constants
├── mutations/                        # Test files by mutation category
│   ├── common.test.ts               # Common utilities (logAction)
│   ├── spice.test.ts                # Spice mutations
│   ├── phase.test.ts                # Phase mutations
│   ├── storm.test.ts                # Storm mutations
│   ├── forces.test.ts               # Force mutations
│   ├── forces-bene-gesserit.test.ts # BG force conversions
│   ├── leaders.test.ts              # Leader mutations
│   ├── leaders-harkonnen.test.ts    # Harkonnen leader mutations
│   ├── cards.test.ts                # Card mutations
│   ├── alliances.test.ts            # Alliance mutations
│   ├── kwisatz-haderach.test.ts     # KH mutations
│   ├── karama.test.ts               # Karama interrupt mutations
│   ├── deals.test.ts                # Deal mutations
│   └── victory.test.ts              # Victory mutations
└── integration/
    └── mutation-sequences.test.ts   # Cross-module integration tests
```

## Usage

### Building Test States

Use the fluent API to build test states:

```typescript
import { buildTestState } from '../helpers/test-state-builder';

const state = buildTestState()
  .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
  .withSpice(Faction.ATREIDES, 20)
  .withForces({
    faction: Faction.ATREIDES,
    territory: TerritoryId.ARRAKEEN,
    sector: 1,
    regular: 5,
    elite: 2
  })
  .withPhase(Phase.SHIPMENT_MOVEMENT)
  .withTurn(2)
  .build();
```

### Testing Immutability

Always verify that mutations don't modify the original state:

```typescript
import { cloneStateForTesting, verifyStateNotSame } from '../helpers/immutability-helpers';

const state = buildTestState().build();
const original = cloneStateForTesting(state);

const result = mutationFunction(state, /* args */);

verifyStateNotSame(original, result);
```

### Using Assertions

Use domain-specific assertion helpers:

```typescript
import { expectSpice, expectForceCount } from '../helpers/assertion-helpers';

expectSpice(result, Faction.ATREIDES, 20);
expectForceCount(result, Faction.ATREIDES, 'reserves', { regular: 10, elite: 2 });
```

## Test Patterns

### Standard Test Structure

```typescript
describe('FunctionName', () => {
  it('should [expected behavior]', () => {
    // Arrange
    const state = buildTestState()
      .withSpice(Faction.ATREIDES, 10)
      .build();

    // Act
    const result = mutationFunction(state, /* args */);

    // Assert
    expectSpice(result, Faction.ATREIDES, 15);
  });
});
```

### Immutability Test Pattern

Every mutation function should include:

```typescript
it('should not modify original state', () => {
  const state = buildTestState().build();
  const original = cloneStateForTesting(state);

  const result = mutationFunction(state, /* args */);

  verifyStateNotSame(original, result);
});
```

## Test Coverage

- ✅ **Function Coverage**: Every exported mutation function
- ✅ **Branch Coverage**: All conditional paths
- ✅ **Edge Cases**: Boundary conditions and error cases
- ✅ **Immutability**: Every function verified

## Running Tests

```bash
# Run all mutation tests
npm test -- mutations

# Run specific test file
npm test -- mutations/spice.test.ts

# Run with coverage
npm test -- --coverage mutations
```

## Adding New Tests

1. Create test file in appropriate directory
2. Import helpers and mutations
3. Follow standard test patterns
4. Include immutability tests
5. Test edge cases and errors

See `example-test-file.ts` in `.notes/refactoring/` for complete examples.

