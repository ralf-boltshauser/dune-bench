# Group 9: Spice Collection Fix Report

## Task
Fix missing property in `ForcePlacement` for spice collection tests.

## Findings

### Issue Identified
In `src/lib/game/phase-tests/spice-collection/scenarios/elite-vs-regular.ts` at line 25, a `ForcePlacement` object was missing the required `regular` property.

### Root Cause
The `ForcePlacement` interface (defined in `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`) requires:
- `regular: number` (required)
- `elite?: number` (optional)

The test case on line 25 only specified `elite: 4` without the required `regular` property.

### Fix Applied
**File:** `src/lib/game/phase-tests/spice-collection/scenarios/elite-vs-regular.ts`
**Line:** 25

**Before:**
```typescript
{ faction: Faction.FREMEN, territory: TerritoryId.SOUTH_MESA, sector: 2, elite: 4 },
```

**After:**
```typescript
{ faction: Faction.FREMEN, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 0, elite: 4 },
```

### Verification
- Ran `tsc --noEmit` - The specific error for this file is resolved
- The fix is appropriate since the test is specifically about elite forces only, so `regular: 0` is the correct value

## Status
✅ **Fixed** - Missing `regular` property added to `ForcePlacement` object in spice collection test.

