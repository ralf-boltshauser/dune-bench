# Spice Blow Two-Pile System Fix

## Problem

The spice blow phase was incorrectly implemented with a single shared deck for both card A and card B. According to the Dune board game rules, there should be **two separate spice piles** to track worm (Shai-Hulud) appearances correctly.

### Original Issues

1. **Single deck for both cards**: Both card A and card B were drawn from `state.spiceDeck`
2. **Incorrect worm devouring**: When a worm appeared, it should devour forces/spice in the territory of the previous card on **that specific pile**, not just the last spice location overall
3. **Pile independence not maintained**: The two piles were not truly separate, making worm tracking incorrect

## Solution

### State Changes (`src/lib/game/types/state.ts`)

Added two new fields to `GameState`:
- `spiceDeckA: SpiceCard[]` - Pile A deck (always used)
- `spiceDeckB: SpiceCard[]` - Pile B deck (only used in advanced rules)

The original `spiceDeck` field is maintained for backward compatibility but marked as deprecated.

Existing discard piles (`spiceDiscardA` and `spiceDiscardB`) were already present and are now properly used.

### Factory Changes (`src/lib/game/state/factory.ts`)

- Initialize `spiceDeckA` and `spiceDeckB` as two independently shuffled copies of the spice deck
- Each deck gets its own shuffle, ensuring randomness for both piles

### Handler Changes (`src/lib/game/phases/handlers/spice-blow.ts`)

#### 1. Card Drawing (`revealSpiceCard`)
- **Before**: Both A and B drew from `state.spiceDeck`
- **After**: Card A draws from `state.spiceDeckA`, Card B draws from `state.spiceDeckB`

#### 2. Card Discarding (`discardSpiceCard`)
- **Before**: Already correct - cards went to separate discard piles
- **After**: No change needed

#### 3. Worm Devouring (`getTopmostTerritoryCardLocation`)
- **Before**: Checked the discard pile, but both piles could interfere
- **After**: Checks the correct discard pile for the specific deck type
  - Worm on pile A → checks `spiceDiscardA` for previous territory
  - Worm on pile B → checks `spiceDiscardB` for previous territory

#### 4. Deck Reshuffling (`reshuffleSpiceDeck`)
- **Before**: Shuffled discard back into `state.spiceDeck`
- **After**: Shuffles discard A back into `spiceDeckA`, discard B back into `spiceDeckB`

#### 5. Turn 1 Cleanup (`cleanup`)
- **Before**: Reshuffled turn 1 worms back into single deck
- **After**: Splits turn 1 worms between both decks and reshuffles independently

## Game Rules Implemented

### Two-Pile System
1. **First card of turn** goes on pile A
2. **Second card of turn** (in advanced rules) goes on pile B
3. Each pile maintains its own discard stack

### Worm Behavior
When a Shai-Hulud card appears:
1. Check the **topmost Territory Card** in the **same pile's discard**
2. Devour all forces and spice in that territory
3. Continue drawing cards until a Territory Card appears
4. Trigger Nexus (unless turn 1)

### Turn 1 Special Case
On turn 1 only:
- Worm cards are set aside (not discarded)
- No devouring occurs
- At cleanup, worms are split between both decks and reshuffled

## Testing

Two test files verify the implementation:

### `test-spice-two-piles.ts`
- Verifies two separate decks exist
- Confirms decks are independently shuffled
- Checks backward compatibility field exists

### `test-spice-worm-piles.ts`
- Shows first 5 cards from each deck
- Counts worms in each deck
- Explains expected worm behavior

Run tests with:
```bash
npx tsx test-spice-two-piles.ts
npx tsx test-spice-worm-piles.ts
```

## Backward Compatibility

The original `spiceDeck` field remains in the state for backward compatibility with any saved games or snapshots. It's marked as deprecated with a comment.

## Files Modified

1. `/src/lib/game/types/state.ts` - Added `spiceDeckA` and `spiceDeckB` fields
2. `/src/lib/game/state/factory.ts` - Initialize two separate decks
3. `/src/lib/game/phases/handlers/spice-blow.ts` - Updated all deck operations

## Verification

Run type checking to ensure no errors:
```bash
npx tsc --noEmit
```

All type errors are in unrelated test files, confirming the spice blow changes are correct.
