# Rule 13: Winning Consequences Verification

**Source**: `handwritten-rules/battle.md` line 25

**Rule Text**:
> WINNING: The winning player loses only the number of Forces they dialed on the Battle Wheel. These Forces are Placed in the Tleilaxu Tanks. The winning player may discard any of the cards they played; that player may keep any cards that do not say "Discard after use". -1.14.12

## Verification Summary

### ✅ Forces Loss - CORRECTLY IMPLEMENTED

**Requirement**: Winning player loses only the number of Forces dialed on Battle Wheel to Tleilaxu Tanks.

**Implementation**: 
- Location: `src/lib/game/phases/handlers/battle.ts` lines 1377-1416
- Code: `const winnerLosses = winnerPlan?.forcesDialed ?? 0;`
- Forces are correctly sent to Tleilaxu Tanks using `sendForcesToTanks()` function
- Elite forces (Sardaukar, Fedaykin) are properly handled with loss distribution

**Status**: ✅ **VERIFIED** - Implementation matches rule requirement.

---

### ⚠️ Card Discarding - PARTIALLY IMPLEMENTED

**Requirement**: "The winning player may discard any of the cards they played"

**Implementation**:
- Location: `src/lib/game/rules/combat.ts` lines 1034-1054
- Logic in `buildSideResult()`:
  ```typescript
  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (!isWinner || weaponDef?.discardAfterUse) {
      cardsToDiscard.push(plan.weaponCardId);
    } else {
      cardsToKeep.push(plan.weaponCardId);
    }
  }
  ```

**Issue**: 
The rule states "may discard any of the cards they played", which implies the winner should have a **choice** to discard cards. However, the current implementation:
- Automatically discards cards with `discardAfterUse: true` ✅
- Automatically keeps cards without `discardAfterUse` ⚠️

The implementation does not provide the winner with the option to discard cards that don't say "Discard after use". The word "may" suggests optionality, but the code makes an automatic decision.

**Status**: ⚠️ **PARTIALLY VERIFIED** - Cards are correctly categorized, but winner lacks choice to discard optional cards.

---

### ✅ Card Keeping - CORRECTLY IMPLEMENTED

**Requirement**: "that player may keep any cards that do not say 'Discard after use'"

**Implementation**:
- Location: `src/lib/game/rules/combat.ts` lines 1038-1054
- Cards without `discardAfterUse: true` are placed in `cardsToKeep` array
- Location: `src/lib/game/phases/handlers/battle.ts` lines 1517-1531
- Only `cardsToDiscard` are processed; `cardsToKeep` are left in hand (not discarded)

**Card Definitions**:
- Most weapon/defense cards have `discardAfterUse: false` (see `src/lib/game/data/treachery-cards.ts`)
- Cards like Cheap Hero, Hajr, Tleilaxu Ghola, etc. have `discardAfterUse: true`

**Status**: ✅ **VERIFIED** - Cards without "Discard after use" are correctly kept in hand.

---

## Code References

### Forces Loss Implementation
```1377:1416:src/lib/game/phases/handlers/battle.ts
    const winnerLosses = winnerPlan?.forcesDialed ?? 0;
    if (winnerLosses > 0) {
      const winnerForces = getFactionState(newState, winner).forces.onBoard.find(
        (f) =>
          f.territoryId === battle.territoryId && f.sector === battle.sector
      );
      if (winnerForces) {
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

          // Log the loss distribution for clarity
          events.push({
            type: 'BATTLE_RESOLVED',
            data: {
              faction: winner,
              lossesDialed: winnerLosses,
              regularLost: distribution.regularLost,
              eliteLost: distribution.eliteLost,
            },
            message: `${winner} loses ${distribution.regularLost} regular + ${distribution.eliteLost} elite forces (${winnerLosses} losses)`,
          });
        }
      }
    }
```

### Card Discard/Keep Logic
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

### Card Discarding Execution
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

## Recommendations

1. **Forces Loss**: ✅ No changes needed - correctly implemented.

2. **Card Discarding**: Consider adding player choice mechanism:
   - After battle resolution, if winner has cards in `cardsToKeep`, prompt winner to choose which cards to discard (if any)
   - This would fully implement the "may discard any" clause
   - However, this may be acceptable as-is if the game design assumes automatic optimal play (keeping all non-discard cards)

3. **Card Keeping**: ✅ No changes needed - correctly implemented.

## Conclusion

The implementation correctly handles:
- ✅ Winner loses only dialed forces to Tleilaxu Tanks
- ✅ Cards with "Discard after use" are automatically discarded
- ✅ Cards without "Discard after use" are kept in hand

The implementation partially handles:
- ⚠️ Winner's optional choice to discard cards (currently automatic - keeps all non-discard cards)

The current implementation is functionally correct for the mandatory aspects of the rule. The optional discarding choice is not implemented, but this may be acceptable depending on game design philosophy (automatic optimal play vs. player choice).


