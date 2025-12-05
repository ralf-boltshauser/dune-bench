# Spice Blow Phase - Test Implementation Plan

## Overview

This plan defines a maintainable, DRY test implementation strategy for the refactored spice-blow phase handler. The goal is to create reusable test infrastructure that minimizes duplication and makes tests easy to write and maintain.

---

## Test Architecture

### Three-Layer Testing Strategy

1. **Unit Tests** - Test individual module functions in isolation
2. **Integration Tests** - Test module interactions and phase flow
3. **Scenario Tests** - Test complete end-to-end scenarios (existing pattern)

---

## Reusable Test Infrastructure

### 1. Enhanced Test State Builder

**Location:** `helpers/test-state-builder.ts` (enhance existing)

**Purpose:** Create game states with specific configurations for testing

**Enhancements:**
- Add fluent builder pattern
- Add preset configurations (common scenarios)
- Add helper methods for common setups
- Add validation helpers

**New Methods:**
```typescript
// Fluent builder
buildTestState()
  .withFactions([...])
  .withTurn(2)
  .withStormSector(5)
  .withSpiceDeckA(['territory-card-1', 'shai-hulud'])
  .withForces([...])
  .build()

// Presets
createTurn1State()
createTurn2State()
createAdvancedRulesState()
createNexusState()
```

### 2. Enhanced Agent Response Builder

**Location:** `helpers/agent-response-builder.ts` (enhance existing)

**Purpose:** Build mock agent responses for different request types

**Enhancements:**
- Add fluent builder pattern
- Add response sequences (for multi-step scenarios)
- Add automatic response matching
- Add response validation

**New Methods:**
```typescript
// Fluent builder
new AgentResponseBuilder()
  .forFremen()
    .protectAlly(true)
    .rideWorm(false)
  .forAtreides()
    .formAlliance(Faction.HARKONNEN)
  .forHarkonnen()
    .formAlliance(Faction.ATREIDES)
  .build()

// Sequences
queueResponseSequence([...])
autoMatchRequests(requests) // Match responses to requests automatically
```

### 3. Assertion Helpers

**Location:** `helpers/assertions.ts` (NEW)

**Purpose:** Reusable assertion functions for common checks

**Structure:**
```typescript
// State assertions
assertSpicePlaced(state, territory, sector, amount)
assertSpiceNotPlaced(state, territory, sector)
assertSpiceDestroyed(state, territory, sector)
assertForcesDevoured(state, faction, territory, sector, count)
assertForcesNotDevoured(state, faction, territory, sector)
assertAllianceFormed(state, faction1, faction2)
assertAllianceBroken(state, faction)
assertNexusTriggered(events)
assertNexusNotTriggered(events)

// Event assertions
assertEventEmitted(events, type, data?)
assertEventNotEmitted(events, type)
assertEventSequence(events, sequence)
assertEventCount(events, type, count)

// Deck assertions
assertCardInDeck(state, deckType, cardId)
assertCardInDiscard(state, deckType, cardId)
assertCardNotInDeck(state, deckType, cardId)
assertDeckSize(state, deckType, size)
assertDiscardSize(state, deckType, size)

// Context assertions
assertContextField(context, field, value)
assertContextFlags(context, flags)
```

### 4. Test Fixtures

**Location:** `helpers/fixtures.ts` (NEW)

**Purpose:** Reusable test data and preset configurations

