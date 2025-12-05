# Movement Rules Tests

Comprehensive test suite for the refactored movement rules module.

## Structure

```
__tests__/
├── movement.test.ts              # Main test file
├── helpers/
│   ├── index.ts                  # Re-exports all helpers
│   ├── test-state-builder.ts     # Fluent state builder
│   ├── assertions.ts              # Validation result assertions
│   ├── fixtures.ts               # Test data constants
│   └── test-patterns.ts          # Reusable test patterns
└── README.md                     # This file
```

## Running Tests

```bash
# Run all movement tests
pnpm test movement.test.ts

# Run with coverage
pnpm test movement.test.ts --coverage

# Run in watch mode
pnpm test movement.test.ts --watch
```

## Test Organization

Tests are organized by functionality:

1. **Shipment Validation** - Normal shipment, faction-specific rules, edge cases
2. **Movement Validation** - Basic movement, range, ornithopters, storm, occupancy
3. **Pathfinding** - Path finding, reachability, distance calculations
4. **Cost Calculation** - Shipment cost calculations

## Using Helpers

### State Builder

```typescript
import { MovementTestStateBuilder } from './helpers';

const state = MovementTestStateBuilder.create()
  .withFactions([Faction.ATREIDES])
  .withSpice(Faction.ATREIDES, 20)
  .withReserves(Faction.ATREIDES, 10)
  .withForce(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5)
  .build();
```

### Assertions

```typescript
import { assertValid, assertErrorCode } from './helpers';

const result = validateShipment(...);
assertValid(result);
assertErrorCode(result, 'INSUFFICIENT_SPICE');
```

### Test Patterns

```typescript
import { testValidShipment, testInvalidShipment } from './helpers';

testValidShipment(state, faction, territory, sector, forceCount, expectedCost);
testInvalidShipment(state, faction, territory, sector, forceCount, 'ERROR_CODE');
```

## Principles

- **DRY**: No code duplication - all helpers are reusable
- **Maintainable**: Change helpers once, all tests benefit
- **Readable**: Tests are clear and concise
- **Type-Safe**: Full TypeScript support

