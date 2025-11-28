# Revival Phase Test Fixes Applied

## Issues Fixed

### 1. ✅ Negative maxAdditionalForces Display

**Issue**: When a faction had fewer forces in tanks than their free revival limit, `maxAdditionalForces` would show as negative (e.g., `-3`).

**Location**: `src/lib/game/phases/handlers/revival.ts` line 263

**Fix Applied**:
```typescript
// Before:
const actualMaxAdditional = Math.min(maxAdditionalForces, maxAffordableAdditional, limits.forcesInTanks - limits.freeForces);

// After:
const actualMaxAdditional = Math.max(0, Math.min(maxAdditionalForces, maxAffordableAdditional, limits.forcesInTanks - limits.freeForces));
```

**Result**: Now correctly shows `0` instead of negative values when there are no additional forces available beyond free revival.

**Verification**: Checked latest log file - `maxAdditionalForces: 0` appears correctly for Fremen (who has 0 forces in tanks).

---

### 2. ✅ Logger Missing forcesInTanks in State Snapshot

**Issue**: The test logger's state snapshot didn't include `forcesInTanks`, making it difficult to verify that forces were properly in tanks for revival.

**Location**: `src/lib/game/phase-tests/helpers/test-logger.ts` line 131-151

**Fix Applied**:
```typescript
// Added forcesInTanks to state snapshot:
factionStates: Array.from(state.factions.entries()).map(([faction, fs]) => ({
  faction,
  spice: fs.spice,
  forcesOnBoard: ...,
  forcesInReserves: fs.forces.reserves,
  forcesInTanks: fs.forces.tanks,  // ← Added this line
  leaders: ...,
  ...
})),
```

**Result**: State snapshots now show `forcesInTanks` for each faction, making it easy to verify:
- Forces are properly in tanks at the start
- Forces are removed from tanks after revival
- Forces are added to reserves after revival

**Verification**: Checked latest log file - `forcesInTanks` now appears in all state snapshots with correct values:
- Fremen: `forcesInTanks: { regular: 0, elite: 0 }`
- Atreides: `forcesInTanks: { regular: 10, elite: 0 }`
- Emperor: `forcesInTanks: { regular: 5, elite: 1 }`
- Harkonnen: `forcesInTanks: { regular: 8, elite: 0 }`

---

### 3. ✅ Test Setup: Forces Properly Moved to Tanks

**Issue**: The test state builder wasn't properly moving forces to tanks - forces were being placed on the board instead.

**Location**: `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts` lines 64-89

**Fix Applied**: Updated the logic to:
1. Add forces to reserves first
2. Place forces on board (required by `sendForcesToTanks`)
3. Call `sendForcesToTanks` to move them from board to tanks

**Result**: Forces are now properly in tanks at test start, allowing proper revival testing.

**Verification**: Logs show forces correctly in tanks at initialization.

---

## Summary

All three issues have been fixed and verified:

1. ✅ Negative `maxAdditionalForces` → Now shows `0`
2. ✅ Missing `forcesInTanks` in logs → Now included in state snapshots
3. ✅ Forces not in tanks → Now properly moved to tanks in test setup

The test suite now provides complete visibility into the revival phase execution and correctly handles all edge cases.

