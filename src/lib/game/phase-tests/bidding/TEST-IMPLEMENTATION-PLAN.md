# Bidding Phase - Test Implementation Plan

## Overview

This plan defines a maintainable, DRY test implementation strategy for the refactored bidding phase handler. The goal is to create reusable test infrastructure that minimizes duplication and makes tests easy to write and maintain.

---

## Test Architecture

### Three-Layer Testing Strategy

1. **Unit Tests** - Test individual module functions in isolation
2. **Integration Tests** - Test module interactions and phase flow
3. **Scenario Tests** - Test complete end-to-end scenarios (existing pattern, enhanced)

---

## Reusable Test Infrastructure

### 1. Enhanced Test State Builder

**Location:** `helpers/test-state-builder.ts` (enhance existing)

**Current State:** Basic builder exists with `buildBiddingTestState()`

**Enhancements:**
- Add fluent builder pattern
- Add preset configurations (common scenarios)
- Add helper methods for common setups
- Add validation helpers
- Add Harkonnen-specific helpers (8-card hand)

**New Methods:**
```typescript
// Fluent builder
buildBiddingTestState()
  .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
  .withTurn(2)
  .withSpice(Faction.ATREIDES, 15)
  .withHandSize(Faction.ATREIDES, 2) // Add 2 cards
  .withHandSize(Faction.HARKONNEN, 6) // Harkonnen with 6 cards
  .withFullHand(Faction.EMPEROR) // Set to max (4 or 8)
  .withTreacheryDeck(cardIds)
  .withKaramaInHand(Faction.ATREIDES)
  .build()

// Presets
createBasicBiddingState() // 3 factions, empty hands, default spice
createHarkonnenBiddingState() // Includes Harkonnen with various hand sizes
createFullHandState() // All factions at max hand size
createKaramaTestState() // Faction with Karama card
createEmperorTestState() // Includes Emperor for payment testing
createAtreidesTestState() // Includes Atreides for prescience testing
```

**Key Features:**
- One method to set hand size (automatically handles Harkonnen's 8 vs others' 4)
- One method to add specific cards
- One method to set spice amounts
- Presets for common scenarios

---

### 2. Enhanced Agent Response Builder

**Location:** `helpers/agent-response-builder.ts` (enhance existing)

**Current State:** Basic builder exists with `queueBid()`, `queuePass()`, etc.

**Enhancements:**
- Add fluent builder pattern
- Add response sequences (for multi-auction scenarios)
- Add automatic response matching to requests
- Add response validation
- Add Atreides peek acknowledgment helper

**New Methods:**
```typescript
// Fluent builder
new AgentResponseBuilder()
  .forAuction(1) // First auction
    .atreidesPeek() // Acknowledge peek
    .bid(Faction.ATREIDES, 1)
    .bid(Faction.HARKONNEN, 2)
    .pass(Faction.EMPEROR)
  .forAuction(2) // Second auction
    .bid(Faction.HARKONNEN, 1)
    .pass(Faction.ATREIDES)
    .pass(Faction.EMPEROR)
  .build()

// Sequences
queueBiddingWar(factions, startBid, endBid) // Auto-generate bidding sequence
queueAllPass(factions) // All pass (BOUGHT-IN scenario)
queueSingleWinner(faction, bidAmount) // One bid, all others pass

// Karama helpers
queueKaramaFreeCard(faction, karamaCardId)
queueKaramaBidOverSpice(faction, karamaCardId, bidAmount)

// Auto-matching
matchRequests(requests: AgentRequest[]): AgentResponse[] // Match responses to requests
```

**Key Features:**
- Organize responses by auction number
- Auto-generate common sequences
- Match responses to requests automatically
- Validate response structure

---

### 3. Assertion Helpers (NEW)

**Location:** `helpers/assertions.ts` (NEW)

**Purpose:** Reusable assertions for state, events, and context validation

