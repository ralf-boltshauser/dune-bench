# Rule 11: Surviving Leaders Verification

## Rule Reference

**Source**: `handwritten-rules/battle.md` line 23

> "SURVIVING LEADERS: Leaders who survive remain in the Territory where they were used. (Game effects do not kill these leaders while there.) These are not part of the Leader Pool until Leader Return [1.07.07]."

**Related Rule**: `handwritten-rules/battle.md` line 30

> "LEADER RETURN: After all battles have been fought, players collect any of their leaders used in battle still in Territories adding them to their Leader Pool."

## Verification Summary

✅ **PASS** - All three requirements are correctly implemented:

1. ✅ Surviving leaders remain in the Territory where they were used
2. ✅ They are not part of the Leader Pool until Leader Return
3. ✅ They are not killed by game effects while there

## Detailed Findings

### 1. Surviving Leaders Remain in Territory ✅

**Implementation**: `src/lib/game/state/mutations.ts` - `markLeaderUsed()`

When a leader survives a battle, the `markLeaderUsed()` function is called, which:
- Sets `location: LeaderLocation.ON_BOARD`
- Sets `usedInTerritoryId: territoryId` (tracks which territory they're in)
- Sets `usedThisTurn: true`

```507:527:src/lib/game/state/mutations.ts
export function markLeaderUsed(
  state: GameState,
  faction: Faction,
  leaderId: string,
  territoryId: TerritoryId
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.ON_BOARD,
        usedThisTurn: true,
        usedInTerritoryId: territoryId,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}
```

**Called from**: `src/lib/game/phases/handlers/battle.ts` line 1483-1488

```1472:1490:src/lib/game/phases/handlers/battle.ts
    // Mark leaders as used (unless traitor was revealed - winner's leader returns to pool)
    if (winnerPlan?.leaderId) {
      if (result.traitorRevealed) {
        // Winner's leader returns to pool immediately per traitor rules
        newState = returnLeaderToPool(newState, winner, winnerPlan.leaderId);
        events.push({
          type: 'LEADER_RETURNED',
          data: { faction: winner, leaderId: winnerPlan.leaderId },
          message: `${winner}'s leader returns to pool after traitor reveal`,
        });
      } else {
        newState = markLeaderUsed(
          newState,
          winner,
          winnerPlan.leaderId,
          battle.territoryId
        );
      }
    }
