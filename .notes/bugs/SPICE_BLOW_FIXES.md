# Spice Blow Phase - Implementation Fixes

## Issues Found and Fixed

### ✅ Issue 1: Shai-Hulud Card Handling (Rule 1.02.05)

**Rule**: "When this type of card is discarded destroy all spice and Forces in the Territory of the **topmost Territory Card in the discard pile** and Place them in the Spice Bank and Tleilaxu Tanks respectively. **Continue discarding Spice Blow cards until a Territory Card is discarded.** Now a Nexus will occur."

**Problems Found**:
1. ❌ Did NOT continue drawing cards after Shai-Hulud appeared
2. ❌ Used `lastSpiceLocation` instead of topmost Territory Card in discard pile
3. ❌ On Turn 1, set aside worm but didn't continue drawing until Territory Card

**Fixes Applied**:
1. ✅ Shai-Hulud now recursively calls `revealSpiceCard()` to continue drawing until Territory Card appears
2. ✅ Added `getTopmostTerritoryCardLocation()` to find territory from topmost Territory Card in discard pile
3. ✅ Turn 1 worms are set aside, but still continues drawing until Territory Card
4. ✅ When Territory Card appears after Shai-Hulud chain, Nexus is triggered

### ✅ Issue 2: Territory Card Location for Devouring

**Rule**: "destroy all spice and Forces in the Territory of the **topmost Territory Card in the discard pile**"

**Problem**: Used `lastSpiceLocation` (last spice placed) instead of checking discard pile

**Fix**: Created `getTopmostTerritoryCardLocation()` that:
- Searches discard pile from top (most recent) to bottom
- Finds the first Territory Card (not Shai-Hulud)
- Uses that territory for devouring
- Falls back to `lastSpiceLocation` if no Territory Card found

### ✅ Issue 3: Turn 1 Shai-Hulud Handling

**Rule 1.02.02**: "During the first turn's Spice Blow Phase only, all Shai-Hulud cards Revealed are ignored, Set Aside, then reshuffled back into the Spice deck after this Phase."

**Rule 1.02.03**: "There can not be a Nexus on Turn one for any reason."

**Problem**: Set aside worm but didn't continue drawing

**Fix**: 
- Worm is set aside and discarded
- Still continues drawing until Territory Card appears (no Nexus triggered)

### ✅ Issue 4: Debug Logging

**Added comprehensive logging**:
- Phase initialization with Turn 1 warnings
- Card reveals with type and details
- Spice placement (success/failure due to storm)
- Shai-Hulud appearances with devour location
- Chain continuation messages
- Nexus triggering

## Implementation Details

### Key Functions

1. **`getTopmostTerritoryCardLocation()`**: Finds territory from topmost Territory Card in discard pile
2. **`devourForcesInTerritory()`**: Devours forces and spice in specific territory (replaces old `devourForces()`)
3. **`handleShaiHulud()`**: Now recursively continues drawing until Territory Card
4. **`revealSpiceCard()`**: When Territory Card appears after Shai-Hulud chain, triggers Nexus

### Flow Diagram

```
Shai-Hulud Appears
  ↓
Discard Shai-Hulud card
  ↓
Find topmost Territory Card in discard pile
  ↓
Devour forces/spice in that territory
  ↓
Continue drawing cards (recursive)
  ↓
[If another Shai-Hulud] → Repeat
  ↓
[If Territory Card] → Place spice → Trigger Nexus
```

## Rules Compliance Checklist

- ✅ **1.02.01 BLOW THE SPICE**: Top card revealed and discarded
- ✅ **1.02.02 FIRST TURN**: Shai-Hulud cards set aside and reshuffled
- ✅ **1.02.03 NO NEXUS**: No Nexus on Turn 1
- ✅ **1.02.04 TERRITORY CARD**: Spice placed unless in storm
- ✅ **1.02.05 SHAI-HULUD**: 
  - ✅ Devours in topmost Territory Card location
  - ✅ Continues drawing until Territory Card
  - ✅ Triggers Nexus after Territory Card
- ✅ **1.02.06 NEXUS**: Triggered after Shai-Hulud → Territory Card sequence

## Testing Recommendations

1. Test Turn 1 with Shai-Hulud (should set aside, continue drawing, no Nexus)
2. Test Turn 2+ with Shai-Hulud (should devour, continue drawing, trigger Nexus)
3. Test multiple Shai-Hulud cards in sequence
4. Test Shai-Hulud with no Territory Card in discard (should use lastSpiceLocation fallback)
5. Test Fremen worm ride choice
6. Test spice placement in storm (should not place)

