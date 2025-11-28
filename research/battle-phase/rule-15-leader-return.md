# Leader Return Rule Verification

## Rule Reference

From `handwritten-rules/battle.md` line 30:

```
LEADER RETURN: After all battles have been fought, players collect any of their leaders 
used in battle still in Territories adding them to their Leader Pool.
```

Related rule from line 23:

```
SURVIVING LEADERS: Leaders who survive remain in the Territory where they were used. 
(Game effects do not kill these leaders while there.) These are not part of the Leader 
Pool until Leader Return [1.07.07].
```

## Summary

**Status: ✅ CORRECTLY IMPLEMENTED**

The implementation correctly:
- ✅ Identifies leaders that survived battles (location === ON_BOARD)
- ✅ Returns them to Leader Pool after all battles are complete
- ✅ Excludes killed leaders (they go to TANKS, not ON_BOARD)
- ✅ Handles all factions
- ✅ Executes at the correct time (after all battles)

## Implementation Analysis

### 1. Leader State During Battle

**Location**: `src/lib/game/state/mutations.ts` lines 507-527

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

**Analysis**:
- When a leader is used in battle, `markLeaderUsed()` is called
- The leader's location is set to `LeaderLocation.ON_BOARD`
- This marks them as "still in Territory" per the rule
- The `usedInTerritoryId` tracks which territory they're in

### 2. Leader Survival vs. Death

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 1308-1340

Leaders can be killed in two ways:
1. **Weapon kills** (lines 1309-1323): If a weapon kills the leader, `killLeader()` is called, which sets location to `TANKS_FACE_UP` or `TANKS_FACE_DOWN`
2. **Lasgun/Shield explosion** (lines 1273-1282): Both leaders are killed with `allowProtected=true` to bypass protection

**Key Point**: Leaders that survive battles keep their `ON_BOARD` location. Only killed leaders move to TANKS.

### 3. Leader Return Implementation

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 164-195

```164:195:src/lib/game/phases/handlers/battle.ts
  cleanup(state: GameState): GameState {
    // Reset all leaders' used state
    let newState = state;
    for (const faction of state.factions.keys()) {
      newState = resetLeaderTurnState(newState, faction);
    }

    // Return captured leaders that were used in battle this turn
    // Per rules: "After it is used in a battle, if it wasn't killed during that battle,
    // the leader is returned to the Active Leader Pool of the player who last had it."
    if (newState.factions.has(Faction.HARKONNEN)) {
      const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
      const capturedLeadersUsed = harkonnenState.leaders.filter(
        (l) => l.capturedBy !== null && l.usedThisTurn && l.location !== LeaderLocation.TANKS_FACE_UP && l.location !== LeaderLocation.TANKS_FACE_DOWN
      );

      for (const leader of capturedLeadersUsed) {
        newState = returnCapturedLeader(newState, leader.definitionId);
      }
    }

    // Check for Prison Break
    // Per rules: "When all your own leaders have been killed, you must return all
    // captured leaders immediately to the players who last had them as an Active Leader."
    if (newState.factions.has(Faction.HARKONNEN)) {
      if (shouldTriggerPrisonBreak(newState, Faction.HARKONNEN)) {
        newState = returnAllCapturedLeaders(newState, Faction.HARKONNEN);
      }
    }

    return newState;
  }
```

**Analysis**:
- `cleanup()` is called after all battles are complete (see Phase Manager below)
- It calls `resetLeaderTurnState()` for all factions
- This handles the Leader Return rule

### 4. Leader Return Logic

**Location**: `src/lib/game/state/mutations.ts` lines 529-543

```529:543:src/lib/game/state/mutations.ts
/**
 * Reset all leaders' turn state (called at end of battle phase).
 */
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

**Analysis**:
- This function is called for each faction in `cleanup()`
- It checks if a leader's location is `ON_BOARD` (still in territory)
- If so, it changes the location to `LEADER_POOL` (adds to Leader Pool)
- Leaders in other locations (TANKS, etc.) are left unchanged
- Also resets `usedThisTurn` and `usedInTerritoryId` flags

### 5. Timing: When Cleanup is Called

**Location**: `src/lib/game/phases/phase-manager.ts` lines 333-334

```333:334:src/lib/game/phases/phase-manager.ts
    // Cleanup
    state = handler.cleanup(state);