**Structure:**
```typescript
// State assertions
export function assertSpice(state, faction, expectedAmount)
export function assertHandSize(state, faction, expectedSize)
export function assertHandContains(state, faction, cardId)
export function assertHandNotContains(state, faction, cardId)
export function assertDeckSize(state, expectedSize)
export function assertDeckContains(state, cardId)
export function assertCardInHand(state, faction, cardId, expectedLocation)

// Event assertions
export function assertEventEmitted(events, eventType, data?)
export function assertEventNotEmitted(events, eventType)
export function assertEventCount(events, eventType, expectedCount)
export function assertEventOrder(events, eventTypes) // Check event sequence
export function assertEventData(events, eventType, dataMatcher)

// Context assertions
export function assertAuctionState(context, expectedState)
export function assertCurrentBid(context, expectedBid)
export function assertHighBidder(context, expectedFaction)
export function assertPassedFactions(context, expectedFactions)
export function assertCurrentCardIndex(context, expectedIndex)

// Phase result assertions
export function assertPhaseComplete(result, expected)
export function assertNextPhase(result, expectedPhase)
export function assertPendingRequests(result, expectedRequests)
export function assertNoPendingRequests(result)

// Combined assertions
export function assertAuctionResolved(state, context, winner, amount)
export function assertCardPurchased(state, faction, cardId, amount)
export function assertEmperorReceivedPayment(state, amount)
export function assertHarkonnenDrewFreeCard(state, events)
```

**Key Features:**
- Single source of truth for assertions
- Descriptive error messages
- Reusable across all test types
- Type-safe

---

### 4. Test Fixtures (NEW)

**Location:** `helpers/fixtures.ts` (NEW)

**Purpose:** One source of truth for test data

**Structure:**
```typescript
// Card fixtures
export const TREACHERY_CARDS = {
  KARAMA: 'karama_1',
  WORTHLESS: ['baliset', 'jubba_cloak', 'kulon'],
  WEAPON: ['lasgun', 'maula_pistol'],
  DEFENSE: ['shield', 'snooper'],
  // ... more cards
}

// Faction configurations
export const FACTION_PRESETS = {
  ATREIDES: { spice: 10, handSize: 0 },
  HARKONNEN: { spice: 10, handSize: 0, maxHand: 8 },
  EMPEROR: { spice: 10, handSize: 0 },
  // ... all factions
}

// Test scenarios
export const SCENARIO_PRESETS = {
  BASIC_3_FACTIONS: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  ALL_6_FACTIONS: [/* all 6 */],
  WITH_EMPEROR: [/* includes Emperor */],
  WITH_ATREIDES: [/* includes Atreides */],
  WITH_HARKONNEN: [/* includes Harkonnen */],
}

// Hand size configurations
export const HAND_SIZE_PRESETS = {
  EMPTY: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  FULL: 4, // For most factions
  HARKONNEN_FULL: 8,
  HARKONNEN_HIGH: 7,
  HARKONNEN_MEDIUM: 4,
}
```

**Key Features:**
- One place to update test data
- Consistent across all tests
- Easy to extend

---

### 5. Module Test Utilities (NEW)

**Location:** `helpers/module-test-utils.ts` (NEW)

**Purpose:** Utilities specific to testing each module

**Structure:**
```typescript
// Initialization module utilities
export function createInitializationTestContext()
export function assertHandSizeDeclarations(events, expectedDeclarations)
export function assertCardsDealt(state, context, expectedCount)
export function assertEligibilityDetermined(declarations, expectedEligible)

// Auction module utilities
export function createAuctionTestContext(cardIndex, startingBidder)
export function assertAuctionStarted(events, cardIndex, startingBidder)
export function assertEligibilityChecked(state, context, expectedEligible)
export function assertStartingBidderDetermined(context, expectedBidder, previousOpener?)
export function assertAtreidesPeekRequest(requests, cardId, auctionNumber)

// Bid processing module utilities
export function createBidProcessingTestContext()
export function assertBidRequestCreated(requests, faction, expectedPrompt)
export function assertBOUGHT_INDetected(context, events)
export function assertNextBidderFound(context, biddingOrder, expectedBidder)
export function assertAutoSkipOccurred(events, faction, reason)
export function assertKaramaFreeCardTriggered(context, events, faction)

// Resolution module utilities
export function createResolutionTestContext(highBidder, currentBid)
export function assertPaymentProcessed(state, winner, amount, toEmperor?)
export function assertCardDistributed(state, winner, cardId)
export function assertHarkonnenTopCard(state, events)
export function assertKaramaFlagsCleared(state, faction)
export function assertCardReturnedToDeck(context, cardId)

// Emperor module utilities
export function assertEmperorPayment(state, amount, fromFaction)
export function assertNoEmperorPayment(state, amount) // When Emperor not in game
export function assertEmperorSelfPurchase(state, amount) // Emperor buys own card

// Helpers module utilities
export function assertCanBid(state, faction, context, expected)
export function assertRemainingCards(context, expectedCards)
export function assertCardsShuffled(state, originalDeck, addedCards)
export function assertPhaseEnded(result, nextPhase)
```

**Key Features:**
- Module-specific test helpers
- Reusable patterns for each module
- Makes unit tests easier to write

