# Elite Forces Loss Implementation

## Summary

Implemented proper handling of elite forces (Sardaukar/Fedaykin) when taking battle losses. Elite forces are now worth 2x when taking losses, except for the special case of Sardaukar vs Fremen (where Sardaukar are worth 1x).

## Changes Made

### 1. Created Loss Distribution Helper (`src/lib/game/state/force-utils.ts`)

Added `calculateLossDistribution()` function that:
- Prioritizes losing regular forces first (preserves valuable elites)
- Calculates how many elite forces need to be lost based on their 2x value
- Handles the Sardaukar vs Fremen special case (1x value instead of 2x)

**Algorithm:**
1. Lose regular forces first (each absorbs 1 loss)
2. Then lose elite forces (each absorbs 2 losses, or 1 for Sardaukar vs Fremen)
3. Use `ceil(remainingLosses / eliteValue)` to determine elite losses needed

### 2. Updated `sendForcesToTanks()` Mutation (`src/lib/game/state/mutations.ts`)

Modified to support two calling conventions:
- **Legacy**: `sendForcesToTanks(state, faction, territory, sector, count, isElite)`
- **New**: `sendForcesToTanks(state, faction, territory, sector, regularCount, eliteCount)`

The new mode properly handles separate regular and elite force counts.

### 3. Updated Battle Handler (`src/lib/game/phases/handlers/battle.ts`)

Modified `applyBattleResult()` to use the new loss distribution logic in three locations:

#### a) Lasgun-Shield Explosion
```typescript
// Explosion destroys all forces - send them separately to maintain counts
const { regular, elite } = forces.forces;
if (regular > 0 || elite > 0) {
  newState = sendForcesToTanks(
    newState, faction, territoryId, sector,
    regular, elite  // Separate counts
  );
}
```

#### b) Loser Loses All Forces
```typescript
// Loser loses all forces (send separately to maintain force type counts)
const { regular, elite } = loserForces.forces;
if (regular > 0 || elite > 0) {
  newState = sendForcesToTanks(
    newState, loser, territoryId, sector,
    regular, elite  // Separate counts
  );
}
```

#### c) Winner Takes Losses (Most Important)
```typescript
// Calculate loss distribution: elite forces absorb 2 losses each
const opponent = winner === battle.aggressor ? battle.defender : battle.aggressor;
const distribution = calculateLossDistribution(
  winnerForces.forces,
  winnerLosses,  // Forces dialed on battle wheel
  winner,
  opponent
);

if (distribution.regularLost > 0 || distribution.eliteLost > 0) {
  newState = sendForcesToTanks(
    newState, winner, territoryId, sector,
    distribution.regularLost,
    distribution.eliteLost
  );
}
```

## Test Results

Created comprehensive test suite (`src/lib/game/test-elite-loss-distribution.ts`) covering:

1. ✓ Regular forces only
2. ✓ Elite forces only (each worth 2x)
3. ✓ Mixed forces (regular used first)
4. ✓ Sardaukar vs Fremen special case (elite worth 1x)
5. ✓ Fremen Fedaykin vs Emperor (elite worth 2x)
6. ✓ Elite forces with odd number of losses
7. ✓ More losses than available forces
8. ✓ Zero losses

All tests pass.

## Examples

### Example 1: Emperor vs Atreides
- Forces in territory: 5 regular, 3 Sardaukar
- Losses dialed: 8
- Result: Lose 5 regular (5 losses), then 2 Sardaukar (4 losses) = 9 total absorbed
- Remaining: 0 regular, 1 Sardaukar

### Example 2: Emperor vs Fremen
- Forces in territory: 3 regular, 2 Sardaukar
- Losses dialed: 5
- Result: Lose 3 regular (3 losses), then 2 Sardaukar (2 losses, 1x vs Fremen) = 5 total
- Remaining: 0 regular, 0 Sardaukar

### Example 3: Fremen vs Atreides
- Forces in territory: 3 regular, 2 Fedaykin
- Losses dialed: 6
- Result: Lose 3 regular (3 losses), then 2 Fedaykin (4 losses) = 7 total absorbed
- Remaining: 0 regular, 0 Fedaykin

## Rules Reference

- **Line 109**: "SARDAUKAR: ...worth two normal Forces in battle and in taking losses"
- **Line 135**: "FEDAYKIN: ...worth two normal Forces in battle and in taking losses"

Special case handled:
- Sardaukar are only worth 1x (not 2x) when fighting against Fremen

## Files Modified

1. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/force-utils.ts`
2. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/mutations.ts`
3. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/index.ts`
4. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts`

## Testing

Run the test suite:
```bash
npx tsx src/lib/game/test-elite-loss-distribution.ts
```

All 8 tests should pass.
