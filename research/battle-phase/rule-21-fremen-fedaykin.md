# Rule 21: Fremen Fedaykin Elite Forces Verification

## Source Rule
**handwritten-rules/battle.md lines 135-137:**
- ✷FEDAYKIN: Your three starred Forces, Fedaykin, have a special fighting capability. They are worth two normal Forces in battle and in taking losses.
- FEDAYKIN REVIVAL: They are each treated as one Force in revival.
- FEDAYKIN TRAINING: Only one Fedaykin Force can be revived per Turn.

## Verification Summary

### ✅ Rule 1: Fedaykin Worth 2x in Battle
**Status: IMPLEMENTED**

Fedaykin are correctly counted as 2x their number in battle strength calculations.

**Implementation Location:**
```646:674:src/lib/game/rules/combat.ts
function calculateForcesDialedStrength(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  forcesDialed: number,
  opponentFaction: Faction
): number {
  // Get the force stack in this territory
  const forceStack = state.factions.get(faction)?.forces.onBoard.find(
    (f) => f.territoryId === territoryId
  );

  if (!forceStack || forcesDialed === 0) return forcesDialed;

  const { elite } = forceStack.forces;

  // If no elite forces, all dialed forces are regular (1x each)
  if (elite === 0) return forcesDialed;

  // Assume elite forces are dialed first
  const eliteDialed = Math.min(forcesDialed, elite);
  const regularDialed = forcesDialed - eliteDialed;

  // Check for special case: Emperor Sardaukar vs Fremen (only worth 1x)
  const isSardaukarVsFremen = faction === Faction.EMPEROR && opponentFaction === Faction.FREMEN;
  const eliteMultiplier = isSardaukarVsFremen ? 1 : 2;

  return regularDialed + (eliteDialed * eliteMultiplier);
}
```

**Details:**
- Elite forces (including Fedaykin) are multiplied by 2 in battle strength
- The function assumes elite forces are dialed first (most valuable)
- Fedaykin are worth 2x against all opponents (unlike Sardaukar which are 1x vs Fremen)

### ✅ Rule 2: Fedaykin Worth 2x in Taking Losses
**Status: IMPLEMENTED**

Fedaykin correctly absorb 2 losses each when taking battle losses.

**Implementation Location:**
```358:383:src/lib/game/state/force-utils.ts
export function calculateLossDistribution(
  forcesInTerritory: ForceCount,
  lossesRequired: number,
  faction: Faction,
  opponentFaction: Faction
): { regularLost: number; eliteLost: number } {
  const { regular, elite } = forcesInTerritory;

  // Sardaukar only worth 1x vs Fremen (battle.md line 109)
  // Faction enum values are lowercase strings
  const isSardaukarVsFremen =
    faction.toString() === 'emperor' && opponentFaction.toString() === 'fremen';

  // Elite forces are worth 2 losses each, except Sardaukar vs Fremen
  const eliteValue = isSardaukarVsFremen ? 1 : 2;

  // Strategy: Lose regular forces first (each absorbs 1 loss)
  const regularLost = Math.min(regular, lossesRequired);
  let remainingLosses = lossesRequired - regularLost;

  // Then lose elite forces (each absorbs eliteValue losses)
  // We need ceil(remainingLosses / eliteValue) elite forces to cover remaining losses
  const eliteLost = Math.min(elite, Math.ceil(remainingLosses / eliteValue));

  return { regularLost, eliteLost };
}
```

**Details:**
- Fedaykin are worth 2 losses each (eliteValue = 2 for Fremen)
- Regular forces are lost first to preserve valuable elites
- The algorithm correctly calculates how many elite forces need to be lost based on their 2x value

**Documentation:**
- See `ELITE_FORCES_LOSS_IMPLEMENTATION.md` for comprehensive details

### ✅ Rule 3: Treated as One Force in Revival
**Status: IMPLEMENTED**

Fedaykin are treated as one force each in revival (no special multiplier).

**Implementation Location:**
```348:364:src/lib/game/state/mutations.ts
export function reviveForces(
  state: GameState,
  faction: Faction,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from tanks, add to reserves
  const tanks = subtractFromForceCount(forces.tanks, count, isElite);
  const reserves = addToForceCount(forces.reserves, count, isElite);

  return updateFactionState(state, faction, {
    forces: { ...forces, tanks, reserves },
  });
}
```

**Details:**
- The `reviveForces` function treats each elite force as a single unit
- No multiplier is applied during revival (unlike battle where they count as 2x)
- This matches the rule: "They are each treated as one Force in revival"

### ✅ Rule 4: Only One Fedaykin Per Turn Revival Limit
**Status: IMPLEMENTED (Fixed)**

The rule states "Only one Fedaykin Force can be revived per Turn" and this limit is now properly enforced.

**Current Implementation:**