---

### 6. Unit Test Runner (NEW)

**Location:** `helpers/unit-test-runner.ts` (NEW)

**Purpose:** Utilities for running unit tests on module functions

**Structure:**
```typescript
// Test a module function with given inputs
export function testModuleFunction(
  moduleFunction: Function,
  testCases: Array<{
    name: string,
    inputs: any[],
    expected: any,
    assertions?: (result: any) => void
  }>
)

// Test with state mutations
export function testStateMutation(
  function: (state: GameState, ...args) => GameState,
  initialState: GameState,
  testCases: Array<{
    name: string,
    inputs: any[],
    assertState: (state: GameState) => void
  }>
)

// Test event emission
export function testEventEmission(
  function: (...args) => { state: GameState, events: PhaseEvent[] },
  testCases: Array<{
    name: string,
    inputs: any[],
    expectedEvents: PhaseEvent[]
  }>
)
```

---

### 7. Integration Test Utilities (NEW)

**Location:** `helpers/integration-test-utils.ts` (NEW)

**Purpose:** Utilities for testing module interactions

**Structure:**
```typescript
// Test phase flow
export function testPhaseFlow(
  initialState: GameState,
  responses: AgentResponse[],
  assertions: (finalState: GameState, events: PhaseEvent[], context: BiddingContextWithCards) => void
)

// Test auction cycle
export function testAuctionCycle(
  state: GameState,
  context: BiddingContextWithCards,
  biddingOrder: Faction[],
  responses: AgentResponse[],
  assertions: (result: PhaseStepResult) => void
)

// Test multiple auctions
export function testMultipleAuctions(
  state: GameState,
  auctionConfigs: Array<{
    responses: AgentResponse[],
    assertions: (state: GameState, events: PhaseEvent[]) => void
  }>
)
```

---

## Test Organization

### Directory Structure

```
phase-tests/bidding/
├── helpers/
│   ├── test-state-builder.ts      # Enhanced state builder
│   ├── agent-response-builder.ts  # Enhanced response builder
│   ├── assertions.ts              # NEW: Assertion helpers
│   ├── fixtures.ts                # NEW: Test fixtures
│   ├── module-test-utils.ts       # NEW: Module-specific utilities
│   ├── unit-test-runner.ts        # NEW: Unit test utilities
│   └── integration-test-utils.ts  # NEW: Integration test utilities
├── unit/                          # NEW: Unit tests
│   ├── initialization.test.ts     # Initialization module tests
│   ├── auction.test.ts            # Auction module tests
│   ├── bid-processing.test.ts     # Bid processing module tests
│   ├── resolution.test.ts         # Resolution module tests
│   ├── emperor.test.ts            # Emperor module tests
│   └── helpers.test.ts            # Helpers module tests
├── integration/                   # NEW: Integration tests
│   ├── phase-flow.test.ts         # Complete phase flow
│   ├── auction-cycle.test.ts      # Single auction cycle
│   ├── multiple-auctions.test.ts  # Multiple auctions
│   ├── atreides-peek-flow.test.ts # Atreides prescience flow
│   ├── karama-flow.test.ts        # Karama card flows
│   └── emperor-payment-flow.test.ts # Emperor payment flow
├── scenarios/                     # Existing scenario tests (enhanced)
│   ├── base-scenario.ts           # Enhanced base scenario
│   ├── karama-buy-without-paying.ts
│   ├── multiple-factions-bidding-war.ts
│   ├── atreides-prescience.ts
│   ├── emperor-payment.ts
│   ├── harkonnen-top-card.ts
│   ├── bought-in-rule.ts
│   ├── hand-size-changes.ts
│   └── complex-multi-card.ts
├── test-bidding-phase.ts          # Main test runner (enhanced)
├── TEST-PLAN.md                   # Test plan (existing)
└── TEST-IMPLEMENTATION-PLAN.md    # This file
```

---

## Implementation Strategy

### Phase 1: Foundation (Reusable Infrastructure)

**Priority: HIGH - Do this first, everything else depends on it**

1. **Create Assertion Helpers** (`helpers/assertions.ts`)
   - State assertions (spice, hand size, cards, deck)
   - Event assertions (type, data, order, count)
   - Context assertions (auction state, bids, passed factions)
   - Phase result assertions
   - Combined assertions
   - **Why first:** All tests will use these, so they must be solid

2. **Create Test Fixtures** (`helpers/fixtures.ts`)
   - Card definitions
   - Faction presets
   - Scenario presets
   - Hand size presets
   - **Why second:** State builders and tests will use these

