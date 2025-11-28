# Treachery Card Discarding Implementation

## Summary
Implemented proper discarding of treachery cards after battle in the Battle Phase Handler.

## Problem
The `buildSideResult()` function in `combat.ts` was calculating `cardsToDiscard` and `cardsToKeep`, but the `applyBattleResult()` function in `battle.ts` was never processing them. Used cards were remaining in players' hands instead of being discarded.

## Solution
Added card discarding logic in `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts`:

1. **Import Added** (line ~35): Added `discardTreacheryCard` to imports from `'../../state'`

2. **Card Discarding Logic Added** (lines ~1240-1253): After spice payouts and before logging the battle resolution:
   ```typescript
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

## How It Works
1. After a battle is resolved and spice payouts are distributed
2. The code extracts `cardsToDiscard` arrays from both the aggressor and defender battle results
3. For each card in the discard list:
   - Calls `discardTreacheryCard()` to move the card from hand to discard pile
   - Emits a `CARD_DISCARDED` event with card details
   - Updates the message log with a human-readable discard message
4. The discarding follows the rules calculated in `combat.ts`:
   - Losers discard all cards played
   - Winners keep effective cards (unless marked as `discardAfterUse`)
   - Lasgun/Shield explosions discard all cards from both sides
   - Traitor reveals: winner keeps cards, loser discards all

## Files Modified
1. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts` - Added card discarding logic and import
2. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/types.ts` - Added `CARD_DISCARDED` event type to `PhaseEventType` union

## Dependencies
- Uses existing `discardTreacheryCard()` function from `src/lib/game/state/mutations.ts`
- Uses existing `getTreacheryCardDefinition()` from `src/lib/game/data`
- Consumes `cardsToDiscard` field from `BattleSideResult` interface (defined in `src/lib/game/rules/types.ts`)

## Testing
Type check passed with no new errors introduced in the modified sections.

## Verification
Run the following commands to verify:
```bash
# Check that card discarding is present
grep -n "cardsToDiscard" src/lib/game/phases/handlers/battle.ts

# View the implementation
sed -n '1307,1323p' src/lib/game/phases/handlers/battle.ts

# Type check (should pass)
npx tsc --noEmit src/lib/game/phases/handlers/battle.ts
```
