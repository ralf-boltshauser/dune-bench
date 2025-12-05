# Combat Rules Tests

Comprehensive test suite for the refactored combat rules modules.

## Structure

```
__tests__/
├── helpers/
│   ├── test-state-builder.ts      # Game state builder with fluent API
│   ├── battle-plan-builder.ts     # Battle plan builder with fluent API
│   ├── assertions.ts               # Reusable assertion helpers
│   ├── test-utils.ts               # General test utilities
│   └── presets.ts                  # Common test data and presets
├── validation.test.ts              # Battle plan validation tests
├── resolution.test.ts              # Battle resolution tests
├── strength-calculation.test.ts   # Strength calculation tests
├── weapon-defense.test.ts          # Weapon/defense interaction tests
├── loss-distribution.test.ts      # Loss distribution tests
├── leader-handling.test.ts        # Leader handling tests
└── integration.test.ts             # Integration and scenario tests
```

## Usage

### Running Tests

Each test file can be run independently:

```bash
# Run a specific test file
node src/lib/game/rules/combat/__tests__/validation.test.ts

# Or use your test runner
npm test -- validation.test.ts
```

### Writing New Tests

Use the helper infrastructure to write maintainable tests:

```typescript
import { CombatTestStatePresets } from './helpers/test-state-builder';
import { BattlePlanPresets } from './helpers/battle-plan-builder';
import { CombatAssertions } from './helpers/assertions';
import { CombatTestUtils } from './helpers/test-utils';

test('my test case', () => {
  // Create state using preset
  const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
  
  // Create plan using preset
  const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
  const plan = BattlePlanPresets.minimal(Faction.ATREIDES, leaderId, 5);
  
  // Run function
  const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);
  
  // Assert using helper
  CombatAssertions.expectValid(result);
});
```

### Using Builders

For more complex scenarios, use the fluent builders:

```typescript
// State builder
const state = CombatTestStateBuilder.create()
  .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
  .withAdvancedRules()
  .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5, 5) // 5 regular + 5 elite
  .withSpice(Faction.ATREIDES, 10)
  .withKwisatzHaderach(Faction.ATREIDES, {
    isActive: true,
    forcesLostCount: 7,
  })
  .build();

// Plan builder
const plan = BattlePlanBuilder.create(Faction.ATREIDES)
  .withLeader('duke_leto')
  .withForces(5)
  .withWeapon('crysknife')
  .withDefense('shield')
  .withSpice(3)
  .withKwisatzHaderach()
  .build();
```

## Test Coverage

- ✅ Battle plan validation (forces, leaders, cards, spice, KH)
- ✅ Battle resolution (normal, traitor, explosion, ties)
- ✅ Strength calculations (leaders, forces, elite, spice dialing)
- ✅ Weapon/defense interactions (matching, special cases, explosion)
- ✅ Loss distribution (forces, cards, keep/discard)
- ✅ Leader handling (spice payouts)
- ✅ Integration scenarios (complete battles)

## Principles

1. **DRY**: Common setup in reusable utilities
2. **Fluent API**: Method chaining for readability
3. **Presets**: Common scenarios as one-liners
4. **Type Safety**: Full TypeScript support
5. **Maintainability**: Easy to extend and modify

