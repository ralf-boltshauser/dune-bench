# Traitor Mechanics Verification

## Rule Reference
**Source**: `handwritten-rules/battle.md` lines 26-29

### Rules to Verify:
1. **Line 26**: Traitor can be called against any Active Leader (even if not originally Active)
2. **Line 27**: When traitor is revealed:
   - Revealer wins battle immediately
   - Revealer loses nothing
   - Revealer's leader returns to pool
   - Traitorous leader goes to Tanks
   - Spice is paid (traitorous leader's strength)
   - One-time abilities are NOT used (Kwisatz Haderach, Captured leaders)
   - One-time cards may be kept or discarded by winner
3. **Line 28**: Loser loses all Forces and discards all cards played
4. **Line 29**: TWO TRAITORS scenario: Both lose everything, no spice paid

---

## Implementation Verification

### ✅ 1. Traitor Can Be Called Against Any Active Leader

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 898-920

The traitor check logic uses the leader's `definitionId` (original identity) rather than current ownership:

```857:920:src/lib/game/phases/handlers/battle.ts
// NO LOYALTY (battle.md line 156): "A captured leader used in battle may be called traitor
// with the matching Traitor Card!" The traitor check uses leaderId which is the leader's
// definitionId (original identity), not current ownership. This means captured leaders can
// be called as traitors by anyone holding their matching traitor card.
const opponentLeader = opponentPlan?.leaderId;
const hasTraitor =
  opponentLeader &&
  factionState.traitors.some((t) => t.leaderId === opponentLeader);
```

**Verification**:
- ✅ Works for normal Active Leaders
- ✅ Works for captured leaders (NO LOYALTY rule - see `NO_LOYALTY_IMPLEMENTATION.md`)
- ✅ Works for leaders that became Active after game start

**Note**: There is one exception - leaders protected by Kwisatz Haderach cannot be called as traitors (Atreides Loyalty rule, line 61 of battle.md). This is correctly implemented at lines 923-932.

---

### ✅ 2. Revealer Wins Battle Immediately and Loses Nothing

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 867-943

```886:903:src/lib/game/rules/combat.ts
// Winner loses nothing, loser loses everything
const winnerResult: BattleSideResult = {
  faction: winner,
  forcesDialed: winnerPlan.forcesDialed,
  forcesLost: 0, // Winner loses nothing
  leaderUsed: winnerPlan.leaderId,
  leaderKilled: false,
  leaderStrength: getLeaderStrength(winnerPlan),
  kwisatzHaderachUsed: winnerPlan.kwisatzHaderachUsed,
  weaponPlayed: winnerPlan.weaponCardId,
  weaponEffective: false,
  defensePlayed: winnerPlan.defenseCardId,
  defenseEffective: false,
  cardsToDiscard: [], // Winner can keep or discard
  cardsToKeep: [winnerPlan.weaponCardId, winnerPlan.defenseCardId].filter(
    (c): c is string => !!c
  ),
  total: 0, // Doesn't matter
};
```

**Verification**:
- ✅ `forcesLost: 0` - Winner loses no forces
- ✅ Battle resolution immediately sets winner based on `traitorCalledBy`
- ✅ No normal battle calculation occurs when traitor is revealed

---

### ✅ 3. Revealer's Leader Returns to Pool

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 1472-1490

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

**Verification**:
- ✅ When `result.traitorRevealed` is true, leader is returned to pool via `returnLeaderToPool()`
- ✅ Leader's `usedThisTurn` is set to `false` (see `src/lib/game/state/mutations.ts` lines 549-568)
- ✅ Leader becomes available again in the same Phase

---

### ✅ 4. Traitorous Leader Goes to Tanks and Spice is Paid

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 905-922 and 934-940

```905:922:src/lib/game/rules/combat.ts
const loserResult: BattleSideResult = {
  faction: loser,
  forcesDialed: loserPlan.forcesDialed,
  forcesLost: loserForces, // ALL forces
  leaderUsed: loserPlan.leaderId,
  leaderKilled: true, // Traitor leader is killed
  leaderStrength: 0,
  kwisatzHaderachUsed: false,
  weaponPlayed: loserPlan.weaponCardId,
  weaponEffective: false,
  defensePlayed: loserPlan.defenseCardId,
  defenseEffective: false,
  cardsToDiscard: [loserPlan.weaponCardId, loserPlan.defenseCardId].filter(
    (c): c is string => !!c
  ),
  cardsToKeep: [],
  total: 0,
};
```

```934:940:src/lib/game/rules/combat.ts
spicePayouts: [
  {
    faction: winner,
    amount: traitorLeader?.strength ?? 0,
    reason: `Traitor ${traitorLeaderId} revealed`,
  },
],
```

**Verification**:
- ✅ `leaderKilled: true` - Traitor leader is marked as killed
- ✅ Leader is sent to Tanks via `killLeader()` in `applyBattleResult()` (line 1309-1323)
- ✅ Spice payout equals traitor leader's strength
- ✅ Spice is paid to the revealer (winner)

---

### ✅ 5. One-Time Abilities Are NOT Used

**Status**: ✅ **CORRECTLY IMPLEMENTED** (Fixed)

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 1838-1846

**Rule**: "One time use abilities may be considered not used for this instance (Ex: Kwisatz Haderach, Captured leaders)."

**Implementation**:
```1838:1846:src/lib/game/phases/handlers/battle.ts
// Mark Kwisatz Haderach as used if applicable
// Rule: "One time use abilities may be considered not used for this instance (Ex: Kwisatz Haderach, Captured leaders)."
// When traitor is revealed, one-time abilities are NOT used.
if (winnerPlan?.kwisatzHaderachUsed && winner === Faction.ATREIDES && !result.traitorRevealed) {
  newState = markKwisatzHaderachUsed(newState, battle.territoryId);
  events.push({
    type: 'KWISATZ_HADERACH_USED',
    data: { territory: battle.territoryId },
    message: 'Atreides uses Kwisatz Haderach (+2 strength)',
  });
}
```

**Verification**:
- ✅ Checks `!result.traitorRevealed` before marking KH as used
- ✅ When traitor is revealed, Kwisatz Haderach is NOT marked as used
- ✅ The `resolveTraitorBattle()` function correctly sets `kwisatzHaderachUsed: false` for the loser (line 912)

**Captured Leaders**: The captured leader return logic is handled correctly - captured leaders are returned to their original owner after battle if not killed (see `returnCapturedLeader()` in `src/lib/game/state/mutations.ts`). When traitor is revealed, the captured leader (if it's the traitor) is killed, so it goes to Tanks instead.

---

### ✅ 6. One-Time Cards May Be Kept or Discarded by Winner

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 898-901

```898:901:src/lib/game/rules/combat.ts
cardsToDiscard: [], // Winner can keep or discard
cardsToKeep: [winnerPlan.weaponCardId, winnerPlan.defenseCardId].filter(
  (c): c is string => !!c
),
```

**Verification**:
- ✅ Winner's cards are placed in `cardsToKeep`, not `cardsToDiscard`
- ✅ Winner can choose to keep or discard cards (implementation allows keeping)
- ✅ Cards with "Discard after use" are handled by the discard logic checking card definitions

---

### ✅ 7. Loser Loses All Forces and Discards All Cards

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 905-922 and `src/lib/game/phases/handlers/battle.ts` lines 1345-1366

```905:922:src/lib/game/rules/combat.ts
const loserResult: BattleSideResult = {
  faction: loser,
  forcesDialed: loserPlan.forcesDialed,
  forcesLost: loserForces, // ALL forces
  leaderUsed: loserPlan.leaderId,
  leaderKilled: true, // Traitor leader is killed
  leaderStrength: 0,
  kwisatzHaderachUsed: false,
  weaponPlayed: loserPlan.weaponCardId,
  weaponEffective: false,
  defensePlayed: loserPlan.defenseCardId,
  defenseEffective: false,
  cardsToDiscard: [loserPlan.weaponCardId, loserPlan.defenseCardId].filter(
    (c): c is string => !!c
  ),
  cardsToKeep: [],
  total: 0,
};
```

```1345:1366:src/lib/game/phases/handlers/battle.ts
// Loser loses all forces (send separately to maintain force type counts)
const loser = result.loser;
if (!loser) {
  // TWO TRAITORS case already handled, safety check
  return newState;
}
const loserForces = getFactionState(newState, loser).forces.onBoard.find(
  (f) => f.territoryId === battle.territoryId && f.sector === battle.sector
);
if (loserForces) {
  const { regular, elite } = loserForces.forces;
  if (regular > 0 || elite > 0) {
    newState = sendForcesToTanks(
      newState,
      loser,
      battle.territoryId,
      battle.sector,
      regular,
      elite
    );
  }
}
```

**Verification**:
- ✅ `forcesLost: loserForces` - All forces in territory are lost
- ✅ `cardsToDiscard` includes all cards played (weapon and defense)
- ✅ Forces are sent to Tanks via `sendForcesToTanks()`
- ✅ Cards are discarded via `discardTreacheryCard()` (line 1520)

---

### ✅ 8. TWO TRAITORS Scenario

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 954-1018 and `src/lib/game/phases/handlers/battle.ts` lines 1097-1110

**Detection Logic**:
```1097:1110:src/lib/game/phases/handlers/battle.ts
// Check for TWO TRAITORS scenario
if (traitorCallers.length === 2) {
  // Both sides called traitor - TWO TRAITORS rule applies
  this.context.currentBattle!.traitorCalled = true;
  this.context.currentBattle!.traitorCalledBy = null; // Both called, so null
  this.context.currentBattle!.traitorCallsByBothSides = true;

  events.push({
    type: 'TWO_TRAITORS',
    data: {
      callers: traitorCallers,
    },
    message: 'TWO TRAITORS! Both leaders are traitors for each other.',
  });
}
```

**Resolution Logic**:
```954:1018:src/lib/game/rules/combat.ts
export function resolveTwoTraitorsBattle(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan
): BattleResult {
  const aggressorForces = getForceCountInTerritory(state, aggressor, territoryId);
  const defenderForces = getForceCountInTerritory(state, defender, territoryId);

  // Both sides lose ALL forces
  const aggressorResult: BattleSideResult = {
    faction: aggressor,
    forcesDialed: aggressorPlan.forcesDialed,
    forcesLost: aggressorForces, // ALL forces lost
    leaderUsed: aggressorPlan.leaderId,
    leaderKilled: !!aggressorPlan.leaderId, // Both leaders are killed
    leaderStrength: 0,
    kwisatzHaderachUsed: aggressorPlan.kwisatzHaderachUsed,
    weaponPlayed: aggressorPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: aggressorPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [aggressorPlan.weaponCardId, aggressorPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  const defenderResult: BattleSideResult = {
    faction: defender,
    forcesDialed: defenderPlan.forcesDialed,
    forcesLost: defenderForces, // ALL forces lost
    leaderUsed: defenderPlan.leaderId,
    leaderKilled: !!defenderPlan.leaderId, // Both leaders are killed
    leaderStrength: 0,
    kwisatzHaderachUsed: false,
    weaponPlayed: defenderPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: defenderPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [defenderPlan.weaponCardId, defenderPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  return {
    winner: null, // Special case - no winner
    loser: null, // Special case - no loser
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: true,
    traitorRevealedBy: null, // Both revealed, so null
    lasgunjShieldExplosion: false,
    twoTraitors: true, // New flag to indicate TWO TRAITORS scenario
    aggressorResult,
    defenderResult,
    spicePayouts: [], // NO spice for anyone
    summary: 'TWO TRAITORS! Both leaders are traitors. Both sides lose all forces and leaders. No spice paid.',
  };
}
```

**Verification**:
- ✅ Detects when both sides call traitor (`traitorCallers.length === 2`)
- ✅ Both sides lose ALL forces (`forcesLost: aggressorForces` / `defenderForces`)
- ✅ Both leaders are killed (`leaderKilled: true` for both)
- ✅ All cards are discarded (`cardsToDiscard` includes all cards, `cardsToKeep: []`)
- ✅ No spice paid (`spicePayouts: []`)
- ✅ No winner/loser (`winner: null, loser: null`)

---

## Additional Verification

### ✅ Kwisatz Haderach Traitor Protection

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 1214-1231 and 1269-1283

**Rule**: "ATREIDES LOYALTY: A leader accompanied by Kwisatz Haderach cannot turn traitor." (battle.md line 61)

**Implementation for Direct Traitor Calls**:
```1214:1231:src/lib/game/phases/handlers/battle.ts
const opponentUsedKH =
  opponent === Faction.ATREIDES &&
  opponentPlan?.kwisatzHaderachUsed === true;

if (opponentUsedKH) {
  // Kwisatz Haderach protects the leader from being called as traitor
  events.push({
    type: 'TRAITOR_BLOCKED',
    data: {
      faction,
      opponent,
      opponentLeader,
      reason: 'kwisatz_haderach_protection',
    },
    message: `${faction} cannot call traitor on ${opponent}'s leader: protected by Kwisatz Haderach`,
  });
  continue; // Skip this traitor opportunity
}
```

**Implementation for Harkonnen Alliance Traitor Calls**:
```1269:1283:src/lib/game/phases/handlers/battle.ts
const opponentUsedKH =
  allyOpponent === Faction.ATREIDES &&
  opponentPlan?.kwisatzHaderachUsed === true;