**Content:**
```typescript
// Card definitions (by name/ID)
export const TEST_CARDS = {
  TERRITORY_ARRAKEEN: 'territory-arrakeen-3',
  TERRITORY_CIELAGO: 'territory-cielago-2',
  SHAI_HULUD: 'shai-hulud',
  // ... more cards
}

// Territory configurations
export const TEST_TERRITORIES = {
  ARRAKEEN: { id: TerritoryId.ARRAKEEN, sectors: [3] },
  CIELAGO_NORTH: { id: TerritoryId.CIELAGO_NORTH, sectors: [0, 1, 2] },
  // ... more territories
}

// Preset deck configurations
export const DECK_PRESETS = {
  SINGLE_TERRITORY: ['territory-arrakeen-3'],
  SINGLE_WORM: ['shai-hulud'],
  TERRITORY_THEN_WORM: ['territory-arrakeen-3', 'shai-hulud'],
  WORM_THEN_TERRITORY: ['shai-hulud', 'territory-arrakeen-3'],
  MULTIPLE_WORMS: ['shai-hulud', 'shai-hulud', 'territory-arrakeen-3'],
  // ... more presets
}

// Preset state configurations
export const STATE_PRESETS = {
  TURN_1_BASIC: { turn: 1, advancedRules: false },
  TURN_2_BASIC: { turn: 2, advancedRules: false },
  TURN_2_ADVANCED: { turn: 2, advancedRules: true },
  STORM_AT_SECTOR_3: { stormSector: 3 },
  // ... more presets
}
```

### 5. Module Test Utilities

**Location:** `helpers/module-test-utils.ts` (NEW)

**Purpose:** Utilities for testing specific modules

**Structure:**
```typescript
// Validation module tests
export const ValidationTestUtils = {
  createStormState(sector: number, territory?: TerritoryId): GameState,
  createProtectedTerritoryState(territory: TerritoryId): GameState,
  assertInStorm(state, sector, territory, expected: boolean),
}

// Placement module tests
export const PlacementTestUtils = {
  createPlacementState(territory, sector, amount): GameState,
  assertPlacementResult(result, expected),
}

// Reveal module tests
export const RevealTestUtils = {
  createRevealState(deckA, deckB): GameState,
  assertRevealResult(result, expectedCard, expectedDeck),
}

// Deck module tests
export const DeckTestUtils = {
  createDeckState(deckA, discardA, deckB, discardB): GameState,
  assertDeckOperation(result, operation, expected),
}

// Shai-Hulud module tests
export const ShaiHuludTestUtils = {
  createWormState(location, forces): GameState,
  assertDevourResult(result, expectedLocation, expectedDevoured),
}

// Nexus module tests
export const NexusTestUtils = {
  createNexusState(factions, alliances?): GameState,
  assertNexusRequest(request, expectedFaction),
  assertAllianceResult(result, expectedAlliances),
}
```

### 6. Test Scenario Builder

**Location:** `helpers/scenario-builder.ts` (NEW)

**Purpose:** Fluent API for building complete test scenarios

**Structure:**
```typescript
export class SpiceBlowScenarioBuilder {
  // State configuration
  withState(config): this
  withDeckA(cards): this
  withDeckB(cards): this
  withForces(forces): this
  withSpice(spice): this
  withAlliances(alliances): this
  
  // Expected outcomes
  expectSpicePlaced(territory, sector, amount): this
  expectSpiceNotPlaced(territory, sector): this
  expectWormDevours(location, factions): this
  expectNexus(): this
  expectAllianceFormed(faction1, faction2): this
  expectEvent(type, data?): this
  
  // Agent responses
  withResponses(builder): this
  
  // Run and assert
  run(): Promise<ScenarioResult>
  assert(): Promise<void>
}
```

---

## Test Organization

### Directory Structure

