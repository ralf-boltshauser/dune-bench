# Bene Gesserit Karama Implementation

## Summary

Implemented the Bene Gesserit special ability where they can use any worthless card as if it were a Karama card.

**Rule Reference**: `handwritten-rules/battle.md` line 97:
> "KARAMA: You may use any worthless card as if it were a Karama Card.✷"

## Files Created

### `/src/lib/game/rules/karama.ts`
New file containing helper functions for Karama card validation:

- **`canUseKarama(state, faction, cardId?)`** - Check if a faction can use Karama functionality
  - Returns `true` if faction has actual Karama OR (for BG only) has worthless cards
  - Can optionally check a specific card ID

- **`getKaramaCards(state, faction)`** - Get all cards usable as Karama for a faction
  - For most factions: returns actual Karama cards only
  - For Bene Gesserit: returns Karama cards + all worthless cards

- **`isKaramaCardForFaction(cardId, faction)`** - Check if a specific card can function as Karama
  - Faction-aware validation (BG gets special treatment)

- **`getKaramaCardDisplayName(cardId, faction)`** - Get display name for Karama-usable cards
  - For actual Karama: returns "Karama"
  - For BG worthless: returns "Card Name (as Karama)"

## Files Modified

### `/src/lib/game/rules/index.ts`
- Added exports for the new Karama helper functions

### `/src/lib/game/state/queries.ts`
- Updated `hasKaramaCard()` docstring to note that BG can use worthless cards
- Added reference to use `canUseKarama()` from `rules/karama.ts` for full validation

## Test File

### `/src/lib/game/test-bg-karama.ts`
Comprehensive test suite covering:
1. BG with no Karama or worthless cards (should fail)
2. BG with single worthless card (should work)
3. BG with multiple worthless cards (all should work)
4. BG with actual Karama card (should work)
5. Specific card validation with `canUseKarama(cardId)`
6. Other factions with worthless cards (should NOT work as Karama)
7. Other factions with actual Karama (should work normally)

**Test Results**: All tests pass ✅

## Usage Example

```typescript
import { canUseKarama, getKaramaCards } from '@/lib/game/rules/karama';

// Check if BG can use Karama (any Karama or worthless card)
if (canUseKarama(state, Faction.BENE_GESSERIT)) {
  // Get all usable Karama cards (includes worthless for BG)
  const karamaCards = getKaramaCards(state, Faction.BENE_GESSERIT);
  console.log(`BG can use: ${karamaCards.join(', ')}`);
}

// Check if a specific worthless card works as Karama for BG
if (canUseKarama(state, Faction.BENE_GESSERIT, 'baliset')) {
  console.log('BG can use Baliset as Karama!');
}

// Check if worthless card works as Karama for another faction
if (canUseKarama(state, Faction.ATREIDES, 'baliset')) {
  // This will be false - only BG can use worthless as Karama
  console.log('Atreides can use Baliset as Karama');
}
```

## Integration Points

These helper functions should be used wherever Karama validation is needed:

1. **Battle phase tools** - When players want to use Karama to cancel abilities
2. **Bidding phase** - When using Karama to bid more than available spice
3. **Any faction-specific ability cancellation** - Karama can cancel faction powers

## Key Design Decisions

1. **Separation of concerns**: Created dedicated `karama.ts` file rather than adding to `queries.ts` or `mutations.ts`
2. **Backward compatibility**: Kept existing `hasKaramaCard()` function unchanged, only added documentation
3. **Faction-aware validation**: All functions take faction as parameter to handle BG special case
4. **Display helpers**: Included `getKaramaCardDisplayName()` for UI consistency

## Next Steps

Future work to integrate this implementation:
1. Update battle phase tools to use `canUseKarama()` and `getKaramaCards()`
2. Update bidding phase to validate Karama usage with new helpers
3. Create Karama action tools if they don't exist yet
4. Add UI indicators showing BG can use worthless as Karama