```

**Analysis**:
- The phase manager calls `cleanup()` after all phase steps are complete
- For the battle phase, this means after all battles have been fought
- This matches the rule requirement: "After all battles have been fought"

### 6. Leader Location Enum

**Location**: `src/lib/game/types/entities.ts` lines 33-40

```33:40:src/lib/game/types/entities.ts
export enum LeaderLocation {
  LEADER_POOL = 'leader_pool', // Available to play
  TANKS_FACE_UP = 'tanks_face_up', // Dead, can be revived
  TANKS_FACE_DOWN = 'tanks_face_down', // Dead again, must wait
  IN_BATTLE = 'in_battle', // Currently in a battle
  ON_BOARD = 'on_board', // Survived battle, still in territory
  CAPTURED = 'captured', // Captured by Harkonnen
}
```

**Analysis**:
- `ON_BOARD` represents leaders "still in Territories" per the rule
- `LEADER_POOL` represents the Leader Pool where leaders are available
- The transition from `ON_BOARD` → `LEADER_POOL` implements the rule

## Verification Checklist

- [x] Leaders used in battle are marked with `ON_BOARD` location
- [x] Leaders that survive battles remain with `ON_BOARD` location
- [x] Leaders that are killed move to TANKS (not ON_BOARD)
- [x] After all battles, `cleanup()` is called
- [x] `resetLeaderTurnState()` is called for all factions
- [x] Leaders with `ON_BOARD` location are changed to `LEADER_POOL`
- [x] Killed leaders (in TANKS) are not affected
- [x] All factions are processed (not just specific ones)

## Edge Cases Verified

### 1. Killed Leaders Are Excluded ✅

**Scenario**: Leader is killed by a weapon during battle

**Expected**: Leader should NOT be returned to pool (should remain in TANKS)

**Actual**: 
- `killLeader()` sets location to `TANKS_FACE_UP` or `TANKS_FACE_DOWN`
- `resetLeaderTurnState()` only changes `ON_BOARD` → `LEADER_POOL`
- Killed leaders remain in TANKS ✅

### 2. Multiple Battles in Same Territory ✅

**Scenario**: Leader fights multiple battles in the same territory (DEDICATED LEADER rule)

**Expected**: Leader should remain `ON_BOARD` until all battles complete, then return to pool

**Actual**:
- Leader stays `ON_BOARD` throughout multiple battles
- `cleanup()` is only called after ALL battles complete
- Leader is then returned to pool ✅

### 3. Leaders in Different Territories ✅

**Scenario**: Player has leaders in multiple territories after battles

**Expected**: All surviving leaders should be collected and returned to pool

**Actual**:
- `resetLeaderTurnState()` processes ALL leaders for the faction
- Any leader with `ON_BOARD` location is returned to pool
- Works regardless of which territory they're in ✅

### 4. Traitor Revealed Leaders ✅

**Scenario**: Leader is returned to pool immediately when traitor is revealed

**Expected**: Leader should already be in pool, not returned again

**Actual**:
- When traitor is revealed, `returnLeaderToPool()` is called immediately
- This sets location to `LEADER_POOL` and `usedThisTurn: false`
- `resetLeaderTurnState()` sees location is already `LEADER_POOL`, so no change
- No double-return occurs ✅

### 5. Lasgun/Shield Explosion ✅

**Scenario**: Both leaders are killed in lasgun/shield explosion

**Expected**: Leaders should NOT be returned to pool (they're dead)

**Actual**:
- `killLeader()` is called with `allowProtected=true` to bypass protection
- Leaders are moved to TANKS
- `resetLeaderTurnState()` doesn't affect TANKS locations
- Leaders remain in TANKS ✅

## Code Flow Summary

1. **Battle Starts**: Leader is used → `markLeaderUsed()` → location = `ON_BOARD`
2. **Battle Resolves**: 
   - If leader survives → location remains `ON_BOARD`
   - If leader is killed → `killLeader()` → location = `TANKS_FACE_UP`/`TANKS_FACE_DOWN`
3. **All Battles Complete**: Phase manager calls `cleanup()`
4. **Leader Return**: `resetLeaderTurnState()` for each faction
   - Leaders with `ON_BOARD` → `LEADER_POOL`
   - Leaders in TANKS → unchanged
5. **Result**: Surviving leaders are now in Leader Pool, available for future use

## Related Rules

### SURVIVING LEADERS (battle.md line 23)

This rule states that surviving leaders remain in the territory and are protected from game effects. The implementation correctly:
- Sets location to `ON_BOARD` when leader survives
- Protects `ON_BOARD` leaders from storm, sandworms, etc. (see `killLeader()` protection check)
- Returns them to pool only after all battles (Leader Return)

### DEDICATED LEADER (battle.md line 13)

Leaders can fight multiple times in the same territory. The implementation supports this:
- Leader remains `ON_BOARD` after first battle
- Can be used again in same territory (if still `ON_BOARD`)
- Only returned to pool after all battles complete

## Conclusion

The Leader Return rule is **correctly and completely implemented**. The code:

1. ✅ Correctly identifies leaders "still in Territories" (location === ON_BOARD)
2. ✅ Returns them to Leader Pool after all battles complete
3. ✅ Excludes killed leaders (they're in TANKS, not ON_BOARD)
4. ✅ Handles all factions uniformly
5. ✅ Executes at the correct time (cleanup after all battles)

The implementation follows the rule exactly: "After all battles have been fought, players collect any of their leaders used in battle still in Territories adding them to their Leader Pool."