```
phase-tests/spice-blow/
├── helpers/
│   ├── test-state-builder.ts      # Enhanced state builder
│   ├── agent-response-builder.ts  # Enhanced response builder
│   ├── assertions.ts              # NEW: Assertion helpers
│   ├── fixtures.ts                # NEW: Test fixtures
│   ├── module-test-utils.ts       # NEW: Module-specific utilities
│   └── scenario-builder.ts         # NEW: Fluent scenario builder
├── unit/
│   ├── validation.test.ts         # Validation module unit tests
│   ├── placement.test.ts          # Placement module unit tests
│   ├── reveal.test.ts             # Reveal module unit tests
│   ├── deck.test.ts               # Deck module unit tests
│   ├── shai-hulud.test.ts         # Shai-Hulud module unit tests
│   └── nexus.test.ts              # Nexus module unit tests
├── integration/
│   ├── card-revelation.test.ts     # Card revelation flow
│   ├── spice-placement.test.ts    # Spice placement flow
│   ├── shai-hulud-flow.test.ts    # Shai-Hulud handling flow
│   ├── nexus-flow.test.ts         # Nexus flow
│   └── full-phase.test.ts         # Complete phase flow
├── scenarios/                      # Existing scenario tests (enhanced)
│   ├── base-scenario.ts           # Enhanced base scenario
│   ├── turn-1-multiple-worms.ts
│   ├── multiple-worms-devouring.ts
│   ├── fremen-worm-immunity.ts
│   ├── fremen-ally-protection.ts
│   ├── spice-in-storm.ts
│   ├── nexus-alliance-negotiations.ts
│   └── complex-multi-faction-devouring.ts
└── test-spice-blow-phase.ts        # Main test runner (enhanced)
```

---

## Implementation Strategy

### Phase 1: Foundation (Reusable Infrastructure)

1. **Create Assertion Helpers** (`helpers/assertions.ts`)
   - State assertions
   - Event assertions
   - Deck assertions
   - Context assertions
   - All reusable, no duplication

2. **Create Test Fixtures** (`helpers/fixtures.ts`)
   - Card definitions
   - Territory configurations
   - Deck presets
   - State presets
   - One source of truth for test data

3. **Enhance State Builder** (`helpers/test-state-builder.ts`)
   - Add fluent API
   - Add preset methods
   - Use fixtures for common data
   - Add validation

4. **Enhance Response Builder** (`helpers/agent-response-builder.ts`)
   - Add fluent API
   - Add sequence support
   - Add auto-matching
   - Use fixtures for common responses

### Phase 2: Module Utilities

5. **Create Module Test Utils** (`helpers/module-test-utils.ts`)
   - Utilities for each module
   - Reusable test patterns
   - Module-specific assertions

6. **Create Scenario Builder** (`helpers/scenario-builder.ts`)
   - Fluent API for scenarios
   - Combines state + responses + assertions
   - Reduces boilerplate

### Phase 3: Unit Tests

7. **Write Unit Tests** (`unit/*.test.ts`)
   - Test individual module functions
   - Use module test utils
   - Use fixtures
   - Use assertions
   - Pure functions, easy to test

### Phase 4: Integration Tests

8. **Write Integration Tests** (`integration/*.test.ts`)
   - Test module interactions
   - Use scenario builder
   - Test complete flows
   - Verify state transitions

### Phase 5: Enhance Scenario Tests

9. **Enhance Existing Scenarios** (`scenarios/*.ts`)
   - Use new helpers
   - Use assertions where helpful
   - Keep manual review approach
   - Add more scenarios from test plan

---

## Reusable Patterns

### Pattern 1: State Setup

**Before (Repetitive):**
```typescript
const state = buildTestState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
  turn: 2,
  stormSector: 3,
  spiceDeckA: ['territory-arrakeen-3'],
  // ... lots of config
});
```

**After (Reusable):**
```typescript
const state = SpiceBlowScenarioBuilder
  .create()
  .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
  .withTurn(2)
  .withStormSector(3)
  .withDeckA(DECK_PRESETS.SINGLE_TERRITORY)
  .build();
```

### Pattern 2: Assertions

**Before (Repetitive):**
```typescript
const spice = state.spiceOnBoard.find(s => 
  s.territoryId === TerritoryId.ARRAKEEN && s.sector === 3
);
expect(spice).toBeDefined();
expect(spice?.amount).toBe(3);
```

**After (Reusable):**
```typescript
assertSpicePlaced(state, TerritoryId.ARRAKEEN, 3, 3);
```

