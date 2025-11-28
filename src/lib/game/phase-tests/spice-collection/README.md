# Spice Collection Phase Test Suite

Comprehensive test suite for the spice collection phase with all 6 factions and various scenarios.

## Philosophy: Manual Validation via Log Files

**The goal of these tests is NOT automated assertions.** Instead, tests write detailed log files containing:
- All phase events
- State snapshots before and after collection
- Spice changes per faction
- Collection calculations (forces × rate)
- Territory spice remaining

You then **manually review these log files** to validate that:
- Rules are being followed correctly
- State changes are correct
- Events are firing in the right order
- Collection rates are correct (base vs city bonus)
- Per-sector collection works correctly
- Limited spice scenarios are handled properly

## Key Mechanics Tested

1. **Automatic Collection**: Phase completes immediately, no agent decisions needed
2. **Collection Rate**: 
   - Base: 2 spice per force
   - With city bonus: 3 spice per force (if faction has forces in Arrakeen OR Carthag)
   - City bonus applies to **ALL** collection, not just in those cities
3. **Per-Sector Collection**: Forces in different sectors of the same territory collect separately
4. **Limited by Availability**: Can only collect up to the spice present in that sector
5. **Elite vs Regular**: Both count equally (1 force = 1 force)

## Structure

```
phase-tests/spice-collection/
├── README.md                    # This file
├── test-spice-collection.ts     # Main test runner
├── helpers/
│   └── agent-response-builder.ts # Placeholder (not needed for automatic phase)
└── scenarios/
    ├── base-scenario.ts         # Base scenario runner
    ├── city-bonus-global.ts     # City bonus global application
    ├── multiple-sectors.ts      # Multiple sectors same territory
    ├── limited-spice.ts         # Limited spice availability
    ├── multiple-factions.ts     # Multiple factions competing
    ├── elite-vs-regular.ts      # Elite vs regular forces
    ├── no-spice.ts              # No spice scenarios
    ├── large-scale.ts           # Large scale stress test
    └── city-stronghold-collection.ts # Collection from Arrakeen/Carthag
```

## Test Scenarios

### 1. City Bonus Global Application
- **Goal**: Verify city bonus applies to ALL collection, not just in cities
- **Setup**: Atreides with forces in Arrakeen (gives bonus) collecting from Hagga Basin
- **Expected**: Atreides collects at 3 spice/force from Hagga Basin (city bonus applies globally)

### 2. Multiple Sectors Same Territory
- **Goal**: Test per-sector collection within the same territory
- **Setup**: Fremen with forces in multiple sectors of Rock Outcroppings
- **Expected**: Each sector collects separately

### 3. Limited Spice Availability
- **Goal**: Verify collection is capped at available spice
- **Setup**: Large force stacks with limited spice available
- **Expected**: Collection limited to available spice, not force count × rate

### 4. Multiple Factions Competing
- **Goal**: Test multiple factions collecting from same territory but different sectors
- **Setup**: 4 factions in Rock Outcroppings, different sectors, mix of city bonus and no bonus
- **Expected**: Each faction collects independently at correct rates

### 5. Elite vs Regular Forces
- **Goal**: Verify elite and regular forces count equally
- **Setup**: Mixed elite/regular forces, all elite forces
- **Expected**: Both types count as 1 force each

### 6. No Spice Scenarios
- **Goal**: Verify no collection events fire when no spice available
- **Setup**: Forces in territories with 0 spice
- **Expected**: No collection events for territories with 0 spice

### 7. Large Scale Collection
- **Goal**: Stress test with all factions and multiple territories
- **Setup**: All 6 factions with forces across multiple territories
- **Expected**: All collections happen correctly, all events fire

### 8. City Stronghold Collection
- **Goal**: Test collection from Arrakeen and Carthag themselves
- **Setup**: Forces in Arrakeen and Carthag with spice
- **Expected**: Collection at 3 spice/force (city bonus applies)

## Running Tests

```bash
# Run all spice collection phase tests
pnpm test:spice-collection
```

## Log Files

After running tests, detailed log files are written to:
```
test-logs/spice-collection/
├── city-bonus-global-YYYY-MM-DDTHH-MM-SS.log
├── multiple-sectors-YYYY-MM-DDTHH-MM-SS.log
├── limited-spice-YYYY-MM-DDTHH-MM-SS.log
├── multiple-factions-YYYY-MM-DDTHH-MM-SS.log
├── elite-vs-regular-YYYY-MM-DDTHH-MM-SS.log
├── no-spice-YYYY-MM-DDTHH-MM-SS.log
├── large-scale-YYYY-MM-DDTHH-MM-SS.log
└── city-stronghold-collection-YYYY-MM-DDTHH-MM-SS.log
```

Each log file contains:
- **Initial State**: Complete game state before collection
- **Initial Spice**: Spice on board and faction spice before collection
- **Collection Events**: All SPICE_COLLECTED events with details
- **Final State**: Complete game state after collection
- **Final Spice**: Spice on board and faction spice after collection
- **Spice Changes**: Delta calculations per faction

## Reviewing Log Files

When reviewing a log file, check:

1. **Collection Rate**: Is the rate correct (2 or 3 spice/force)?
2. **City Bonus**: Does city bonus apply globally (not just in cities)?
3. **Per-Sector**: Do different sectors collect separately?
4. **Limited Spice**: Is collection capped at available spice?
5. **State Updates**: Are faction spice and territory spice updated correctly?
6. **Events**: Do all expected collection events fire?
7. **No Collection**: Are territories with 0 spice skipped correctly?

## Adding New Tests

1. Create a new scenario file in `scenarios/`
2. Use `buildTestState()` to set up the state
3. Call `runSpiceCollectionScenario()` with a descriptive name
4. Run the test and review the generated log file
5. Manually validate correctness by reading the log

Example:
```typescript
export async function testMyScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    forces: [
      { faction: Faction.ATREIDES, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 5 },
    ],
    territorySpice: [
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 15 },
    ],
  });

  return await runSpiceCollectionScenario(state, 'my-scenario');
}
```

## What Gets Logged

- **Initial State**: Complete game state with forces, spice, territories
- **Initial Spice**: Spice on board locations and faction spice amounts
- **Collection Events**: All SPICE_COLLECTED events with faction, territory, sector, amount, forces, rate
- **Final State**: Complete game state after collection
- **Final Spice**: Spice on board locations and faction spice amounts
- **Spice Changes**: Delta calculations showing how much each faction collected

