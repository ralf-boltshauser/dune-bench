# Spice Collection Phase - Difficult Scenarios Investigation

## Overview

The Spice Collection phase is **automatic** - no agent decisions are needed. However, there are several complex scenarios and edge cases that need thorough testing.

## Key Mechanics

1. **Automatic Collection**: All factions with forces in sectors containing spice automatically collect
2. **Collection Rate**: 
   - Base: 2 spice per force
   - With city bonus: 3 spice per force (if faction has forces in Arrakeen OR Carthag)
   - City bonus applies to **ALL** collection, not just in those cities
3. **Per-Sector Collection**: Forces in different sectors of the same territory collect separately
4. **Limited by Availability**: Can only collect up to the spice present in that sector
5. **Uncollected Spice**: Remains on the board for future turns

## Difficult Scenarios to Test

### 1. City Bonus Application (Global Effect)
**What makes it difficult**: The city bonus (Arrakeen/Carthag) applies to ALL spice collection, not just in those cities. This means a faction with forces in Arrakeen collects at 3 spice/force everywhere, even in territories far from the city.

**Test scenarios**:
- Faction with forces in Arrakeen collecting from multiple distant territories
- Faction with forces in Carthag collecting from different sectors
- Faction with forces in both cities (should still be 3 spice/force, not higher)
- Faction losing city control mid-phase (shouldn't happen, but verify bonus is checked correctly)

### 2. Multiple Sectors in Same Territory
**What makes it difficult**: Forces in different sectors of the same territory collect separately. This tests per-sector tracking and collection logic.

**Test scenarios**:
- Same faction with forces in multiple sectors of one territory
- Multiple factions in different sectors of same territory
- Spice in one sector but not another
- Large force stacks split across sectors

### 3. Limited Spice Availability
**What makes it difficult**: When forces can collect more spice than is available, collection must be capped at available amount.

**Test scenarios**:
- 10 forces with only 5 spice available (should collect 5, not 20)
- Multiple force stacks competing for limited spice
- Elite forces vs regular forces (both count equally)
- Large force stack with minimal spice

### 4. Multiple Factions Competing
**What makes it difficult**: Multiple factions in the same territory but different sectors, each collecting independently.

**Test scenarios**:
- 3+ factions in same territory, different sectors
- Some factions with city bonus, some without
- Mixed collection rates in same territory
- Factions collecting from same sector (shouldn't happen, but verify)

### 5. Elite vs Regular Forces
**What makes it difficult**: Both elite and regular forces count equally for collection (1 force = 1 force).

**Test scenarios**:
- Mixed elite and regular forces
- All elite forces
- All regular forces
- Elite forces with city bonus

### 6. No Spice Scenarios
**What makes it difficult**: Forces in territories with no spice should not trigger collection events.

**Test scenarios**:
- Forces in territory with 0 spice
- Forces in territory that never had spice
- Mix of territories with and without spice

### 7. Large Scale Collection
**What makes it difficult**: Testing with many force stacks across many territories to ensure all collections happen correctly.

**Test scenarios**:
- All 6 factions with forces in multiple territories
- Maximum force stacks (stress test)
- Complex board state with many spice locations

### 8. Edge Cases
**What makes it difficult**: Boundary conditions and unusual configurations.

**Test scenarios**:
- Single force collecting from large spice pile
- Maximum spice collection (all available)
- Forces in strongholds (Arrakeen, Carthag) collecting their own spice
- Forces in Polar Sink (if applicable)

### 9. Spice in Storm Sector
**What makes it difficult**: Forces on rock territories are protected from storm, so they can survive in storm sectors. If spice is placed in a storm sector (e.g., after storm moves in Spice Blow phase), can those forces collect it?

**Test scenarios**:
- Forces in rock territory (protected) in storm sector with spice
- Forces in sand territory in storm sector (should be destroyed, but test edge case)
- Spice placed after storm moves to that sector

**Implementation note**: Current implementation allows collection in storm sectors. This appears correct per rules - there's no explicit prohibition, and rock territory forces are protected from storm destruction.

## Implementation Notes

- Phase completes immediately in `initialize()` - no `processStep()` needed
- No agent requests should be generated
- All collection happens automatically
- Events should fire for each collection
- State should update correctly (spice added to faction, removed from territory)

