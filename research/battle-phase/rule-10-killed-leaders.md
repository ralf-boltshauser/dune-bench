# Rule 10: Killed Leaders - Implementation Verification

**Source Rule**: `handwritten-rules/battle.md` line 22

**Rule Text**:
> KILLED LEADERS: Any leaders killed are immediately Placed face up in the Tleilaxu Tanks. The winner immediately receives their value (including their own leader, if killed) in spice from the Spice Bank. -1.05.04 -3.02.02

## Verification Summary

✅ **IMPLEMENTATION IS CORRECT**

Both requirements from the rule are properly implemented:
1. Killed leaders are placed face up in Tleilaxu Tanks
2. Winner receives spice value for all killed leaders (including their own)

---

## 1. Face Up Placement in Tleilaxu Tanks

### Implementation Location
- **File**: `src/lib/game/state/mutations.ts`
- **Function**: `killLeader()` (lines 446-480)

### Code Reference
```466:474:src/lib/game/state/mutations.ts
      return {
        ...l,
        location: l.hasBeenKilled
          ? LeaderLocation.TANKS_FACE_DOWN
          : LeaderLocation.TANKS_FACE_UP,
        hasBeenKilled: true,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
```

### Verification
✅ **CORRECT**: The implementation correctly places leaders face up (`TANKS_FACE_UP`) on their first death. Leaders that have been killed before (`hasBeenKilled === true`) are placed face down (`TANKS_FACE_DOWN`), which aligns with revival rules (leaders killed again go face down per `dune-rules/revival.md` line 37).

### Leader Location Enum
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

### Usage in Battle Handler
Leaders are killed in the battle handler when weapons kill them:

```1308:1320:src/lib/game/phases/handlers/battle.ts
    // Handle aggressor's leader death from weapons
    if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
      newState = killLeader(newState, battle.aggressor, battle.aggressorPlan.leaderId);
      events.push({
        type: 'LEADER_KILLED',
        data: {
          faction: battle.aggressor,
          leaderId: battle.aggressorPlan.leaderId,
          killedBy: 'weapon'
        },
        message: `${battle.aggressor}'s leader ${battle.aggressorPlan.leaderId} killed by weapon`,
      });
```

---

## 2. Winner Receives Spice for All Killed Leaders

### Implementation Location
- **File**: `src/lib/game/rules/combat.ts`
- **Function**: `calculateLeaderSpicePayouts()` (lines 1087-1118)

### Code Reference
```1087:1118:src/lib/game/rules/combat.ts
function calculateLeaderSpicePayouts(
  aggressorResult: BattleSideResult,
  defenderResult: BattleSideResult,
  winner: Faction
): { faction: Faction; amount: number; reason: string }[] {
  const payouts: { faction: Faction; amount: number; reason: string }[] = [];

  // Winner receives spice for all killed leaders (including their own)
  if (aggressorResult.leaderKilled && aggressorResult.leaderUsed) {
    const leader = getLeaderDefinition(aggressorResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  if (defenderResult.leaderKilled && defenderResult.leaderUsed) {
    const leader = getLeaderDefinition(defenderResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  return payouts;
}
```

### Verification
✅ **CORRECT**: The function checks both the aggressor's and defender's leaders. If either leader is killed, the payout is added to the `winner` faction, not the leader's owner. This means:
- If the aggressor's leader is killed → winner gets spice (even if winner is aggressor)
- If the defender's leader is killed → winner gets spice (even if winner is defender)
- If both leaders are killed → winner gets spice for both

This correctly implements the rule: "The winner immediately receives their value (including their own leader, if killed) in spice from the Spice Bank."

### Spice Application
The payouts are applied in the battle handler:

```1502:1515:src/lib/game/phases/handlers/battle.ts
    // Apply spice payouts for killed leaders
    // Winner receives spice equal to the strength of all killed leaders
    for (const payout of result.spicePayouts) {
      newState = addSpice(newState, payout.faction, payout.amount);
      events.push({
        type: 'SPICE_COLLECTED',
        data: {
          faction: payout.faction,
          amount: payout.amount,
          reason: payout.reason,
        },
        message: `${payout.faction} receives ${payout.amount} spice: ${payout.reason}`,
      });
    }
```

### Leader Strength Values
Leaders have strength values defined in their definitions (e.g., Paul Atreides = 5, Stilgar = 7), and these values are correctly used for spice payouts via `getLeaderDefinition()` which returns the `strength` field.

---

## Edge Cases Verified

### 1. Both Leaders Killed
✅ If both aggressor and defender leaders are killed, the winner receives spice for both (tested in `calculateLeaderSpicePayouts` - both conditions can be true).

### 2. Winner's Own Leader Killed
✅ If the winner's own leader is killed, they still receive spice for it (the payout goes to `winner` regardless of which side's leader was killed).

### 3. Only Opponent's Leader Killed
✅ If only the opponent's leader is killed, the winner receives spice for it (standard case).

### 4. No Leaders Killed
✅ If no leaders are killed, no spice payouts are generated (both conditions in `calculateLeaderSpicePayouts` would be false).

### 5. Leader Killed Again (Face Down)
✅ Leaders killed for the second time go face down (`TANKS_FACE_DOWN`), but the spice payout logic still applies (it checks `leaderKilled` flag, not `hasBeenKilled`).

---

## Related Rules

- **Revival Rules** (`dune-rules/revival.md`): Face up leaders can be revived, face down leaders must wait
- **Traitor Rules** (`handwritten-rules/battle.md` line 27): When traitor is revealed, the traitorous leader is placed in Tanks and the revealer receives their strength in spice (separate from this rule)
- **Lasgun/Shield Explosion** (`handwritten-rules/battle.md` line 208): Both leaders die, no spice is paid (handled separately in battle handler)

---

## Conclusion

The implementation of Rule 10 (Killed Leaders) is **fully correct** and matches the requirements from `handwritten-rules/battle.md` line 22:

1. ✅ Killed leaders are placed face up in Tleilaxu Tanks (via `killLeader()` → `TANKS_FACE_UP`)
2. ✅ Winner receives spice value for all killed leaders, including their own (via `calculateLeaderSpicePayouts()` → all payouts go to `winner`)

No changes needed.





