# CHOAM Charity Phase Test Suite

Comprehensive test suite for the CHOAM Charity phase with various scenarios covering standard charity, Bene Gesserit advanced ability, multiple factions, and edge cases.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All agent requests and responses
- All phase events
- State snapshots at key points
- Spice changes for each faction
- Eligibility determination

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct (spice amounts)
- Events are firing in the right order
- Eligibility is determined correctly
- Fraud safeguards work
- Special abilities (BG advanced) work correctly

## Structure

```
phase-tests/choam-charity/
├── README.md                    # This file
├── test-choam-charity.ts        # Main test runner
├── helpers/
│   ├── test-state-builder.ts    # Helper for creating test states
│   └── agent-response-builder.ts # Helper for mocking agent responses
└── scenarios/
    ├── base-scenario.ts         # Base scenario utilities
    ├── standard-zero-spice.ts  # Standard charity with 0 spice
    ├── standard-one-spice.ts   # Standard charity with 1 spice
    ├── bg-advanced-high-spice.ts # BG advanced ability with high spice
    ├── bg-advanced-one-spice.ts # BG advanced ability with 1 spice
    ├── bg-basic-rules.ts       # BG in basic rules
    ├── multiple-factions.ts    # Multiple factions claiming
    ├── mixed-claim-decline.ts  # Some claim, some decline
    ├── fraud-safeguards.ts     # Fraud safeguard testing
    ├── no-eligible-factions.ts # No one eligible
    └── complex-mixed.ts        # Complex mixed scenario
```

## Test Scenarios

### 1. Standard Charity - Zero Spice
- **Factions**: Atreides (0 spice), Harkonnen (5 spice)
- **What to check**: Atreides receives 2 spice, Harkonnen not eligible

### 2. Standard Charity - One Spice
- **Factions**: Fremen (1 spice), Emperor (3 spice)
- **What to check**: Fremen receives 1 spice (bringing to 2), Emperor not eligible

### 3. Bene Gesserit Advanced - High Spice
- **Factions**: BG (5 spice), Atreides (0 spice)
- **Advanced Rules**: true
- **What to check**: BG receives 2 spice (5 → 7), not bringing to 2

### 4. Bene Gesserit Advanced - One Spice
- **Factions**: BG (1 spice)
- **Advanced Rules**: true
- **What to check**: BG receives 2 spice (1 → 3), not bringing to 2

### 5. Bene Gesserit Basic Rules
- **Factions**: BG (1 spice), BG (5 spice)
- **Advanced Rules**: false
- **What to check**: Only BG with 1 spice is eligible

### 6. Multiple Factions Simultaneous
- **Factions**: Atreides (0), Fremen (1), Harkonnen (0), Emperor (4)
- **What to check**: All eligible factions receive correct amounts simultaneously

### 7. Mixed Claim and Decline
- **Factions**: Atreides (0), Fremen (1), Harkonnen (0)
- **What to check**: Some claim, some decline, correct spice amounts

### 8. Fraud Safeguards
- **Factions**: Atreides (0 spice)
- **What to check**: Second claim is rejected

### 9. No Eligible Factions
- **Factions**: All with 2+ spice
- **What to check**: Phase completes immediately, no requests

### 10. Complex Mixed Scenario
- **Factions**: BG (3), Atreides (0), Fremen (1), Harkonnen (5)
- **Advanced Rules**: true
- **What to check**: Complex mix of claims and declines

## Running Tests

```bash
# Run all CHOAM Charity phase tests
pnpm test:choam-charity
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/choam-charity/
├── standard-zero-spice-YYYY-MM-DDTHH-MM-SS.log
├── standard-one-spice-YYYY-MM-DDTHH-MM-SS.log
└── ...
```

Each log file contains:
- **Step-by-step execution**: Every step with eligibility checks
- **Agent Requests**: What each faction was asked to do
- **Agent Responses**: What each faction responded with
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points (spice amounts)
- **Final Summary**: Overview of spice changes

## Reviewing Log Files

When reviewing a log file, check:

1. **Eligibility**: Are factions correctly identified as eligible?
2. **Spice Amounts**: Are the correct amounts received?
3. **Final Totals**: Do final spice totals match expectations?
4. **Events**: Are CHARITY_CLAIMED events logged correctly?
5. **Fraud Safeguards**: Are duplicate claims rejected?
6. **Bene Gesserit**: Does advanced ability work correctly?
7. **State Changes**: Are state mutations correct after each step?

