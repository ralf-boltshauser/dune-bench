# Spice Collection Phase Fix - Automatic Collection

## Problem
The spice collection phase was incorrectly asking factions if they wanted to collect spice. This is wrong according to the official rules.

## Rules (Landsraad Rules 1.08)

**HARVESTING SPICE**: Any player whose Forces Occupy a Sector of a Territory in which there is spice may now collect that spice.

**COLLECTION RATE**: The collection rate of spice for each Force is 2 spice per Force. If the player occupies Carthag and/or Arrakeen their collection rate is now 3 spice per Force.

**UNCLAIMED SPICE**: Uncollected spice remains where it is for future turns.

## Solution
Spice collection is now **automatic** and **mandatory**. No agent decisions are needed.

### Implementation Details

1. **Automatic Collection**: The phase completes immediately in `initialize()` with no agent requests
2. **Collection Rate**:
   - Base: 2 spice per force
   - With city (Arrakeen OR Carthag): 3 spice per force
   - The city bonus applies to ALL collection, not just in those cities
3. **Limited by Available Spice**: Can only collect up to the spice present in that sector
4. **Per-Sector**: Forces in different sectors of the same territory collect separately

### Code Changes

**File: `/src/lib/game/phases/handlers/spice-collection.ts`**
- Removed all agent request logic
- Removed `processStep()` meaningful implementation (phase completes immediately)
- Added `checkOrnithopterAccess()` helper to check for Arrakeen/Carthag bonus
- Phase now completes in `initialize()` with automatic collection for all factions

**File: `/src/lib/game/tools/types.ts`**
- Updated `PHASE_TO_TOOL_CATEGORY` to mark SPICE_COLLECTION as automatic (empty array)

**File: `/src/lib/game/tools/registry.ts`**
- Already had SPICE_COLLECTION marked as automatic phase with empty tool list

### Test Coverage

**Test: `test-spice-collection-auto.ts`**
- Verifies base collection rate (2 spice/force)
- Verifies city bonus collection rate (3 spice/force)
- Verifies no agent requests (automatic)
- Verifies phase completes immediately

**Test: `test-spice-collection-edge-cases.ts`**
- Verifies limited spice (can't collect more than available)
- Verifies multiple sectors work correctly
- Verifies no collection when no spice present

## Example

**Before:**
```
Agent decision: "Do you want to collect spice from Hagga Basin?"
```

**After:**
```
Automatic: "atreides collects 10 spice from hagga_basin sector 8 (5 forces × 2 spice/force)"
```

## Benefits

1. **Rules Compliant**: Matches official GF9 Dune rules exactly
2. **Faster**: No unnecessary agent round-trips
3. **Simpler**: No edge cases around agents "forgetting" to collect spice
4. **Deterministic**: Same inputs always produce same outputs

## Testing

All tests pass:
```bash
npx tsx src/lib/game/test-spice-collection-auto.ts  # ✓ ALL TESTS PASSED
npx tsx src/lib/game/test-spice-collection-edge-cases.ts  # ✓ ALL EDGE CASE TESTS PASSED
```
