# Rule 12: Losing Consequences Verification

## Rule Reference
**Source**: `handwritten-rules/battle.md` line 24

**Rule Text**:
> LOSING: The losing player loses all the Forces they had in the Territory to the Tleilaxu Tanks and must discard every Treachery Card they used in their Battle Plan. Note that the loser does not lose their leader as a result of losing the battle.

## Verification Results

### ✅ 1. Losing Player Loses All Forces to Tleilaxu Tanks

**Status**: **CORRECTLY IMPLEMENTED**

**Implementation Location**: `src/lib/game/phases/handlers/battle.ts` lines 1345-1366

```1345:1366:src/lib/game/phases/handlers/battle.ts
    // ===========================================================================
    // FORCE LOSSES
    // ===========================================================================
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
- The code correctly identifies the losing player from `result.loser`
- Finds all forces (both regular and elite) in the battle territory and sector
- Sends ALL forces to Tleilaxu Tanks using `sendForcesToTanks()` with separate counts for regular and elite forces
- This matches the rule requirement: "loses all the Forces they had in the Territory"

---

### ✅ 2. Must Discard Every Treachery Card Used

**Status**: **CORRECTLY IMPLEMENTED**

**Implementation Location**: 
- Card discard determination: `src/lib/game/rules/combat.ts` lines 1034-1054
- Card discarding execution: `src/lib/game/phases/handlers/battle.ts` lines 1517-1531

**Card Discard Logic** (`combat.ts`):
```1034:1054:src/lib/game/rules/combat.ts
  // Determine which cards to keep/discard
  const cardsToDiscard: string[] = [];
  const cardsToKeep: string[] = [];

  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (!isWinner || weaponDef?.discardAfterUse) {
      cardsToDiscard.push(plan.weaponCardId);
    } else {
      cardsToKeep.push(plan.weaponCardId);
    }
  }

  if (plan.defenseCardId) {
    const defenseDef = getTreacheryCardDefinition(plan.defenseCardId);
    if (!isWinner || defenseDef?.discardAfterUse) {
      cardsToDiscard.push(plan.defenseCardId);
    } else {
      cardsToKeep.push(plan.defenseCardId);
    }
  }
```

**Card Discarding Execution** (`battle.ts`):
```1517:1531:src/lib/game/phases/handlers/battle.ts
    // Discard used treachery cards
    const discardCards = (faction: Faction, cardIds: string[]) => {
      for (const cardId of cardIds) {
        newState = discardTreacheryCard(newState, faction, cardId);
        const cardDef = getTreacheryCardDefinition(cardId);
        events.push({
          type: 'CARD_DISCARDED',
          data: { faction, cardId, cardName: cardDef?.name },
          message: `${faction} discards ${cardDef?.name || cardId}`,
        });
      }
    };

    discardCards(battle.aggressor, result.aggressorResult.cardsToDiscard);
    discardCards(battle.defender, result.defenderResult.cardsToDiscard);
```

**Verification**:
- In `buildSideResult()`, when `isWinner` is `false` (loser), ALL cards (weapon and defense) are added to `cardsToDiscard` regardless of their `discardAfterUse` property
- The `applyBattleResult()` function then discards all cards in the `cardsToDiscard` array for both players
- This correctly implements: "must discard every Treachery Card they used in their Battle Plan"

---

### ✅ 3. Does NOT Lose Leader as Result of Losing

**Status**: **CORRECTLY IMPLEMENTED**

**Implementation Location**: `src/lib/game/phases/handlers/battle.ts` lines 1300-1340

```1300:1340:src/lib/game/phases/handlers/battle.ts
    // ===========================================================================
    // LEADER DEATHS FROM WEAPONS
    // ===========================================================================
    // IMPORTANT: Leaders can ONLY die from weapons (or lasgun-shield explosion), NOT from losing the battle.
    // The resolveBattle function in combat.ts correctly calculates leaderKilled flags based on
    // weapon/defense resolution. We handle both sides' leader deaths here, regardless of who won.
    // Dead leaders don't contribute to battle strength (already accounted for in resolveBattle).

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

      // Check for Prison Break after leader death
      newState = this.checkPrisonBreak(newState, battle.aggressor, events);
    }

    // Handle defender's leader death from weapons
    if (result.defenderResult.leaderKilled && battle.defenderPlan?.leaderId) {
      newState = killLeader(newState, battle.defender, battle.defenderPlan.leaderId);
      events.push({
        type: 'LEADER_KILLED',
        data: {
          faction: battle.defender,
          leaderId: battle.defenderPlan.leaderId,
          killedBy: 'weapon'
        },
        message: `${battle.defender}'s leader ${battle.defenderPlan.leaderId} killed by weapon`,
      });

      // Check for Prison Break after leader death
      newState = this.checkPrisonBreak(newState, battle.defender, events);
    }
```

**Verification**:
- Leaders are ONLY killed when `result.aggressorResult.leaderKilled` or `result.defenderResult.leaderKilled` is `true`
- These flags are set based on weapon/defense resolution in `combat.ts`, NOT based on who won/lost the battle
- The code explicitly documents: "Leaders can ONLY die from weapons (or lasgun-shield explosion), NOT from losing the battle"
- There is NO code that kills the loser's leader simply because they lost
- Both aggressor and defender leaders can die from weapons, regardless of battle outcome
- This correctly implements: "Note that the loser does not lose their leader as a result of losing the battle"

**Historical Note**: A backup file (`battle.ts.backup-traitor`) shows the old incorrect implementation (lines 1153-1163) where the loser's leader was always killed. This bug has been fixed in the current implementation.

---

## Summary

All three requirements from `handwritten-rules/battle.md` line 24 are **CORRECTLY IMPLEMENTED**:

1. ✅ **Forces Loss**: Losing player loses ALL forces in the territory to Tleilaxu Tanks
2. ✅ **Card Discard**: Losing player must discard EVERY Treachery Card used
3. ✅ **Leader Protection**: Losing player does NOT lose their leader as a result of losing

The implementation correctly distinguishes between:
- **Leader death from weapons** (handled via `leaderKilled` flags)
- **Leader survival after losing** (no automatic leader death for losers)

This matches the Dune rules where leaders can only die from weapons or special effects (like lasgun-shield explosions), never from simply losing a battle.


