# Mentat Pause Phase - Difficult Scenarios

## Overview

The Mentat Pause phase is where victory conditions are checked. This phase has several complex mechanics that need thorough testing:

1. **Bribe Collection**: Spice placed in front of shield during the turn
2. **Stronghold Victory**: Solo (3) vs Alliance (4) requirements
3. **Contested Strongholds**: Multiple non-allied factions = no control
4. **Multiple Winners**: Storm order resolution
5. **Special Victories**: Fremen, Guild, BG prediction
6. **Endgame Default Victory**: Most strongholds, spice tiebreaker, storm order

## Difficult Scenarios to Test

### 1. Bribe Collection
**What makes it difficult**: 
- Multiple factions with bribes
- Bribes must be collected before victory check
- Bribes reset to 0 after collection

**Rules involved**:
- Spice from in front of shield added to reserves
- Bribes reset after collection

### 2. Solo Stronghold Victory (3 strongholds)
**What makes it difficult**:
- Must control exactly 3+ strongholds
- Control means SOLE control (no other non-allied factions)
- Contested strongholds don't count

**Rules involved**:
- Unallied player needs 3+ strongholds
- Stronghold control requires exclusive presence

### 3. Alliance Stronghold Victory (4 strongholds)
**What makes it difficult**:
- Combined strongholds from both allies
- Must total 4+ strongholds
- Both allies win together
- Alliance grouping logic

**Rules involved**:
- Allied players need 4+ strongholds combined
- Allies' forces count as same for victory

### 4. Contested Strongholds
**What makes it difficult**:
- Multiple non-allied factions in same stronghold = no one controls it
- This can prevent victory even if you have forces in 3+ strongholds
- Must understand "sole control" logic

**Rules involved**:
- Only one faction/alliance can control a stronghold
- Multiple non-allied groups = contested = no control

### 5. Multiple Winners (Storm Order Resolution)
**What makes it difficult**:
- Multiple factions/alliances meet victory conditions simultaneously
- First in storm order wins
- Must correctly identify all winners, then resolve by order

**Rules involved**:
- Multiple winners possible
- Storm order determines winner
- Rule 2.02.03: First in storm order wins

### 6. Fremen Special Victory
**What makes it difficult**:
- Only applies if Guild is in game
- Only at end of game (last turn)
- Specific sietch requirements:
  - Only Fremen (or no one) in Sietch Tabr and Habbanya Sietch
  - No Harkonnen, Atreides, or Emperor in Tuek's Sietch
- Allies win with Fremen

**Rules involved**:
- Guild must be in game
- Must be last turn
- Specific sietch occupation rules
- Alliance inclusion

### 7. Guild Special Victory
**What makes it difficult**:
- Only at end of game
- Guild wins if no one else won
- Guild must have forces on Dune
- Allies win with Guild

**Rules involved**:
- Endgame only
- Default victory if no stronghold winner
- Guild presence required

### 8. Endgame Default Victory
**What makes it difficult**:
- Most strongholds wins
- Tiebreaker: Most spice
- Final tiebreaker: Storm order
- Can have multiple winners if still tied

**Rules involved**:
- Rule 2.06.08: Default victory conditions
- Spice tiebreaker
- Storm order tiebreaker

### 9. Bene Gesserit Prediction
**What makes it difficult**:
- Prediction made during setup
- Must check if predicted faction won on predicted turn
- Complex validation logic

**Rules involved**:
- BG prediction mechanics
- Victory override if prediction correct

### 10. Complex Alliance Scenarios
**What makes it difficult**:
- Multiple alliances in game
- Some factions allied, some not
- Victory counting must group correctly
- Alliance vs solo victory thresholds

**Rules involved**:
- Alliance grouping
- Different thresholds (3 vs 4)
- Multiple alliance groups

### 11. Edge Case: Exactly 3 Strongholds
**What makes it difficult**:
- Must have exactly 3 (not 2, not 4)
- One contested stronghold can prevent victory
- Boundary condition testing

### 12. Edge Case: Alliance with Exactly 4 Strongholds
**What makes it difficult**:
- Combined count must be exactly 4+
- One ally has 2, other has 2 = victory
- One ally has 3, other has 1 = victory
- Boundary condition testing

