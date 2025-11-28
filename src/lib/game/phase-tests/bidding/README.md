# Bidding Phase Test Suite

Comprehensive test suite for the bidding phase with all 6 factions and various scenarios.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All agent requests and responses
- All phase events
- State snapshots at key points
- Tool calls and their data
- Bidding flow and decisions

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Agent interactions are working as expected
- Edge cases are handled properly
- Faction abilities work correctly
- Karama cards function properly

## Structure

```
phase-tests/bidding/
├── README.md                    # This file
├── test-bidding-phase.ts        # Main test runner
├── helpers/
│   ├── test-state-builder.ts   # Helper for creating test states
│   └── agent-response-builder.ts # Helper for mocking agent responses
├── scenarios/
│   ├── base-scenario.ts        # Base scenario utilities
│   ├── karama-buy-without-paying.ts
│   ├── multiple-factions-bidding-war.ts
│   ├── atreides-prescience.ts
│   ├── emperor-payment.ts
│   ├── harkonnen-top-card.ts
│   ├── bought-in-rule.ts
│   ├── hand-size-changes.ts
│   └── complex-multi-card.ts
```

## Test Scenarios

### 1. Karama Buy Without Paying
- **Factions**: Atreides, Harkonnen, Emperor
- **What to check in logs**: 
  - Karama card usage
  - Card received without payment
  - Spice not deducted
  - Hand size increases correctly

### 2. Multiple Factions Bidding War
- **Factions**: All 6 factions
- **What to check in logs**:
  - Bidding order follows storm order
  - Bids must increase
  - Passing works correctly
  - Winner determination
  - Payment processing

### 3. Atreides Prescience
- **Factions**: Atreides, Harkonnen, Emperor
- **What to check in logs**:
  - Atreides sees card info in requests
  - Other factions don't see card info
  - Atreides makes informed decisions
  - Bidding proceeds normally

### 4. Emperor Payment
- **Factions**: Atreides, Harkonnen, Emperor, Fremen
- **What to check in logs**:
  - Each purchase payment goes to Emperor
  - Emperor's spice increases correctly
  - Fair Market rule enforced
  - Bank spice not increased

### 5. Harkonnen Top Card
- **Factions**: Harkonnen, Atreides, Emperor
- **What to check in logs**:
  - Harkonnen receives purchased card
  - Harkonnen draws free card from deck
  - Hand size increases by 2 per purchase
  - Free card drawn even at 7 cards (goes to 8)
  - Cannot bid if at 8 cards

### 6. Bought-In Rule
- **Factions**: Atreides, Harkonnen, Emperor
- **What to check in logs**:
  - All pass detection works
  - Bought-in rule triggers correctly
  - All remaining cards returned to deck
  - Cards returned in correct order
  - Phase ends immediately

### 7. Hand Size Changes
- **Factions**: Atreides, Harkonnen, Emperor
- **What to check in logs**:
  - Hand size updates after purchase
  - Ineligible factions skipped in bidding
  - Eligibility checked correctly
  - Bidding continues with eligible factions

### 8. Complex Multi-Card
- **Factions**: All 6 factions
- **What to check in logs**:
  - All faction abilities work correctly
  - Starting bidder rotation
  - Eligibility tracking
  - Payment processing
  - Hand size management
  - Complex interactions

## Running Tests

```bash
# Run all bidding phase tests
pnpm test:bidding

# Run specific scenario (if individual scripts added)
pnpm test:bidding:karama
pnpm test:bidding:prescience
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/bidding/
├── karama-buy-without-paying-YYYY-MM-DDTHH-MM-SS.log
├── multiple-factions-bidding-war-YYYY-MM-DDTHH-MM-SS.log
├── atreides-prescience-YYYY-MM-DDTHH-MM-SS.log
├── emperor-payment-YYYY-MM-DDTHH-MM-SS.log
├── harkonnen-top-card-YYYY-MM-DDTHH-MM-SS.log
├── bought-in-rule-YYYY-MM-DDTHH-MM-SS.log
├── hand-size-changes-YYYY-MM-DDTHH-MM-SS.log
└── complex-multi-card-YYYY-MM-DDTHH-MM-SS.log
```

Each log file contains:
- **Step-by-step execution**: Every step with sub-phase information
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Final Summary**: Overview of what happened

## Reviewing Log Files

When reviewing a log file, check:

1. **Hand Size Declarations**: Are all factions declaring correctly?
2. **Card Dealing**: Are correct number of cards dealt?
3. **Auction Flow**: Does bidding proceed in correct order?
4. **Bidding Rules**: Are minimum bids enforced? Can factions bid correctly?
5. **Karama Usage**: Does Karama work correctly (if used)?
6. **Faction Abilities**: 
   - Atreides sees cards?
   - Emperor receives payments?
   - Harkonnen gets free cards?
7. **State Changes**: Are state mutations correct after each step?
8. **Event Ordering**: Do events fire in the correct sequence?
9. **Rule Compliance**: Are game rules being followed?
10. **Edge Cases**: Are special cases handled correctly?

## Key Rules to Validate

- **Hand Size Declaration**: All players must declare before bidding
- **Eligibility**: Players with full hands cannot bid
- **Opening Bid**: Must be 1+ or pass
- **Bid Increases**: Each bid must be higher than previous
- **Bought-In Rule**: If all pass, all remaining cards return to deck
- **Karama Cards**: Can bid over spice limit or buy without paying
- **Atreides Prescience**: Can see cards before bidding
- **Emperor Payment**: Receives payment for all purchases
- **Harkonnen Top Card**: Gets free card after each purchase

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildBiddingTestState` to set up the state
3. Use `AgentResponseBuilder` to mock responses
4. Call `runBiddingScenario()` with a descriptive name
5. Run the test and review the generated log file
6. Manually validate correctness by reading the log

Example:
```typescript
export async function testMyScenario() {
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 15],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses.queueBid(Faction.ATREIDES, 1);
  responses.queueBid(Faction.HARKONNEN, 2);

  return await runBiddingScenario(
    state,
    responses,
    'My Test Scenario'
  );
}
```