### Pattern 3: Event Checks

**Before (Repetitive):**
```typescript
const event = events.find(e => e.type === 'SPICE_PLACED');
expect(event).toBeDefined();
expect(event?.data.territory).toBe(TerritoryId.ARRAKEEN);
expect(event?.data.amount).toBe(3);
```

**After (Reusable):**
```typescript
assertEventEmitted(events, 'SPICE_PLACED', {
  territory: TerritoryId.ARRAKEEN,
  amount: 3
});
```

### Pattern 4: Complete Test

**Before (Repetitive):**
```typescript
// Setup
const state = buildTestState({...});
const responses = new AgentResponseBuilder()...;
const result = await runSpiceBlowScenario(...);

// Assertions (lots of repetitive code)
expect(result.completed).toBe(true);
const spice = result.state.spiceOnBoard.find(...);
expect(spice).toBeDefined();
// ... more assertions
```

**After (Reusable):**
```typescript
const result = await SpiceBlowScenarioBuilder
  .create()
  .withState(STATE_PRESETS.TURN_2_BASIC)
  .withDeckA(DECK_PRESETS.SINGLE_TERRITORY)
  .expectSpicePlaced(TerritoryId.ARRAKEEN, 3, 3)
  .expectEvent('SPICE_PLACED')
  .run();

result.assert(); // All expectations checked
```

---

## Specific Test Implementations

### Unit Tests Structure

Each unit test file follows this pattern:

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationTestUtils, FIXTURES } from '../helpers';

describe('Validation Module', () => {
  describe('isInStorm', () => {
    it('should return true for exact sector match', () => {
      const state = ValidationTestUtils.createStormState(3);
      const result = isInStorm(state, 3);
      expect(result).toBe(true);
    });
    
    // More tests using utils...
  });
});
```

### Integration Tests Structure

```typescript
import { SpiceBlowScenarioBuilder, DECK_PRESETS } from '../helpers';

describe('Card Revelation Flow', () => {
  it('should reveal Territory Card and place spice', async () => {
    const result = await SpiceBlowScenarioBuilder
      .create()
      .withDeckA(DECK_PRESETS.SINGLE_TERRITORY)
      .expectSpicePlaced(TerritoryId.ARRAKEEN, 3, 3)
      .run();
    
    result.assert();
  });
});
```

### Scenario Tests Structure (Enhanced)

```typescript
import { buildTestState, AgentResponseBuilder, assertSpicePlaced } from '../helpers';

