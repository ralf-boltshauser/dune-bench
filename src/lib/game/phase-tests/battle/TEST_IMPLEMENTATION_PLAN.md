# Battle Phase Test Implementation Plan

## Overview

This plan outlines a maintainable, DRY (Don't Repeat Yourself) approach to implementing the comprehensive battle phase test suite defined in `TEST_DEFINITION.md`.

## Architecture Principles

### 1. **Layered Test Architecture**
- **Foundation Layer**: Core test utilities (state builders, response builders, assertions)
- **Fixture Layer**: Reusable test scenarios and data
- **Test Layer**: Specific test cases using fixtures
- **Suite Layer**: Organized test suites by category

### 2. **DRY Principles**
- ✅ Build once, reuse everywhere
- ✅ Single source of truth for test data
- ✅ Composable test utilities
- ✅ Shared fixtures for common scenarios

### 3. **Maintainability**
- Clear separation of concerns
- Easy to add new tests
- Easy to modify existing tests
- Self-documenting test structure

---

## Directory Structure

```
src/lib/game/phase-tests/battle/
├── helpers/                          # Core test utilities (EXISTING)
│   ├── test-state-builder.ts         # State creation utilities
│   ├── agent-response-builder.ts     # Response mocking utilities
│   └── decision-agent-provider.ts    # Agent provider
│
├── fixtures/                         # NEW: Reusable test fixtures
│   ├── battle-scenarios.ts          # Common battle setups
│   ├── faction-setups.ts            # Faction-specific configurations
│   ├── storm-patterns.ts            # Storm configuration utilities
│   └── test-data.ts                 # Shared test data constants
│
├── builders/                         # NEW: Specialized builders
│   ├── battle-state-builder.ts      # Battle-specific state builder
│   ├── alliance-builder.ts           # Alliance configuration builder
│   ├── leader-builder.ts            # Leader state builder
│   └── card-builder.ts               # Card hand builder
│
├── assertions/                       # EXISTING + EXPANDED
│   ├── battle-assertions.ts         # Core assertions (EXISTING)
│   ├── state-assertions.ts          # NEW: State validation assertions
│   ├── event-assertions.ts          # NEW: Event-specific assertions
│   └── module-assertions.ts         # NEW: Module-specific assertions
│
├── scenarios/                        # EXISTING + EXPANDED
│   ├── base-scenario.ts             # Base scenario runner (EXISTING)
│   ├── unit-scenarios.ts            # NEW: Unit test scenarios
│   └── integration-scenarios.ts     # NEW: Integration test scenarios
│
├── suites/                           # NEW: Organized test suites
│   ├── 01-identification/           # Battle identification tests
│   ├── 02-sub-phases/               # Sub-phase execution tests
│   ├── 03-battle-plans/             # Battle plan validation tests
│   ├── 04-resolution/               # Battle resolution tests
│   ├── 05-events/                   # Event emission tests
│   ├── 06-agent-handling/           # Agent request/response tests
│   ├── 07-modules/                  # Module-specific tests
│   ├── 08-edge-cases/               # Edge case tests
│   ├── 09-integration/              # Integration tests
│   └── 10-performance/              # Performance/stress tests
│
└── test-battle-phase.ts             # Main test runner (EXISTING)
```

---

## Core Components

### 1. Test Fixtures (`fixtures/`)

**Purpose**: Reusable test data and scenarios

#### `fixtures/battle-scenarios.ts`
```typescript
/**
 * Common battle scenario configurations
 * Reusable across multiple test suites
 */

export const BattleScenarios = {
  // Two-faction battles
  twoFaction: {
    basic: (faction1: Faction, faction2: Faction) => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 10 },
        { faction: faction2, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 8 },
      ],
    }),
    
    stronghold: (faction1: Faction, faction2: Faction) => ({
      // Stronghold-specific configuration
    }),
    
    withStorm: (faction1: Faction, faction2: Faction, stormSector: number) => ({
      // Storm-affected battle
    }),
  },
  
  // Three-faction battles
  threeFaction: {
    basic: (f1: Faction, f2: Faction, f3: Faction) => ({
      // Three-faction configuration
    }),
  },
  
  // Special scenarios
  lasgunShield: {
    // Lasgun-shield explosion scenario
  },
  
  traitor: {
    single: (/* ... */) => ({}),
    twoTraitors: (/* ... */) => ({}),
  },
};
```

#### `fixtures/faction-setups.ts`
```typescript
/**
 * Faction-specific test configurations
 */

export const FactionSetups = {
  atreides: {
    withPrescience: (/* ... */) => ({}),
    withKwisatzHaderach: (/* ... */) => ({}),
  },
  
  beneGesserit: {
    withVoice: (/* ... */) => ({}),
    withAdvisors: (territory: TerritoryId, sector: number, count: number) => ({}),
    withUniversalStewards: (/* ... */) => ({}),
  },
  
  harkonnen: {
    withTraitors: (/* ... */) => ({}),
    withCapturedLeaders: (/* ... */) => ({}),
  },
  
  // ... other factions
};
```

#### `fixtures/storm-patterns.ts`
```typescript
/**
 * Storm pattern configurations for testing
 */

export const StormPatterns = {
  noStorm: () => ({}),
  
  sameSectorStorm: (sector: number) => ({
    // Forces in same sector under storm (BATTLING BLIND)
  }),
  
  separatedByStorm: (sector1: number, sector2: number) => ({
    // Forces separated by storm
  }),
  
  complex: (/* ... */) => ({}),
};
```

#### `fixtures/test-data.ts`
```typescript
/**
 * Shared test data constants
 */

export const TestData = {
  leaders: {
    atreides: ['paul_atreides', 'duncan_idaho', /* ... */],
    harkonnen: ['feyd_rautha', 'beast_rabban', /* ... */],
    // ... all factions
  },
  
  cards: {
    weapons: {
      poison: ['chaumas', 'chaumurky', 'gom_jabbar'],
      projectile: ['crysknife', 'maula_pistol', /* ... */],
      special: ['lasgun'],
    },
    defenses: {
      poison: ['snooper'],
      projectile: ['shield'],
    },
    worthless: ['baliset', 'jubba_cloak', /* ... */],
  },
  
  territories: {
    strongholds: [TerritoryId.ARRAKEEN, TerritoryId.CARTHAG, /* ... */],
    polarSink: TerritoryId.POLAR_SINK,
  },
};
```

---

### 2. Specialized Builders (`builders/`)

**Purpose**: Extend base builders with battle-specific functionality

#### `builders/battle-state-builder.ts`
```typescript
/**
 * Battle-specific state builder
 * Extends test-state-builder with battle-specific helpers
 */

import { buildTestState, type TestStateConfig } from '../helpers/test-state-builder';
import { BattleScenarios } from '../fixtures/battle-scenarios';
import { FactionSetups } from '../fixtures/faction-setups';

export class BattleStateBuilder {
  private config: Partial<TestStateConfig> = {};
  
  /**
   * Start with a two-faction battle scenario
   */
  twoFactionBattle(faction1: Faction, faction2: Faction) {
    this.config = {
      ...this.config,
      ...BattleScenarios.twoFaction.basic(faction1, faction2),
    };
    return this;
  }
  
  /**
   * Add storm pattern
   */
  withStorm(pattern: StormPattern) {
    // Apply storm pattern
    return this;
  }
  
  /**
   * Add faction-specific setup
   */
  withFactionSetup(faction: Faction, setup: FactionSetup) {
    // Apply faction setup
    return this;
  }
  
  /**
   * Add alliance
   */
  withAlliance(faction1: Faction, faction2: Faction) {
    // Add alliance
    return this;
  }
  
  /**
   * Build final state
   */
  build(): GameState {
    return buildTestState(this.config as TestStateConfig);
  }
}
```

#### `builders/alliance-builder.ts`
```typescript
/**
 * Alliance configuration builder
 */

export class AllianceBuilder {
  // Helper to set up alliances in test state
}
```

#### `builders/leader-builder.ts`
```typescript
/**
 * Leader state builder
 * Helper to configure leader availability, usage, etc.
 */

export class LeaderBuilder {
  // Helper to set up leader states
}
```

#### `builders/card-builder.ts`
```typescript
/**
 * Card hand builder
 * Helper to configure faction card hands
 */

export class CardBuilder {
  // Helper to set up card hands
}
```

---

### 3. Expanded Assertions (`assertions/`)

**Purpose**: Comprehensive assertion library

#### `assertions/state-assertions.ts`
```typescript
/**
 * State validation assertions
 */

export function assertForcesCount(
  faction: Faction,
  territory: TerritoryId,
  expectedRegular: number,
  expectedElite: number = 0
): BattleAssertion {
  // Assert forces count
}

export function assertLeaderInPool(
  faction: Faction,
  leaderId: string
): BattleAssertion {
  // Assert leader in pool
}

export function assertLeaderInTerritory(
  faction: Faction,
  leaderId: string,
  territory: TerritoryId
): BattleAssertion {
  // Assert leader in territory
}

export function assertLeaderInTanks(
  faction: Faction,
  leaderId: string
): BattleAssertion {
  // Assert leader in tanks
}

export function assertCardInHand(
  faction: Faction,
  cardId: string
): BattleAssertion {
  // Assert card in hand
}

export function assertCardDiscarded(
  faction: Faction,
  cardId: string
): BattleAssertion {
  // Assert card discarded
}

export function assertSubPhase(
  expectedSubPhase: BattleSubPhase
): BattleAssertion {
  // Assert current sub-phase
}

export function assertPendingBattlesCount(
  expectedCount: number
): BattleAssertion {
  // Assert pending battles count
}
```

#### `assertions/event-assertions.ts`
```typescript
/**
 * Event-specific assertions
 */

export function assertEventWithData(
  eventType: string,
  dataMatcher: (data: any) => boolean
): BattleAssertion {
  // Assert event with specific data
}

export function assertEventSequence(
  eventTypes: string[]
): BattleAssertion {
  // Assert events occurred in sequence
}

export function assertEventCount(
  eventType: string,
  expectedCount: number
): BattleAssertion {
  // Assert event occurred N times
}

export function assertNoEvent(
  eventType: string
): BattleAssertion {
  // Assert event did NOT occur
}

// Specific event assertions
export function assertAdvisorsFlipped(
  faction: Faction,
  territory: TerritoryId,
  count: number
): BattleAssertion {
  // Assert ADVISORS_FLIPPED event
}

export function assertPrisonBreak(
  faction: Faction
): BattleAssertion {
  // Assert PRISON_BREAK event
}

export function assertLasgunShieldExplosion(): BattleAssertion {
  // Assert LASGUN_SHIELD_EXPLOSION event
}
```

#### `assertions/module-assertions.ts`
```typescript
/**
 * Module-specific assertions
 * For testing refactored modules in isolation
 */

export function assertInitializationComplete(): BattleAssertion {
  // Assert initialization module worked
}

export function assertUniversalStewardsApplied(): BattleAssertion {
  // Assert Universal Stewards was applied
}

export function assertSubPhaseTransition(
  from: BattleSubPhase,
  to: BattleSubPhase
): BattleAssertion {
  // Assert sub-phase transition
}
```

---

### 4. Test Scenarios (`scenarios/`)

**Purpose**: Reusable scenario runners

#### `scenarios/unit-scenarios.ts`
```typescript
/**
 * Unit test scenarios
 * For testing individual modules/functions
 */

export async function runModuleTest(
  moduleName: string,
  testFn: (state: GameState) => Promise<GameState>,
  initialState: GameState
): Promise<ScenarioResult> {
  // Run module test in isolation
}

export async function runFunctionTest(
  functionName: string,
  testFn: Function,
  args: any[]
): Promise<any> {
  // Run function test
}
```

#### `scenarios/integration-scenarios.ts`
```typescript
/**
 * Integration test scenarios
 * For testing full battle flow
 */

export async function runFullBattleFlow(
  state: GameState,
  responses: AgentResponseBuilder
): Promise<ScenarioResult> {
  // Run complete battle from start to finish
}

export async function runMultipleBattles(
  state: GameState,
  responses: AgentResponseBuilder[]
): Promise<ScenarioResult> {
  // Run multiple battles in sequence
}
```

---

### 5. Test Suites (`suites/`)

**Purpose**: Organized test cases by category

Each suite directory contains:
- `index.ts` - Suite runner
- `test-*.ts` - Individual test files
- `fixtures.ts` - Suite-specific fixtures (if needed)

#### Example: `suites/01-identification/test-basic-detection.ts`
```typescript
/**
 * Test: Basic Battle Detection
 * Category: 1.1 Basic Battle Detection
 */

import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { assertEventOccurred, assertPendingBattlesCount } from '../../assertions';

describe('Basic Battle Detection', () => {
  it('should identify battles in territories with 2+ factions', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .build();
    
    const responses = new AgentResponseBuilder();
    // ... queue responses
    
    const result = await runBattleScenario(state, responses, 'Two-faction battle');
    
    // Assertions
    expect(assertEventOccurred('BATTLE_STARTED').check(result)).toBe(true);
    expect(assertPendingBattlesCount(1).check(result)).toBe(true);
  });
  
  it('should exclude territories with only one faction', async () => {
    // Test implementation
  });
  
  // ... more tests
});
```

#### Example: `suites/01-identification/index.ts`
```typescript
/**
 * Battle Identification Test Suite
 */

import './test-basic-detection';
import './test-storm-separation';
import './test-stronghold-occupancy';
import './test-multiple-battles';
import './test-universal-stewards';
```

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

**Goal**: Set up infrastructure

1. **Create fixture system**
   - [ ] `fixtures/battle-scenarios.ts` - Common battle setups
   - [ ] `fixtures/faction-setups.ts` - Faction configurations
   - [ ] `fixtures/storm-patterns.ts` - Storm patterns
   - [ ] `fixtures/test-data.ts` - Shared constants

2. **Create specialized builders**
   - [ ] `builders/battle-state-builder.ts` - Battle state builder
   - [ ] `builders/alliance-builder.ts` - Alliance builder
   - [ ] `builders/leader-builder.ts` - Leader builder
   - [ ] `builders/card-builder.ts` - Card builder

3. **Expand assertions**
   - [ ] `assertions/state-assertions.ts` - State assertions
   - [ ] `assertions/event-assertions.ts` - Event assertions
   - [ ] `assertions/module-assertions.ts` - Module assertions

### Phase 2: Core Tests (Week 2)

**Goal**: Implement core functionality tests

1. **Battle Identification (Suite 01)**
   - [ ] Basic detection tests
   - [ ] Storm separation tests
   - [ ] Stronghold occupancy tests
   - [ ] Multiple battles tests
   - [ ] Universal Stewards tests

2. **Sub-Phase Execution (Suite 02)**
   - [ ] Sub-phase sequence tests
   - [ ] Voice sub-phase tests
   - [ ] Prescience sub-phase tests
   - [ ] Battle plans sub-phase tests
   - [ ] Reveal sub-phase tests
   - [ ] Traitor call sub-phase tests
   - [ ] Resolution sub-phase tests

### Phase 3: Advanced Tests (Week 3)

**Goal**: Implement advanced feature tests

1. **Battle Plans (Suite 03)**
   - [ ] Forces dialed validation
   - [ ] Leader/Cheap Hero validation
   - [ ] Treachery cards validation
   - [ ] Spice dialing tests
   - [ ] Prescience commitment validation
   - [ ] Voice command validation

2. **Battle Resolution (Suite 04)**
   - [ ] Basic resolution tests
   - [ ] Weapon/defense interactions
   - [ ] Elite forces tests
   - [ ] Traitor resolution tests
   - [ ] Lasgun-shield explosion tests
   - [ ] Kwisatz Haderach tests

### Phase 4: Events & Agent Handling (Week 4)

**Goal**: Implement event and agent tests

1. **Events (Suite 05)**
   - [ ] Phase start events
   - [ ] Battle flow events
   - [ ] Post-resolution events
   - [ ] Phase end events
   - [ ] Event data validation

2. **Agent Handling (Suite 06)**
   - [ ] Battle choice request tests
   - [ ] Voice request tests
   - [ ] Prescience request tests
   - [ ] Battle plans request tests
   - [ ] Traitor call request tests
   - [ ] Winner discard request tests
   - [ ] Harkonnen capture request tests
   - [ ] Response validation tests

### Phase 5: Modules & Edge Cases (Week 5)

**Goal**: Implement module and edge case tests

1. **Modules (Suite 07)**
   - [ ] Initialization module tests
   - [ ] Sub-phase module tests
   - [ ] Resolution module tests
   - [ ] Post-resolution module tests
   - [ ] Helpers module tests
   - [ ] Cleanup module tests

2. **Edge Cases (Suite 08)**
   - [ ] Multiple battles tests
   - [ ] Alliances tests
   - [ ] No leaders available tests
   - [ ] Prison Break tests
   - [ ] Dedicated Leader tests
   - [ ] Stronghold occupancy tests
   - [ ] Spice dialing edge cases

### Phase 6: Integration & Performance (Week 6)

**Goal**: Implement integration and performance tests

1. **Integration (Suite 09)**
   - [ ] Full battle flow tests
   - [ ] Context management tests
   - [ ] State consistency tests

2. **Performance (Suite 10)**
   - [ ] Large scale tests
   - [ ] Response handling tests

---

## Reusable Test Patterns

### Pattern 1: Standard Battle Test
```typescript
async function testStandardBattle(
  aggressor: Faction,
  defender: Faction,
  expectedWinner: Faction
) {
  const state = new BattleStateBuilder()
    .twoFactionBattle(aggressor, defender)
    .build();
  
  const responses = new AgentResponseBuilder()
    .queueBattleChoice(aggressor, TerritoryId.ARRAKEEN, defender)
    .queueBattlePlan(aggressor, { /* ... */ })
    .queueBattlePlan(defender, { /* ... */ });
  
  const result = await runBattleScenario(state, responses, 'Standard battle');
  
  return {
    result,
    assertions: [
      assertBattleResolved(),
      assertEventOccurred('BATTLE_RESOLVED'),
      // ... more assertions
    ],
  };
}
```

### Pattern 2: Faction Ability Test
```typescript
async function testFactionAbility(
  ability: 'prescience' | 'voice',
  setupFn: (builder: BattleStateBuilder) => BattleStateBuilder
) {
  const state = setupFn(new BattleStateBuilder()).build();
  const responses = new AgentResponseBuilder();
  // ... queue ability-specific responses
  
  const result = await runBattleScenario(state, responses, `${ability} test`);
  
  return result;
}
```

### Pattern 3: Module Isolation Test
```typescript
async function testModule(
  moduleName: string,
  moduleFn: Function,
  inputState: GameState,
  expectedOutput: Partial<GameState>
) {
  const outputState = moduleFn(inputState);
  
  // Assert module output
  // ...
}
```

---

## Best Practices

### 1. **Use Fixtures, Not Duplication**
❌ **BAD**: Copy-paste state setup in every test
```typescript
const state = buildTestState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
  forces: [/* ... */],
  // ... repeated in every test
});
```

✅ **GOOD**: Use fixtures
```typescript
const state = BattleScenarios.twoFaction.basic(
  Faction.ATREIDES,
  Faction.HARKONNEN
);
```

### 2. **Compose, Don't Duplicate**
❌ **BAD**: Create separate builders for each scenario
✅ **GOOD**: Compose builders
```typescript
const state = new BattleStateBuilder()
  .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
  .withStorm(StormPatterns.sameSectorStorm(9))
  .withFactionSetup(Faction.ATREIDES, FactionSetups.atreides.withPrescience())
  .build();
```

### 3. **Reuse Assertions**
❌ **BAD**: Write custom assertion logic in every test
✅ **GOOD**: Use assertion library
```typescript
const assertions = [
  assertBattleResolved(),
  assertFactionSpice(Faction.ATREIDES, 15),
  assertForcesInTerritory(Faction.ATREIDES, TerritoryId.ARRAKEEN, 5, 0),
];
```

### 4. **Organize by Category**
❌ **BAD**: All tests in one file
✅ **GOOD**: Organized by suite
```
suites/
  ├── 01-identification/
  ├── 02-sub-phases/
  └── ...
```

### 5. **Document Test Intent**
```typescript
/**
 * Test: Voice occurs BEFORE battle plans
 * Rule: Voice timing (implementation order)
 * Category: 2.2 Voice Sub-Phase
 */
it('should execute Voice before battle plans', async () => {
  // Test implementation
});
```

---

## Test Execution

### Running Tests

```bash
# Run all battle tests
npm test -- battle

# Run specific suite
npm test -- battle/suites/01-identification

# Run specific test file
npm test -- battle/suites/01-identification/test-basic-detection

# Run with coverage
npm test -- battle --coverage
```

### Test Organization

- Each suite is self-contained
- Each test file focuses on one category
- Fixtures are shared across suites
- Builders are composable
- Assertions are reusable

---

## Success Metrics

1. ✅ **Coverage**: >= 80% code coverage
2. ✅ **Maintainability**: New test can be added in < 10 lines
3. ✅ **Reusability**: No duplicate test setup code
4. ✅ **Clarity**: Test intent is clear from code
5. ✅ **Speed**: All tests run in < 5 minutes

---

## Next Steps

1. Review and approve this plan
2. Create directory structure
3. Implement Phase 1 (Foundation)
4. Implement Phase 2-6 (Test Suites)
5. Run full test suite
6. Generate coverage report
7. Document test patterns

---

## Conclusion

This plan provides a maintainable, DRY approach to implementing the comprehensive battle phase test suite. By building on existing infrastructure and creating reusable components, we ensure:

- ✅ No code duplication
- ✅ Easy test creation
- ✅ Easy test maintenance
- ✅ Clear test organization
- ✅ Comprehensive coverage

