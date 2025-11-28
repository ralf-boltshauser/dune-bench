# Rule 20: Emperor Sardaukar Elite Forces Verification

**Source**: `handwritten-rules/battle.md` lines 109-112

## Rules to Verify

From the handwritten rules:

1. **Line 109 - SARDAUKAR**: "Your five starred Forces, elite Sardaukar, have a special fighting capability. They are worth two normal Forces in battle and in taking losses against all opponents except Fremen."

2. **Line 110 - SARDAUKAR WEAKNESS**: "Your starred Forces are worth just one Force against Fremen Forces."

3. **Line 111 - SARDAUKAR REVIVAL**: "They are treated as one Force in revival."

4. **Line 112 - SARDAUKAR TRAINING**: "Only one Sardaukar Force can be revived per Turn."

---

## Implementation Status

### ✅ 1. Worth Two Normal Forces in Battle

**Status**: CORRECTLY IMPLEMENTED

**Location**: `src/lib/game/rules/combat.ts`

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

**Verification**: Elite forces count as 2x in battle strength calculation, with the special case for Sardaukar vs Fremen (1x) correctly handled.

---

### ✅ 2. Worth Two Normal Forces in Taking Losses (Except vs Fremen)

**Status**: CORRECTLY IMPLEMENTED

**Location**: `src/lib/game/state/force-utils.ts`

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

**Verification**: Elite forces absorb 2 losses each when taking battle losses, except Sardaukar vs Fremen where they absorb only 1 loss. The function correctly prioritizes losing regular forces first to preserve valuable elites.

**Usage**: This function is called in `src/lib/game/phases/handlers/battle.ts` when the winner takes losses:

```1384:1401:src/lib/game/phases/handlers/battle.ts
        // Calculate loss distribution: elite forces absorb 2 losses each (or 1 for Sardaukar vs Fremen)
        const opponent = winner === battle.aggressor ? battle.defender : battle.aggressor;
        const distribution = calculateLossDistribution(
          winnerForces.forces,
          winnerLosses,
          winner,
          opponent
        );

        if (distribution.regularLost > 0 || distribution.eliteLost > 0) {
          newState = sendForcesToTanks(
            newState,
            winner,
            battle.territoryId,
            battle.sector,
            distribution.regularLost,
            distribution.eliteLost
          );
```

---

### ✅ 3. Worth Just One Force Against Fremen

**Status**: CORRECTLY IMPLEMENTED

**Verification**: Both battle strength calculation and loss distribution correctly handle the Sardaukar vs Fremen special case:

- **Battle Strength**: `eliteMultiplier = isSardaukarVsFremen ? 1 : 2` (line 671 in `combat.ts`)
- **Loss Distribution**: `eliteValue = isSardaukarVsFremen ? 1 : 2` (line 372 in `force-utils.ts`)

---

### ✅ 4. Treated as One Force in Revival

**Status**: CORRECTLY IMPLEMENTED (implicitly)

**Location**: `src/lib/game/state/mutations.ts`

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

**Verification**: The `reviveForces` function treats elite forces the same as regular forces in terms of counting - one elite force = one force slot in revival limits. Elite forces don't count as 2x when determining revival limits, which matches the rule "treated as one Force in revival."

---

### ✅ 5. Only One Sardaukar Force Can Be Revived Per Turn

**Status**: CORRECTLY IMPLEMENTED

**Implementation Details**:

1. **State Tracking**: The game state tracks elite forces revived this turn:

```65:65:src/lib/game/types/state.ts
  eliteForcesRevivedThisTurn?: number; // Track elite forces (Sardaukar/Fedaykin) revived this turn (max 1 for Emperor/Fremen)
```

2. **Validation Enforcement**: The `validateForceRevival` function enforces the limit:

```168:199:src/lib/game/rules/revival.ts
  // Check: Elite revival limit (Fedaykin/Sardaukar - only 1 per turn)
  if (eliteCount > 1 && (faction === Faction.FREMEN || faction === Faction.EMPEROR)) {
    errors.push(
      createError(
        'ELITE_REVIVAL_LIMIT_EXCEEDED',
        `Cannot revive ${eliteCount} elite forces, maximum is 1 per turn`,
        {
          field: 'eliteCount',
          actual: eliteCount,
          expected: '0 or 1',
          suggestion: 'Revive at most 1 elite force per turn',
        }
      )
    );
  }

  // Check: Already revived elite forces this turn
  const alreadyRevived = factionState.eliteForcesRevivedThisTurn ?? 0;
  if (eliteCount > 0 && alreadyRevived >= 1 && (faction === Faction.FREMEN || faction === Faction.EMPEROR)) {
    errors.push(
      createError(
        'ELITE_REVIVAL_ALREADY_USED',
        `Cannot revive ${eliteCount} elite forces, you have already revived ${alreadyRevived} elite force(s) this turn`,
        {
          field: 'eliteCount',
          actual: eliteCount,
          expected: '0',
          suggestion: 'You can only revive 1 elite force per turn',
        }
      )
    );
  }
```

