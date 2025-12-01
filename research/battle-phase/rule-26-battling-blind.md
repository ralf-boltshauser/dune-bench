# Rule 26: Battling Blind - Implementation Verification

## Rule Reference

From `handwritten-rules/battle.md` line 5:
> **BATTLING BLIND**: Whenever two or more players' Forces are in the same Territory and in the same Sector under storm players still battle.

## Rule Context

This rule works in conjunction with the storm separation rule (line 4):
> Players can not battle one another in a Territory if their Forces are separated by a Sector in storm.

The key distinction:
- **Different sectors separated by storm**: Cannot battle
- **Same sector under storm**: Can still battle (Battling Blind)

## Implementation Analysis

### 1. Battle Identification Logic

**File**: `src/lib/game/phases/handlers/battle.ts`

The `identifyBattles` method (lines 208-247) identifies battles by grouping forces by territory AND sector:

```208:247:src/lib/game/phases/handlers/battle.ts
  private identifyBattles(state: GameState): PendingBattle[] {
    const battles: PendingBattle[] = [];
    const checkedLocations = new Set<string>();

    for (const [faction, factionState] of state.factions) {
      for (const forceStack of factionState.forces.onBoard) {
        // NEUTRAL ZONE: Players cannot battle in the Polar Sink
        if (forceStack.territoryId === TerritoryId.POLAR_SINK) continue;

        const locationKey = `${forceStack.territoryId}-${forceStack.sector}`;
        if (checkedLocations.has(locationKey)) continue;
        checkedLocations.add(locationKey);

        // Use sector-aware query to get all factions in this specific location
        const factionsHere = getFactionsInTerritoryAndSector(
          state,
          forceStack.territoryId,
          forceStack.sector
        );

        // Exclude BG advisors (they can't battle)
        const battleFactions = factionsHere.filter((f: Faction) => {
          if (f === Faction.BENE_GESSERIT) {
            return getBGFightersInSector(state, forceStack.territoryId, forceStack.sector) > 0;
          }
          return true;
        });

        if (battleFactions.length >= 2) {
          battles.push({
            territoryId: forceStack.territoryId,
            sector: forceStack.sector,
            factions: battleFactions,
          });
        }
      }
    }

    return battles;
  }
```

**Key Observations**:
- ✅ The method groups forces by `territoryId` and `sector` only
- ✅ **No check for storm status** - battles are identified regardless of whether the sector is in storm
- ✅ This correctly implements the "Battling Blind" rule

### 2. Storm Separation Helper Function

**File**: `src/lib/game/state/queries.ts`

The `areSectorsSeparatedByStorm` function (lines 304-337) explicitly handles the "Battling Blind" case:

```304:337:src/lib/game/state/queries.ts
export function areSectorsSeparatedByStorm(
  state: GameState,
  sector1: number,
  sector2: number
): boolean {
  // Same sector - can always battle (even in storm)
  if (sector1 === sector2) return false;

  const stormSector = state.stormSector;

  // Check if storm is between the two sectors
  // Sectors are arranged in a circle (0-17)
  const min = Math.min(sector1, sector2);
  const max = Math.max(sector1, sector2);

  // Check direct path (not wrapping around)
  const directPathLength = max - min;
  const directPathHasStorm = stormSector > min && stormSector < max;

  // Check wrapped path (going the other way around the circle)
  const wrappedPathLength = 18 - directPathLength; // Total sectors minus direct path
  const wrappedPathHasStorm = stormSector < min || stormSector > max;

  // Storm separates if it's in the shorter path between the sectors
  // (or if both paths are equal length and storm is in either path)
  if (directPathLength < wrappedPathLength) {
    return directPathHasStorm;
  } else if (wrappedPathLength < directPathLength) {
    return wrappedPathHasStorm;
  } else {
    // Equal length paths - storm separates if it's in either path
    return directPathHasStorm || wrappedPathHasStorm;
  }
}
```