3. **Enhance State Builder** (`helpers/test-state-builder.ts`)
   - Add fluent API
   - Add preset methods
   - Use fixtures for common data
   - Add Harkonnen-specific helpers
   - Add validation
   - **Why third:** Needed for all tests

4. **Enhance Response Builder** (`helpers/agent-response-builder.ts`)
   - Add fluent API
   - Add sequence support
   - Add auto-matching
   - Add auction organization
   - Use fixtures for common responses
   - **Why fourth:** Needed for integration and scenario tests

### Phase 2: Module Utilities

5. **Create Module Test Utils** (`helpers/module-test-utils.ts`)
   - Utilities for each module
   - Reusable test patterns
   - Module-specific assertions
   - **Why fifth:** Needed for unit tests

6. **Create Unit Test Runner** (`helpers/unit-test-runner.ts`)
   - Utilities for running unit tests
   - Test function patterns
   - **Why sixth:** Makes unit tests easier to write

7. **Create Integration Test Utils** (`helpers/integration-test-utils.ts`)
   - Phase flow testing
   - Auction cycle testing
   - **Why seventh:** Needed for integration tests

### Phase 3: Unit Tests

8. **Write Unit Tests** (`unit/*.test.ts`)
   - Test individual module functions
   - Use module test utils
   - Use fixtures
   - Use assertions
   - Pure functions, easy to test
   - **Coverage:** All functions in each module

**Test Files:**
- `unit/initialization.test.ts` - Hand size declarations, card dealing, context init
- `unit/auction.test.ts` - Auction start, eligibility, starting bidder, Atreides peek
- `unit/bid-processing.test.ts` - Bid requests, BOUGHT-IN, next bidder, auto-skip, Karama, bid processing
- `unit/resolution.test.ts` - Payment, card distribution, Harkonnen TOP CARD, no bidder
- `unit/emperor.test.ts` - Payment to Emperor, refunds
- `unit/helpers.test.ts` - canBid, getRemainingAuctionCards, returnCardsToDeckAndShuffle, endBiddingPhase, handleBoughtIn

### Phase 4: Integration Tests

9. **Write Integration Tests** (`integration/*.test.ts`)
   - Test module interactions
   - Test phase flow
   - Test auction cycles
   - Use integration test utils
   - **Coverage:** All module interaction patterns

**Test Files:**
- `integration/phase-flow.test.ts` - Complete phase: initialize → auction → bidding → resolution
- `integration/auction-cycle.test.ts` - Single auction: start → bid → resolve
- `integration/multiple-auctions.test.ts` - Multiple auctions in sequence
- `integration/atreides-peek-flow.test.ts` - Atreides peek → acknowledgment → bidding
- `integration/karama-flow.test.ts` - Karama free card and bid over spice flows
- `integration/emperor-payment-flow.test.ts` - Payment to Emperor flow

### Phase 5: Enhance Scenario Tests

10. **Enhance Existing Scenario Tests** (`scenarios/*.ts`)
    - Use new assertion helpers
    - Use enhanced state builder
    - Use enhanced response builder
    - Add automated assertions (in addition to log files)
    - **Coverage:** All existing scenarios enhanced

---

## Test Writing Patterns

### Unit Test Pattern

```typescript
import { describe, it, expect } from 'vitest'; // or your test framework
import { assertSpice, assertHandSize, assertEventEmitted } from '../helpers/assertions';
import { createInitializationTestContext } from '../helpers/module-test-utils';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { initializeBiddingPhase } from '../../../phases/handlers/bidding/initialization';

describe('Initialization Module', () => {
  describe('initializeBiddingPhase', () => {
    it('should declare hand sizes correctly', () => {
      const state = buildBiddingTestState()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withHandSize(Faction.ATREIDES, 2)
        .withHandSize(Faction.HARKONNEN, 0)
        .build();
      
      const context = createInitializationTestContext();
      const result = initializeBiddingPhase(context, state, state.stormOrder);
      
      assertEventEmitted(result.result.events, 'HAND_SIZE_DECLARED');
      // More assertions...
    });
  });
});
```

### Integration Test Pattern

```typescript
import { testAuctionCycle } from '../helpers/integration-test-utils';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { new AgentResponseBuilder } from '../helpers/agent-response-builder';

describe('Auction Cycle', () => {
  it('should complete a full auction cycle', () => {
    const state = buildBiddingTestState()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .build();
    
    const responses = new AgentResponseBuilder()
      .forAuction(1)
        .bid(Faction.ATREIDES, 1)
        .bid(Faction.HARKONNEN, 2)
        .pass(Faction.ATREIDES)
      .build();
    
    testAuctionCycle(state, context, biddingOrder, responses, (result) => {
      assertSpice(result.state, Faction.HARKONNEN, 8); // Paid 2
      assertHandSize(result.state, Faction.HARKONNEN, 1); // Got card
      assertEventEmitted(result.events, 'CARD_WON');
    });
  });
});
```