if (opponentUsedKH) {
  events.push({
    type: 'TRAITOR_BLOCKED',
    data: {
      faction: Faction.HARKONNEN,
      opponent: allyOpponent,
      opponentLeader,
      reason: 'kwisatz_haderach_protection',
    },
    message: `${Faction.HARKONNEN} cannot call traitor on ${allyOpponent}'s leader for ally: protected by Kwisatz Haderach`,
  });
}
```

**Verification**:
- ✅ Checks if opponent is Atreides AND used Kwisatz Haderach
- ✅ Blocks traitor call when both conditions are true
- ✅ Works for both direct traitor calls and Harkonnen alliance traitor calls
- ✅ Emits `TRAITOR_BLOCKED` event with appropriate message

---

### ✅ Lasgun/Shield Explosion with Traitor

**Status**: ✅ **CORRECTLY HANDLED**

**Location**: `src/lib/game/rules/combat.ts` line 931

```931:931:src/lib/game/rules/combat.ts
lasgunjShieldExplosion: false,
```

**Verification**: When traitor is revealed, `lasgunjShieldExplosion` is explicitly set to `false`. The rule states "regardless of what was played in the Battle Plans (even if a lasgun and shield are Revealed)", so the traitor reveal takes precedence over lasgun/shield explosion.

---

### ✅ Spice Dialing with Traitor (Advanced Rules)

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 1418-1469

**Rule**: "LOSING NOTHING: When a traitor card is played, the winner keeps all spice paid to support their Forces." (battle.md line 46)

```1452:1468:src/lib/game/phases/handlers/battle.ts
} else {
  // Traitor revealed - winner keeps spice, loser pays
  const winnerSpice = winner === battle.aggressor ? aggressorSpice : defenderSpice;
  const loserSpice = winner === battle.aggressor ? defenderSpice : aggressorSpice;

  if (loserSpice > 0) {
    newState = removeSpice(newState, loser, loserSpice);
    events.push({
      type: 'SPICE_COLLECTED',
      data: {
        faction: loser,
        amount: -loserSpice,
        reason: 'Spice dialing payment (loser pays, winner keeps)',
      },
      message: `${loser} pays ${loserSpice} spice to bank. ${winner} keeps their ${winnerSpice} spice (traitor rule).`,
    });
  }
}
```

**Verification**:
- ✅ Winner keeps their spice (not removed from their pool)
- ✅ Loser pays their spice to the bank
- ✅ Only applies in advanced rules mode

---

## Summary

### ✅ Correctly Implemented (8/8):
1. ✅ Traitor can be called against any Active Leader
2. ✅ Revealer wins immediately and loses nothing
3. ✅ Revealer's leader returns to pool
4. ✅ Traitorous leader goes to Tanks and spice is paid
5. ✅ One-time abilities are NOT used when traitor is revealed (Fixed)
6. ✅ One-time cards may be kept or discarded by winner
7. ✅ Loser loses all Forces and discards all cards
8. ✅ TWO TRAITORS scenario handled correctly

### ✅ Additional Verification:
- ✅ **Kwisatz Haderach Traitor Protection**: When Atreides uses Kwisatz Haderach, their leader cannot be called as traitor (correctly implemented at lines 1214-1231 and 1269-1283)

---

## Recommendations

1. ✅ **Fixed**: Kwisatz Haderach bug has been fixed - now checks `!result.traitorRevealed` before marking KH as used
2. **Consider adding a test**: Create a test case for traitor reveal with Kwisatz Haderach to ensure it's not marked as used
3. **Documentation**: The implementation is well-documented with rule references, which is excellent

---

## Code References

- **Traitor Detection**: `src/lib/game/phases/handlers/battle.ts` lines 898-1028
- **Traitor Resolution**: `src/lib/game/rules/combat.ts` lines 867-943
- **Two Traitors Resolution**: `src/lib/game/rules/combat.ts` lines 954-1018
- **Battle Result Application**: `src/lib/game/phases/handlers/battle.ts` lines 1233-1543
- **Leader Return to Pool**: `src/lib/game/state/mutations.ts` lines 549-568