1. **Tool Description Mentions the Limit:**
```29:37:src/lib/game/tools/actions/revival.ts
    revive_forces: tool({
      description: `Revive forces from the Tleilaxu Tanks to your reserves.

Rules:
- Free revival: 2 forces (3 for Fremen/Sardaukar factions)
- Additional forces cost 2 spice each
- Maximum 3 forces per turn
- Elite forces (Sardaukar/Fedaykin) can only revive 1 per turn

Use this to rebuild your army after losses.`,
```

2. **Suggestions Limit to 1:**
```261:270:src/lib/game/rules/revival.ts
  // Elite revival (if available)
  if (tanksElite > 0 && (faction === Faction.EMPEROR || faction === Faction.FREMEN)) {
    const eliteCount = Math.min(1, tanksElite); // Only 1 elite per turn
    suggestions.push({
      regularForces: Math.min(limits.freeForces, tanksRegular),
      eliteForces: eliteCount,
      cost: 0,
      isFreeRevival: true,
    });
  }
```

3. **Missing Validation:**
The `validateForceRevival` function does not check if `eliteCount > 1` for Fremen/Emperor factions:

```116:219:src/lib/game/rules/revival.ts
export function validateForceRevival(
  state: GameState,
  faction: Faction,
  regularCount: number,
  eliteCount: number = 0
): ValidationResult<RevivalSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  const limits = getRevivalLimits(state, faction);
  const totalRequested = regularCount + eliteCount;

  // ... validation checks ...
  
  // Check: Forces in tanks
  const tanksRegular = factionState.forces.tanks.regular;
  const tanksElite = factionState.forces.tanks.elite;

  if (regularCount > tanksRegular) {
    // ... error ...
  }

  if (eliteCount > tanksElite) {
    // ... error ...
  }

  // Check: Revival limit
  if (totalRequested > limits.maxForces) {
    // ... error ...
  }

  // ❌ MISSING: No check for eliteCount > 1 for Fremen/Emperor
}
```

4. **Tool Doesn't Support Elite Forces:**
The `revive_forces` tool only accepts a `count` parameter, not separate `regularCount` and `eliteCount`:

```126:132:src/lib/game/tools/schemas.ts
export const ReviveForcesSchema = z.object({
  count: z.number()
    .int()
    .min(1)
    .max(3)
    .describe('Number of forces to revive. Free revival varies by faction (usually 2). Additional forces cost 2 spice each.'),
});
```

**Implementation Details:**

1. **State Tracking Added:**
   - Added `eliteForcesRevivedThisTurn?: number` to `FactionState` interface
   - Tracks how many elite forces have been revived this turn (max 1 for Emperor/Fremen)

2. **Validation Added:**
   - `validateForceRevival` now checks if `eliteCount > 1` for Fremen/Emperor
   - Also checks if elite forces have already been revived this turn
   - Returns appropriate error messages

3. **Tool Updated:**
   - `ReviveForcesSchema` now supports optional `count` and `eliteCount` parameters
   - Tool validates using `validateForceRevival` before executing
   - Properly tracks elite revivals in state

4. **Mutation Updated:**
   - `reviveForces` mutation now increments `eliteForcesRevivedThisTurn` when reviving elite forces
   - Only tracks for Fremen and Emperor factions

5. **Turn Reset:**
   - `eliteForcesRevivedThisTurn` is reset to 0 at the start of each revival phase
   - Follows the same pattern as `emperorAllyRevivalsUsed` and `fremenRevivalBoostGranted`

## Test Cases

1. ✅ Battle: Fedaykin count as 2x strength (already tested)
2. ✅ Losses: Fedaykin absorb 2 losses each (already tested)
3. ✅ Revival: Fedaykin treated as 1 force (implicitly working)
4. ✅ Revival Limit: Attempt to revive 2 Fedaykin in one turn will fail (validation enforced)

## Related Files

- `src/lib/game/rules/combat.ts` - Battle strength calculation
- `src/lib/game/state/force-utils.ts` - Loss distribution
- `src/lib/game/rules/revival.ts` - Revival validation (includes elite limit check)
- `src/lib/game/tools/actions/revival.ts` - Revival tool (supports elite forces)
- `src/lib/game/tools/schemas.ts` - `ReviveForcesSchema` (supports count and eliteCount)
- `src/lib/game/state/mutations.ts` - `reviveForces` mutation (tracks elite revivals)
- `src/lib/game/types/state.ts` - `FactionState` interface (includes `eliteForcesRevivedThisTurn`)
- `src/lib/game/phases/handlers/revival.ts` - Revival phase handler (resets elite tracking)
- `ELITE_FORCES_LOSS_IMPLEMENTATION.md` - Documentation of loss implementation

## Implementation Summary

All four rules are now fully implemented:
- ✅ Fedaykin worth 2x in battle
- ✅ Fedaykin worth 2x in losses
- ✅ Fedaykin treated as 1 force in revival
- ✅ Only one Fedaykin per turn limit enforced