3. **Tracking in reviveForces**: The mutation function tracks elite revivals:

```361:371:src/lib/game/state/mutations.ts
  // Track elite forces revived this turn (for Fedaykin/Sardaukar limit)
  const updatedState: Partial<FactionState> = {
    forces: { ...forces, tanks, reserves },
  };

  if (isElite && (faction === Faction.FREMEN || faction === Faction.EMPEROR)) {
    const currentEliteRevived = factionState.eliteForcesRevivedThisTurn ?? 0;
    updatedState.eliteForcesRevivedThisTurn = currentEliteRevived + count;
  }

  return updateFactionState(state, faction, updatedState);
```

4. **Reset on Turn Start**: The counter is reset at the start of each revival phase:

```60:78:src/lib/game/phases/handlers/revival.ts
    // Reset Emperor ally revival bonus, Fremen boost, and elite revival tracking for all factions
    let newState = state;
    const newFactions = new Map(state.factions);
    for (const [faction, factionState] of state.factions) {
      const needsReset =
        (factionState.emperorAllyRevivalsUsed !== undefined && factionState.emperorAllyRevivalsUsed > 0) ||
        (factionState.fremenRevivalBoostGranted === true) ||
        (factionState.eliteForcesRevivedThisTurn !== undefined && factionState.eliteForcesRevivedThisTurn > 0);

      if (needsReset) {
        newFactions.set(faction, {
          ...factionState,
          emperorAllyRevivalsUsed: 0,
          fremenRevivalBoostGranted: false,
          eliteForcesRevivedThisTurn: 0,
        });
      }
    }
    newState = { ...state, factions: newFactions };
```

5. **Tool Schema Support**: The tool schema supports `eliteCount` with proper validation:

```126:145:src/lib/game/tools/schemas.ts
export const ReviveForcesSchema = z.object({
  count: z.number()
    .int()
    .min(0)
    .max(3)
    .optional()
    .describe('Number of regular forces to revive. Free revival varies by faction (usually 2). Additional forces cost 2 spice each.'),
  eliteCount: z.number()
    .int()
    .min(0)
    .max(1)
    .optional()
    .describe('Number of elite forces (Sardaukar/Fedaykin) to revive. Maximum 1 per turn for Emperor/Fremen.'),
}).refine(
  (data) => (data.count ?? 0) + (data.eliteCount ?? 0) > 0,
  { message: "Must revive at least 1 force (either count or eliteCount must be > 0)" }
).refine(
  (data) => (data.count ?? 0) + (data.eliteCount ?? 0) <= 3,
  { message: "Total forces revived cannot exceed 3 per turn" }
);
```

6. **Tool Validation**: The tool uses the validation function:

```59:67:src/lib/game/tools/actions/revival.ts
        // Use validation function to check all rules
        const validation = validateForceRevival(state, faction, count, eliteCount);
        if (!validation.valid) {
          return failureResult(
            validation.errors[0]?.message ?? 'Invalid revival request',
            validationToToolError(validation.errors[0]),
            false
          );
        }
```

**Verification**: The rule is fully enforced through validation, state tracking, and proper reset mechanisms. Players cannot revive more than one Sardaukar per turn.

---

## Summary

| Rule | Status | Notes |
|------|--------|-------|
| Worth 2x in battle | ✅ Implemented | Correctly handled in `calculateForcesDialedStrength` |
| Worth 2x in losses (except vs Fremen) | ✅ Implemented | Correctly handled in `calculateLossDistribution` |
| Worth 1x vs Fremen | ✅ Implemented | Special case correctly applied in both battle and losses |
| Treated as 1 Force in revival | ✅ Implemented | Elite forces count as 1 force slot in revival limits |
| Only 1 Sardaukar per turn | ✅ **FULLY ENFORCED** | Validation, state tracking, and reset mechanisms all in place |

---

## Implementation Status

All rules for Emperor Sardaukar elite forces are **fully implemented and enforced**:

1. ✅ **Battle Strength**: Elite forces count as 2x in battle calculations
2. ✅ **Loss Absorption**: Elite forces absorb 2 losses each (except vs Fremen)
3. ✅ **Fremen Weakness**: Sardaukar only worth 1x against Fremen
4. ✅ **Revival Counting**: Elite forces count as 1 force slot in revival
5. ✅ **Revival Limit**: Only 1 Sardaukar can be revived per turn (enforced with validation, state tracking, and proper reset)

---

## Related Files

- `src/lib/game/rules/combat.ts` - Battle strength calculation
- `src/lib/game/state/force-utils.ts` - Loss distribution calculation
- `src/lib/game/rules/revival.ts` - Revival validation (missing elite limit check)
- `src/lib/game/state/mutations.ts` - `reviveForces` function
- `src/lib/game/phases/handlers/revival.ts` - Revival phase handler
- `src/lib/game/tools/actions/revival.ts` - Revival tool (mentions rule but doesn't enforce)
- `handwritten-rules/battle.md` - Source rules (lines 109-112)