### Scenario Test Pattern (Enhanced)

```typescript
import { runBiddingScenario, logScenarioResults } from './base-scenario';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { assertSpice, assertHandSize, assertEventEmitted } from '../helpers/assertions';

export async function testEmperorPayment() {
  const state = buildBiddingTestState()
    .withFactions([Faction.ATREIDES, Faction.EMPEROR])
    .withSpice(Faction.ATREIDES, 15)
    .withSpice(Faction.EMPEROR, 10)
    .build();
  
  const result = await runBiddingScenario(state, 'emperor-payment');
  
  // Automated assertions (NEW)
  assertSpice(result.state, Faction.ATREIDES, 10); // Paid 5
  assertSpice(result.state, Faction.EMPEROR, 15); // Received 5
  assertEventEmitted(result.events, 'CARD_WON');
  
  // Manual validation via logs (existing)
  logScenarioResults('Emperor Payment', result);
  return result;
}
```

---

## Key Principles

### DRY (Don't Repeat Yourself)

- **One place for assertions** - `helpers/assertions.ts`
- **One place for test data** - `helpers/fixtures.ts`
- **One place for state building** - Enhanced `test-state-builder.ts`
- **One place for response building** - Enhanced `agent-response-builder.ts`
- **Reusable module utilities** - `module-test-utils.ts`

### Maintainability

- **Clear organization** - Unit, integration, scenario tests separated
- **Descriptive names** - Test names explain what they test
- **Helper functions** - Complex logic in helpers, not tests
- **Type safety** - TypeScript for all test code
- **Documentation** - Comments for complex test logic

### Testability

- **Pure functions** - Module functions are easy to test
- **Isolated tests** - Each test is independent
- **Fast tests** - Unit tests run quickly
- **Deterministic** - Tests produce same results every time

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `helpers/assertions.ts` with all assertion helpers
- [ ] Create `helpers/fixtures.ts` with all test fixtures
- [ ] Enhance `helpers/test-state-builder.ts` with fluent API and presets
- [ ] Enhance `helpers/agent-response-builder.ts` with fluent API and sequences

### Phase 2: Module Utilities
- [ ] Create `helpers/module-test-utils.ts` with module-specific utilities
- [ ] Create `helpers/unit-test-runner.ts` with unit test utilities
- [ ] Create `helpers/integration-test-utils.ts` with integration test utilities

### Phase 3: Unit Tests
- [ ] Write `unit/initialization.test.ts`
- [ ] Write `unit/auction.test.ts`
- [ ] Write `unit/bid-processing.test.ts`
- [ ] Write `unit/resolution.test.ts`
- [ ] Write `unit/emperor.test.ts`
- [ ] Write `unit/helpers.test.ts`

### Phase 4: Integration Tests
- [ ] Write `integration/phase-flow.test.ts`
- [ ] Write `integration/auction-cycle.test.ts`
- [ ] Write `integration/multiple-auctions.test.ts`
- [ ] Write `integration/atreides-peek-flow.test.ts`
- [ ] Write `integration/karama-flow.test.ts`
- [ ] Write `integration/emperor-payment-flow.test.ts`

### Phase 5: Enhance Scenarios
- [ ] Enhance all existing scenario tests with assertions
- [ ] Verify all scenarios still pass
- [ ] Add any missing scenario tests from test plan

---

## Success Criteria

✅ All module functions have unit tests
✅ All module interactions have integration tests
✅ All scenarios from test plan are covered
✅ All tests use reusable infrastructure (no duplication)
✅ Tests are easy to write and maintain
✅ Tests run fast (unit tests < 1s each)
✅ Tests are deterministic and reliable
✅ Test coverage > 90% for all modules

---

## Next Steps

1. Start with Phase 1 (Foundation) - Build the reusable infrastructure
2. Then Phase 2 (Module Utilities) - Build module-specific helpers
3. Then Phase 3 (Unit Tests) - Write unit tests using the infrastructure
4. Then Phase 4 (Integration Tests) - Write integration tests
5. Finally Phase 5 (Enhance Scenarios) - Enhance existing scenarios

**Remember:** Do it once, do it right! Build the infrastructure first, then write tests using it.

