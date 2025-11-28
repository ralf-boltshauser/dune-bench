# Storm Separation Battle Rule Implementation

## Overview
Implemented the storm separation rule for battles: Forces in different sectors of the same territory cannot battle if they are separated by the storm sector.

## Rule Reference
From `handwritten-rules/battle.md`:
- Line 4: "Players can not battle one another in a Territory if their Forces are separated by a Sector in storm."
- Line 5: "BATTLING BLIND: Whenever two or more players' Forces are in the same Territory and in the same Sector under storm players still battle."

## Changes Made

### 1. Added `areSectorsSeparatedByStorm` Helper Function
**File**: `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/queries.ts`

Added a new query function to determine if two sectors are separated by storm:

```typescript
/**
 * Check if two sectors in the same territory are separated by the storm sector.
 * Returns true if forces cannot battle due to storm separation.
 *
 * Rules:
 * - Forces in the SAME sector can always battle (even if that sector is in storm)
 * - Forces in DIFFERENT sectors cannot battle if the storm sector is between them
 */
export function areSectorsSeparatedByStorm(
  state: GameState,
  sector1: number,
  sector2: number
): boolean
```

**Logic**:
- If sectors are the same, return `false` (can always battle)
- Calculate shortest path between sectors (considering circular layout 0-17)
- Check if storm is in the shortest path between the two sectors
- Returns `true` if storm blocks the path

### 2. Export Function from State Module
**File**: `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/index.ts`

Added export:
```typescript
export {
  // ... other exports
  areSectorsSeparatedByStorm,
  // ... other exports
} from './queries';
```

### 3. Updated Battle Identification Logic
**File**: `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts`

#### Import Added:
```typescript
import {
  // ... other imports
  areSectorsSeparatedByStorm,
} from '../../state';
```

#### Modified `identifyBattles` Method:
The method now:
1. Groups forces by territory AND sector
2. For each territory with multiple factions, checks all pairs of sectors
3. Determines if forces in different sectors can battle (not separated by storm)
4. Creates battle groups only for forces that can actually engage

**Key Algorithm**:
```typescript
for (let i = 0; i < sectors.length; i++) {
  for (let j = i; j < sectors.length; j++) {
    const sector1 = sectors[i];
    const sector2 = sectors[j];

    // Check if these sectors can battle
    const canBattle = sector1 === sector2 ||
      !areSectorsSeparatedByStorm(state, sector1, sector2);

    if (canBattle) {
      // Combine factions from both sectors into battle group
      // ...
    }
  }
}
```

## Behavior Examples

### Example 1: Same Sector (Even in Storm)
- Storm at sector 5
- Faction A at territory X, sector 5
- Faction B at territory X, sector 5
- **Result**: Battle occurs (same sector rule)

### Example 2: Adjacent Sectors, No Storm Between
- Storm at sector 10
- Faction A at territory X, sector 5
- Faction B at territory X, sector 6
- **Result**: Battle occurs (storm not between them)

### Example 3: Storm Separates Forces
- Storm at sector 5
- Faction A at territory X, sector 4
- Faction B at territory X, sector 6
- **Result**: NO battle (storm at sector 5 separates them)

### Example 4: Circular Wrap-Around
- Storm at sector 0
- Faction A at territory X, sector 17
- Faction B at territory X, sector 1
- **Result**: NO battle (storm at 0 is between 17 and 1 on the circle)

## Testing Recommendations

To test this implementation:

1. **Create a test scenario** with forces in different sectors of the same territory
2. **Position the storm** between the sectors
3. **Verify** that no battle is identified for separated forces
4. **Test edge cases**:
   - Same sector with storm
   - Wrap-around sectors (17 and 0, 1)
   - Multiple factions in multiple sectors

## Notes

- The implementation assumes sectors are numbered 0-17 in a circular arrangement
- The algorithm finds the shortest path between sectors (considering wrap-around)
- Storm only blocks if it's in the shortest path
- This preserves the "battling blind" rule for same-sector combat in storm
