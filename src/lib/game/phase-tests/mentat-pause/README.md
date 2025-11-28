# Mentat Pause Phase Test Suite

Comprehensive test suite for the Mentat Pause phase with all victory conditions and edge cases.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All phase events
- State snapshots at key points
- Victory condition checks
- Bribe collection
- Final game state

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Victory conditions are checked correctly
- Edge cases are handled properly

## Structure

```
phase-tests/mentat-pause/
├── README.md                    # This file
├── test-mentat-pause.ts         # Main test runner
├── helpers/
│   └── test-state-builder.ts   # Helper for creating test states (reuses battle)
├── scenarios/
│   ├── base-scenario.ts        # Base scenario utilities
│   ├── bribe-collection.ts     # Bribe collection tests
│   ├── solo-victory.ts         # Solo stronghold victory tests
│   ├── alliance-victory.ts     # Alliance victory tests
│   ├── contested-strongholds.ts # Contested stronghold tests
│   ├── multiple-winners.ts     # Multiple winners and storm order
│   ├── special-victories.ts    # Fremen, Guild, BG prediction
│   └── endgame-victory.ts      # Endgame default victory
```

## Test Scenarios

### 1. Bribe Collection
- Multiple factions with bribes
- Bribes collected and added to spice
- Bribes reset to 0

### 2. Solo Stronghold Victory
- Unallied player with 3+ strongholds
- Victory achieved

### 3. Alliance Stronghold Victory
- Allied players with 4+ combined strongholds
- Both allies win together

### 4. Contested Strongholds
- Multiple non-allied factions in same stronghold
- No one controls contested strongholds
- Victory prevented

### 5. Multiple Winners
- Multiple factions meet victory conditions
- Storm order resolution

### 6. Special Victories
- Fremen special victory (endgame, Guild in game)
- Guild special victory (endgame, no other winner)
- Bene Gesserit prediction victory

### 7. Endgame Default Victory
- Most strongholds wins
- Spice tiebreaker
- Storm order tiebreaker

## Running Tests

```bash
# Run all mentat pause phase tests
pnpm test:mentat-pause
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/mentat-pause/
├── bribe-collection-YYYY-MM-DDTHH-MM-SS.log
├── solo-victory-3-strongholds-YYYY-MM-DDTHH-MM-SS.log
└── ...
```

Each log file contains:
- **Step-by-step execution**: Every step with events
- **Events**: All phase events with full data
- **State Snapshots**: Complete game state at key points
- **Victory Results**: Winner determination and reasoning
- **Final Summary**: Overview of what happened

## Reviewing Log Files

When reviewing a log file, check:

1. **Bribe Collection**: Are bribes collected correctly?
2. **Victory Checks**: Are victory conditions checked in the right order?
3. **Stronghold Control**: Is control calculated correctly (sole control)?
4. **Alliance Grouping**: Are alliances grouped correctly?
5. **Storm Order**: Is storm order used correctly for tiebreakers?
6. **Special Victories**: Are special conditions checked correctly?
7. **Endgame Logic**: Is endgame victory logic correct?