export async function testSpicePlacement() {
  const state = buildTestState({
    // Use fixtures and presets
    ...STATE_PRESETS.TURN_2_BASIC,
    spiceDeckA: DECK_PRESETS.SINGLE_TERRITORY,
  });
  
  const result = await runSpiceBlowScenario(
    state,
    new AgentResponseBuilder(),
    'spice-placement'
  );
  
  // Use assertions
  assertSpicePlaced(result.state, TerritoryId.ARRAKEEN, 3, 3);
  assertEventEmitted(result.events, 'SPICE_PLACED');
  
  return result;
}
```

---

## DRY Principles Applied

### 1. Single Source of Truth
- **Fixtures** - All test data in one place
- **Presets** - Common configurations reused
- **Utils** - Common operations in one place

### 2. Fluent APIs
- **Builders** - Chain methods, no repetition
- **Scenario Builder** - Complete test in one chain

### 3. Reusable Assertions
- **Assertion Helpers** - Common checks in one place
- **Module Utils** - Module-specific checks reusable

### 4. Test Patterns
- **Templates** - Standard test structure
- **Helpers** - Common test operations

---

## Test Data Management

### Card Definitions
- Store in `fixtures.ts`
- Reference by name/ID
- Easy to update

### Territory Configurations
- Store in `fixtures.ts`
- Include sector info
- Reusable across tests

### Deck Presets
- Common deck configurations
- Named presets
- Easy to combine

### State Presets
- Common state configurations
- Turn-specific presets
- Rule-specific presets

---

## Benefits

### Maintainability
- ✅ Change test data in one place (fixtures)
- ✅ Update assertions in one place
- ✅ Add new tests easily (use builders)

### Readability
- ✅ Tests read like specifications
- ✅ Fluent APIs are self-documenting
- ✅ Less boilerplate = clearer intent

### Reusability
- ✅ Write once, use everywhere
- ✅ Build on existing helpers
- ✅ Extend easily

### Reliability
- ✅ Consistent test patterns
- ✅ Validated test data
- ✅ Comprehensive assertions

---

## Implementation Checklist

### Foundation
- [ ] Create `helpers/assertions.ts`
- [ ] Create `helpers/fixtures.ts`
- [ ] Enhance `helpers/test-state-builder.ts`
- [ ] Enhance `helpers/agent-response-builder.ts`

### Module Utilities
- [ ] Create `helpers/module-test-utils.ts`
- [ ] Create `helpers/scenario-builder.ts`

### Unit Tests
- [ ] Create `unit/validation.test.ts`
- [ ] Create `unit/placement.test.ts`
- [ ] Create `unit/reveal.test.ts`
- [ ] Create `unit/deck.test.ts`
- [ ] Create `unit/shai-hulud.test.ts`
- [ ] Create `unit/nexus.test.ts`

### Integration Tests
- [ ] Create `integration/card-revelation.test.ts`
- [ ] Create `integration/spice-placement.test.ts`
- [ ] Create `integration/shai-hulud-flow.test.ts`
- [ ] Create `integration/nexus-flow.test.ts`
- [ ] Create `integration/full-phase.test.ts`

### Scenario Tests
- [ ] Enhance existing scenarios with new helpers
- [ ] Add new scenarios from test plan
- [ ] Update test runner

---

## Example: Complete Test Implementation

### Using New Infrastructure

```typescript
// test-spice-placement.ts
import { SpiceBlowScenarioBuilder, DECK_PRESETS, STATE_PRESETS } from './helpers';

describe('Spice Placement', () => {
  it('should place spice on territory not in storm', async () => {
    const result = await SpiceBlowScenarioBuilder
      .create()
      .withState(STATE_PRESETS.TURN_2_BASIC)
      .withStormSector(5) // Storm not at sector 3
      .withDeckA(DECK_PRESETS.SINGLE_TERRITORY)
      .expectSpicePlaced(TerritoryId.ARRAKEEN, 3, 3)
      .expectEvent('SPICE_PLACED', {
        territory: TerritoryId.ARRAKEEN,
        sector: 3,
        amount: 3
      })
      .run();
    
    result.assert();
  });
  
  it('should NOT place spice when in storm', async () => {
    const result = await SpiceBlowScenarioBuilder
      .create()
      .withState(STATE_PRESETS.TURN_2_BASIC)
      .withStormSector(3) // Storm at sector 3
      .withDeckA(DECK_PRESETS.SINGLE_TERRITORY)
      .expectSpiceNotPlaced(TerritoryId.ARRAKEEN, 3)
      .expectEvent('SPICE_CARD_REVEALED', { inStorm: true })
      .run();
    
    result.assert();
  });
});
```

**Benefits:**
- ✅ No duplication
- ✅ Readable
- ✅ Maintainable
- ✅ Reusable
- ✅ Comprehensive

---

## Summary

This plan creates a **maintainable, DRY test infrastructure** that:

1. **Eliminates Duplication** - Reusable helpers, fixtures, and utilities
2. **Improves Readability** - Fluent APIs, clear patterns
3. **Enhances Maintainability** - Single source of truth, easy updates
4. **Supports All Test Types** - Unit, integration, and scenario tests
5. **Follows Best Practices** - DRY, SOLID, clean code principles

The infrastructure is built incrementally, starting with foundations and building up to complete test suites.