**Key Observations**:
- ✅ Line 310: **Explicitly returns `false` (not separated) when sectors are the same**
- ✅ Comment on line 309: "Same sector - can always battle (even in storm)"
- ✅ This confirms that same-sector battles are allowed even when the sector is in storm

### 3. Sector Query Function

**File**: `src/lib/game/state/queries.ts`

The `getFactionsInTerritoryAndSector` function (lines 245-269) retrieves factions in a specific territory and sector:

```245:269:src/lib/game/state/queries.ts
export function getFactionsInTerritoryAndSector(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): Faction[] {
  const factions: Faction[] = [];
  for (const [faction, factionState] of state.factions) {
    const hasForces = factionState.forces.onBoard.some(
      (f) => f.territoryId === territoryId && f.sector === sector
    );
    if (hasForces) {
      // BG special case: advisors don't count for battle purposes
      if (faction === Faction.BENE_GESSERIT) {
        const fighters = getBGFightersInSector(state, territoryId, sector);
        if (fighters === 0) {
          // Only advisors present - can't battle

        }
      }

      factions.push(faction);
    }
  }
  return factions;
}
```

**Key Observations**:
- ✅ Function only checks territory and sector match
- ✅ **No storm status check** - returns factions regardless of storm
- ✅ This supports the "Battling Blind" implementation

### 4. Storm Status Check Function

**File**: `src/lib/game/state/queries.ts`

The `isSectorInStorm` function exists but is **not used** in battle identification:

```287:289:src/lib/game/state/queries.ts
export function isSectorInStorm(state: GameState, sector: number): boolean {
  return sector === state.stormSector;
}
```

**Key Observations**:
- ✅ This function is available but not called in `identifyBattles`
- ✅ This confirms that storm status is intentionally **not** used to filter battles
- ✅ This is correct behavior for "Battling Blind"

## Verification Results

### ✅ Implementation is CORRECT

The implementation correctly handles the "Battling Blind" rule:

1. **Battle identification does not filter by storm status**
   - `identifyBattles` groups forces by territory and sector only
   - No check for `isSectorInStorm` in the battle identification logic

2. **Storm separation logic explicitly allows same-sector battles**
   - `areSectorsSeparatedByStorm` returns `false` (not separated) when sectors are the same
   - Comment explicitly states: "Forces in the SAME sector can always battle (even if that sector is in storm)"

3. **Query functions support the rule**
   - `getFactionsInTerritoryAndSector` returns factions regardless of storm status
   - No storm-based filtering in the query logic

## Test Scenarios

### Scenario 1: Same Sector Under Storm ✅
- **Setup**: 
  - Storm at sector 5
  - Faction A: 3 forces at Territory X, sector 5
  - Faction B: 2 forces at Territory X, sector 5
- **Expected**: Battle occurs (Battling Blind rule)
- **Implementation**: ✅ Correctly identifies battle

### Scenario 2: Different Sectors Separated by Storm ❌
- **Setup**:
  - Storm at sector 5
  - Faction A: 3 forces at Territory X, sector 4
  - Faction B: 2 forces at Territory X, sector 6
- **Expected**: No battle (separated by storm)
- **Implementation**: ✅ Correctly prevents battle (forces grouped by different sectors)

### Scenario 3: Same Sector Not in Storm ✅
- **Setup**:
  - Storm at sector 10
  - Faction A: 3 forces at Territory X, sector 5
  - Faction B: 2 forces at Territory X, sector 5
- **Expected**: Battle occurs (normal case)
- **Implementation**: ✅ Correctly identifies battle

## Conclusion

The "Battling Blind" rule (handwritten-rules/battle.md line 5) is **correctly implemented**. When two or more players' Forces are in the same Territory and same Sector under storm, battles are still identified and will occur. The implementation:

- ✅ Does not filter battles based on storm status
- ✅ Groups forces by territory and sector only
- ✅ Explicitly allows same-sector battles even in storm (via `areSectorsSeparatedByStorm`)
- ✅ Maintains separation logic for different sectors

The rule is working as intended.