```

**Verification**: ✅ Leaders are correctly marked with `ON_BOARD` location and the territory ID where they fought.

### 2. Not Part of Leader Pool Until Leader Return ✅

**Implementation**: `src/lib/game/state/queries.ts` - `getAvailableLeaders()`

The `getAvailableLeaders()` function only returns leaders with `LEADER_POOL` location, explicitly excluding `ON_BOARD` leaders:

```74:78:src/lib/game/state/queries.ts
export function getAvailableLeaders(state: GameState, faction: Faction): Leader[] {
  return getFactionState(state, faction).leaders.filter(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );
}
```

**Used in**: Battle plan creation (line 615-624 in `battle.ts`) - only `LEADER_POOL` leaders are shown as available.

**Leader Return Implementation**: `src/lib/game/state/mutations.ts` - `resetLeaderTurnState()`

Leaders return to the pool at the end of the Battle Phase via `resetLeaderTurnState()`, which converts `ON_BOARD` leaders back to `LEADER_POOL`:

```532:543:src/lib/game/state/mutations.ts
export function resetLeaderTurnState(state: GameState, faction: Faction): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => ({
    ...l,
    usedThisTurn: false,
    usedInTerritoryId: null,
    location:
      l.location === LeaderLocation.ON_BOARD ? LeaderLocation.LEADER_POOL : l.location,
  }));

  return updateFactionState(state, faction, { leaders });
}
```

**Called from**: `src/lib/game/phases/handlers/battle.ts` - `cleanup()` method (line 164-169)

```164:169:src/lib/game/phases/handlers/battle.ts
  cleanup(state: GameState): GameState {
    // Reset all leaders' used state
    let newState = state;
    for (const faction of state.factions.keys()) {
      newState = resetLeaderTurnState(newState, faction);
    }
```

**Verification**: ✅ 
- Leaders with `ON_BOARD` location are excluded from available leaders
- Leader Return happens correctly after all battles (in cleanup phase)
- Leaders are converted from `ON_BOARD` to `LEADER_POOL` at the right time

### 3. Not Killed by Game Effects While There ✅

**Implementation**: `src/lib/game/state/mutations.ts` - `killLeader()`

The `killLeader()` function checks if a leader is `ON_BOARD` and protects them from being killed by default:

```446:480:src/lib/game/state/mutations.ts
export function killLeader(
  state: GameState,
  faction: Faction,
  leaderId: string,
  allowProtected: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      // Check if leader is protected from game effects
      // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
      // Territory where they were used. (Game effects do not kill these leaders while there.)"
      if (!allowProtected && l.location === LeaderLocation.ON_BOARD) {
        // Leader is protected - don't kill them
        console.warn(
          `[killLeader] Leader ${leaderId} of ${faction} is protected (ON_BOARD) - skipping kill`
        );
        return l;
      }

      return {
        ...l,
        location: l.hasBeenKilled
          ? LeaderLocation.TANKS_FACE_DOWN
          : LeaderLocation.TANKS_FACE_UP,
        hasBeenKilled: true,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}
```

**Storm Phase Protection**: `src/lib/game/phases/handlers/storm.ts` line 490-505

The storm phase explicitly checks for protected leaders and skips killing them:

```490:505:src/lib/game/phases/handlers/storm.ts
        for (const [faction, factionState] of state.factions) {
          // Check for protected leaders in this territory/sector
          // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
          // Territory where they were used. (Game effects do not kill these leaders while there.)"
          const protectedLeaders = getProtectedLeaders(state, faction);
          if (protectedLeaders.length > 0) {
            const leadersInTerritory = factionState.leaders.filter(
              (l) => l.location === LeaderLocation.ON_BOARD &&
                     l.usedInTerritoryId === territoryId
            );
            if (leadersInTerritory.length > 0) {
              console.log(
                `   🛡️  ${leadersInTerritory.length} ${FACTION_NAMES[faction]} leader(s) protected from storm in ${territoryId}`
              );
            }
          }
```

**Spice Blow Phase Protection**: `src/lib/game/phases/handlers/spice-blow.ts` line 645-666

The spice blow phase (sandworm devouring) also checks for protected leaders:

```645:666:src/lib/game/phases/handlers/spice-blow.ts
    // Fremen forces are IMMUNE to worm devouring (this is different from storm!)
    for (const [faction, factionState] of newState.factions) {
      // Check for protected leaders in this territory
      // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
      // Territory where they were used. (Game effects do not kill these leaders while there.)"
      const protectedLeaders = getProtectedLeaders(newState, faction);
      if (protectedLeaders.length > 0) {
        const leadersInTerritory = factionState.leaders.filter(
          (l) => l.location === LeaderLocation.ON_BOARD &&
                 l.usedInTerritoryId === territoryId
        );
        if (leadersInTerritory.length > 0) {
          console.log(
            `   🛡️  ${leadersInTerritory.length} ${faction} leader(s) protected from sandworm in ${territoryId}`
          );
          newEvents.push({
            type: 'LEADER_PROTECTED_FROM_WORM',
            data: { faction, territory: territoryId, sector, count: leadersInTerritory.length },
            message: `${leadersInTerritory.length} ${faction} leader(s) protected from sandworm`,
          });
        }
      }
```

**Query Functions**: `src/lib/game/state/queries.ts` - `isLeaderProtectedOnBoard()` and `getProtectedLeaders()`

Helper functions are provided to check protection status:

```693:714:src/lib/game/state/queries.ts
export function isLeaderProtectedOnBoard(
  state: GameState,
  faction: Faction,
  leaderId: string
): boolean {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  // Leaders with location ON_BOARD are protected from game effects
  return leader?.location === LeaderLocation.ON_BOARD;
}

/**
 * Get all leaders currently protected on board for a faction.
 * Returns the definitionIds of leaders that are immune to game effects.
 */
export function getProtectedLeaders(state: GameState, faction: Faction): string[] {
  const factionState = getFactionState(state, faction);
  return factionState.leaders
    .filter((l) => l.location === LeaderLocation.ON_BOARD)
    .map((l) => l.definitionId);
}
```

**Verification**: ✅
- `killLeader()` protects `ON_BOARD` leaders by default
- Storm phase explicitly checks and protects leaders
- Spice blow phase (sandworms) explicitly checks and protects leaders
- Protection can be bypassed with `allowProtected=true` for special cases (e.g., Lasgun/Shield explosions)

## Edge Cases

### Dedicated Leader Rule

The rule states: "Leaders that survive battles may fight more than once in a single Territory if needed, but no leader may fight in more than one Territory during the same Phase."

This is correctly implemented in `src/lib/game/rules/combat.ts`:

```165:179:src/lib/game/rules/combat.ts
    } else if (leader.location === LeaderLocation.ON_BOARD) {
      // DEDICATED LEADER: Leaders ON_BOARD can fight multiple times in SAME territory
      if (leader.usedThisTurn && leader.usedInTerritoryId !== territoryId) {
        errors.push(
          createError(
            'LEADER_ALREADY_USED',
            `${plan.leaderId} already fought in another territory this turn`,
            {
              field: 'leaderId',
              suggestion: `Choose from: ${availableLeaders.map((l) => l.definitionId).join(', ')}`,
            }
          )
        );
      }
      // If usedInTerritoryId === territoryId, allow it (fighting again in same territory)
    } else {
```

✅ Leaders with `ON_BOARD` location can fight again in the same territory, but not in a different territory.

### Traitor Reveal Exception

When a traitor is revealed, the winner's leader returns to pool immediately (not marked as `ON_BOARD`). This is correctly handled:

```1473:1482:src/lib/game/phases/handlers/battle.ts
    if (winnerPlan?.leaderId) {
      if (result.traitorRevealed) {
        // Winner's leader returns to pool immediately per traitor rules
        newState = returnLeaderToPool(newState, winner, winnerPlan.leaderId);
        events.push({
          type: 'LEADER_RETURNED',
          data: { faction: winner, leaderId: winnerPlan.leaderId },
          message: `${winner}'s leader returns to pool after traitor reveal`,
        });
      } else {
```

✅ Exception correctly implemented.

## Conclusion

All three requirements from the rule are correctly implemented:

1. ✅ **Surviving leaders remain in Territory**: Implemented via `markLeaderUsed()` setting `location: ON_BOARD` and `usedInTerritoryId: territoryId`

2. ✅ **Not part of Leader Pool until Leader Return**: Implemented via `getAvailableLeaders()` filtering only `LEADER_POOL` leaders, and `resetLeaderTurnState()` converting `ON_BOARD` to `LEADER_POOL` after all battles

3. ✅ **Not killed by game effects**: Implemented via `killLeader()` protection check, and explicit checks in storm and spice blow phases

The implementation correctly handles all edge cases including the Dedicated Leader rule and traitor reveal exceptions.





