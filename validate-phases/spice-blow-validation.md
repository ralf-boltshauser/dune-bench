# Spice Blow Phase Validation Guide

## Overview

This document provides a comprehensive guide for validating the Spice Blow Phase (Phase 1.02) implementation. Use this to verify correctness of game logs, state transitions, and rule compliance.

---

## Core Phase Rules to Validate

### Rule 1.02.01: Blow the Spice
- ✅ **Card Revealed**: Top card of Spice Deck A is revealed and discarded
- ✅ **Advanced Rules**: If `config.advancedRules = true`, second card from Spice Deck B is also revealed
- ✅ **Discard Pile**: Cards go to correct discard pile (A or B)

### Rule 1.02.02: First Turn Special Rules
- ✅ **Worms Set Aside**: All Shai-Hulud cards on Turn 1 are set aside (not discarded)
- ✅ **No Devouring**: Worms do not devour on Turn 1
- ✅ **No Nexus**: No Nexus can occur on Turn 1
- ✅ **Reshuffled**: Set-aside worms are reshuffled into both decks at end of phase

### Rule 1.02.03: No Nexus on Turn One
- ✅ **No Nexus**: Even if Shai-Hulud appears on Turn 1, no Nexus occurs
- ✅ **Verification**: Check that `nexusTriggered` remains false on Turn 1

### Rule 1.02.04: Territory Card (Spice Blow)
- ✅ **Spice Amount**: Correct spice amount (from card) taken from Spice Bank
- ✅ **Spice Placement**: Spice placed on territory at correct sector (Spice Blow icon location)
- ✅ **Storm Exception**: If sector is in storm, NO spice is placed
- ✅ **Bank Balance**: Spice Bank decreases by correct amount (or stays same if in storm)

### Rule 1.02.05: Shai-Hulud (Sandworm)
- ✅ **Devour Location**: Worms devour at location of **topmost Territory Card** in discard pile
- ✅ **Forces Destroyed**: All non-Fremen forces in territory sent to Tanks
- ✅ **Spice Destroyed**: All spice in territory returned to Spice Bank
- ✅ **Card Chain**: Continue discarding until Territory Card appears
- ✅ **Spice Placement**: After Territory Card found, spice is placed (Rule 1.02.04)
- ✅ **Nexus Triggered**: Nexus occurs after Territory Card appears (Turn 2+)

### Rule 1.02.06: Nexus
- ✅ **Trigger Condition**: Nexus occurs when Shai-Hulud appears (Turn 2+ only)
- ✅ **Timing**: Nexus occurs at end of phase, after all spice cards processed
- ✅ **No Turn 1 Nexus**: Verified that Turn 1 never triggers Nexus

---

## Faction Abilities Validation

### Fremen Abilities

#### 2.04.07: Shai-Hulud Protection ✷
- ✅ **Fremen Immunity**: Fremen forces in worm territory are NOT devoured
- ✅ **Other Forces**: Non-Fremen forces are devoured (unless protected by alliance)
- ✅ **Karama**: Ability can be cancelled (check for Karama card usage)

#### 2.04.08: Beast of Burden (Worm Riding)
- ✅ **Timing**: Occurs after Nexus concludes
- ✅ **Request Sent**: Fremen receives request to ride or allow devouring
- ✅ **Movement Rules**: Forces moved must avoid storm territories
- ✅ **Multiple Worms**: Can ride again if another worm appears and forces still in territory
- ✅ **Not Devoured**: Ridden forces are not devoured

#### 2.04.15: Sandworms ✷ (Additional Worms)
- ✅ **Placement**: Fremen can place additional worms (after first) in any sand territory
- ✅ **Other Forces Devoured**: All non-Fremen forces in chosen territory are devoured
- ✅ **Fremen Safe**: Fremen forces in chosen territory are safe
- ✅ **Karama**: Ability can be cancelled

#### 2.04.16: Alliance: Sandworm Protection ✷
- ✅ **Decision Request**: Fremen asked if they want to protect ally
- ✅ **Protection Applied**: Protected ally forces survive devouring
- ✅ **No Protection**: If Fremen chooses not to protect, ally forces are devoured
- ✅ **Karama**: Ability can be cancelled

---

## Advanced Game Rules Validation

### Double Spice Blow (1.13.01)
- ✅ **Second Card**: Card B revealed after Card A (when `config.advancedRules = true`)
- ✅ **Two Piles**: Separate discard piles (A and B)
- ✅ **Worm Devouring**: Each pile's worms devour based on that pile's topmost Territory Card
- ✅ **Independent Processing**: Each pile processed independently
- ✅ **Multiple Nexuses**: If both piles have worms, Nexus still occurs once at end

---

## State Changes Validation

### Spice Bank Changes
- ✅ **Decrease**: Bank decreases when spice placed on territory
- ✅ **Increase**: Bank increases when spice destroyed by worm
- ✅ **No Change**: Bank unchanged if spice blow sector is in storm

### Territory Spice Changes
- ✅ **Spice Added**: Correct amount added to territory when card reveals Territory Card
- ✅ **Spice Removed**: All spice removed from territory when worm devours
- ✅ **Storm Check**: No spice added if sector in storm

### Force Changes
- ✅ **To Tanks**: Forces sent to Tanks when devoured (except Fremen, protected allies)
- ✅ **Fremen Immunity**: Fremen forces remain on board
- ✅ **Protected Allies**: Protected ally forces remain on board
- ✅ **Riding**: Fremen forces moved via worm riding

### Deck State Changes
- ✅ **Cards Removed**: Cards removed from deck when revealed
- ✅ **Discard Piles**: Cards added to correct discard pile (A or B)
- ✅ **Turn 1 Reshuffle**: Worms reshuffled into both decks on Turn 1 cleanup

---

## Event Validation

### Expected Events

1. **SPICE_CARD_REVEALED**
   - ✅ Fired for each card revealed
   - ✅ Contains card data (type, territory if Territory Card, etc.)
   - ✅ Indicates which deck (A or B)

2. **SPICE_PLACED**
   - ✅ Fired when spice placed on territory
   - ✅ Contains: territoryId, sector, amount
   - ✅ NOT fired if sector in storm

3. **SHAI_HULUD_REVEALED**
   - ✅ Fired when Shai-Hulud card appears
   - ✅ Contains devour location information
   - ✅ On Turn 1, card is set aside (not processed as normal)

4. **FORCES_DEVOURED**
   - ✅ Fired for each faction with devoured forces
   - ✅ Contains: faction, territoryId, forcesCount
   - ✅ NOT fired for Fremen forces (if in territory)
   - ✅ NOT fired for protected ally forces

5. **SPICE_DESTROYED**
   - ✅ Fired when worm destroys spice
   - ✅ Contains: territoryId, amount, returnedToBank

6. **NEXUS_TRIGGERED**
   - ✅ Fired when Nexus occurs (Turn 2+ only)
   - ✅ NOT fired on Turn 1

7. **ALLIANCE_FORMED**
   - ✅ Fired during Nexus if alliance formed
   - ✅ Contains: factions involved

8. **ALLIANCE_BROKEN**
   - ✅ Fired during Nexus if alliance broken
   - ✅ Contains: factions involved

9. **FREMEN_WORM_RIDDEN**
   - ✅ Fired if Fremen chooses to ride worm
   - ✅ Contains: forces moved, destination territory

### Event Ordering

Validate events occur in correct sequence:
1. Card reveal events
2. Spice placement (if applicable)
3. Worm devouring events (if applicable)
4. Nexus trigger
5. Nexus resolution events
6. Fremen worm riding (if applicable)

---

## Common Validation Checks

### Turn 1 Scenarios

Checklist:
- [ ] All Shai-Hulud cards set aside (not in discard)
- [ ] No devouring occurred
- [ ] No Nexus triggered
- [ ] Spice still placed from Territory Cards (if any)
- [ ] Worms reshuffled into both decks at cleanup
- [ ] Phase completes normally

### Normal Turn Scenarios (Turn 2+)

Checklist:
- [ ] Cards revealed and discarded correctly
- [ ] Spice placed when sector not in storm
- [ ] Spice NOT placed when sector in storm
- [ ] Worms devour at correct location (topmost Territory Card in discard)
- [ ] Correct forces devoured (excluding Fremen, protected allies)
- [ ] Spice destroyed and returned to bank
- [ ] Nexus triggered after Territory Card appears after worm
- [ ] Phase completes after Nexus resolves

### Worm Devouring Scenarios

Checklist:
- [ ] Devour location matches topmost Territory Card in discard pile
- [ ] All non-immune forces sent to Tanks
- [ ] All spice in territory destroyed and returned to Bank
- [ ] Card chain continues until Territory Card appears
- [ ] Spice placed after Territory Card found
- [ ] Nexus triggered after first Territory Card after worm

### Fremen Protection Scenarios

Checklist:
- [ ] Fremen asked to protect ally (if ally has forces in territory)
- [ ] Protection decision respected
- [ ] Protected ally forces survive
- [ ] Non-protected forces devoured
- [ ] Fremen forces always immune

### Advanced Rules (Double Spice Blow)

Checklist:
- [ ] Both Card A and Card B revealed
- [ ] Each card goes to correct discard pile
- [ ] Worms in Pile A devour based on Pile A's topmost Territory Card
- [ ] Worms in Pile B devour based on Pile B's topmost Territory Card
- [ ] Each pile processed independently
- [ ] Nexus occurs once at end (if any worm appeared)

### Nexus Scenarios

Checklist:
- [ ] Nexus only occurs Turn 2+
- [ ] All factions receive Nexus requests
- [ ] Alliances can be formed (max 2 players)
- [ ] Alliances can be broken
- [ ] No player in multiple alliances
- [ ] Alliances are public (events fired)
- [ ] Fremen can ride worm after Nexus (if applicable)

---

## Log Review Process

### Step 1: Verify Initial State

Check:
- Turn number
- Storm sector
- Faction forces positions
- Territory spice amounts
- Spice Bank balance
- Deck configurations (A and B if advanced)
- Discard pile states
- Alliance status

### Step 2: Track Card Reveals

For each card revealed:
- [ ] Which deck (A or B)
- [ ] Card type (Territory Card or Shai-Hulud)
- [ ] Where it went (discard pile or set aside)
- [ ] Any effects triggered

### Step 3: Verify Spice Placement

For each Territory Card:
- [ ] Spice amount matches card
- [ ] Correct territory and sector
- [ ] Sector not in storm (or verify no placement if in storm)
- [ ] Spice Bank decreased (or stayed same if in storm)
- [ ] Territory spice increased (or stayed same if in storm)

### Step 4: Verify Worm Devouring

For each Shai-Hulud:
- [ ] Devour location is topmost Territory Card in correct discard pile
- [ ] Forces sent to Tanks (except Fremen, protected allies)
- [ ] Spice destroyed and returned to Bank
- [ ] Card chain continues until Territory Card
- [ ] Spice placed after Territory Card
- [ ] Nexus triggered (Turn 2+)

### Step 5: Verify Nexus

If Nexus occurred:
- [ ] All factions received requests
- [ ] Alliance decisions made correctly
- [ ] Alliances formed/broken properly
- [ ] Events fired correctly

### Step 6: Verify State Changes

Compare start and end state:
- [ ] Spice Bank balance correct
- [ ] Territory spice amounts correct
- [ ] Forces in correct locations (board vs tanks)
- [ ] Alliances updated correctly
- [ ] Decks depleted correctly
- [ ] Discard piles populated correctly

---

## Common Issues to Watch For

### Critical Issues

1. **Incorrect Devour Location**
   - Worm devouring in wrong territory
   - Should use topmost Territory Card in discard pile
   - Each pile (A/B) has separate devour location

2. **Turn 1 Worms Processed**
   - Worms should be set aside, not discarded
   - No devouring should occur
   - No Nexus should trigger

3. **Spice Placed in Storm**
   - Spice should NOT be placed if sector in storm
   - Check storm sector matches spice blow sector

4. **Fremen Forces Devoured**
   - Fremen forces should NEVER be devoured
   - Exception: Karama card cancelling protection

5. **Missing Nexus**
   - Nexus should occur when worm appears (Turn 2+)
   - Nexus should NOT occur on Turn 1

### Minor Issues

1. **Incorrect Spice Amounts**
   - Spice amounts should match Territory Card values
   - Check spice bank calculations

2. **Event Missing**
   - All state changes should have corresponding events
   - Check event ordering

3. **Alliance Protection Not Applied**
   - Protected allies should survive devouring
   - Check Fremen protection decision was respected

4. **Worm Riding Issues**
   - Forces must avoid storm territories
   - Check destination is valid

---

## Validation Example

### Scenario: Simple Spice Blow with Worm

**Initial State:**
- Turn: 2
- Storm Sector: 5
- Spice Bank: 100
- Territory: South Mesa has 0 spice, 3 Atreides forces

**Card Sequence:**
1. Territory Card (South Mesa, 10 spice, sector 3)
2. Shai-Hulud
3. Territory Card (Basin, 8 spice, sector 8)

**Expected Flow:**
1. ✅ Reveal Territory Card → Place 10 spice in South Mesa (sector 3, not in storm)
2. ✅ Reveal Shai-Hulud → Devour in South Mesa (topmost Territory Card)
   - ✅ 3 Atreides forces → Tanks
   - ✅ 10 spice → Returned to Bank
3. ✅ Reveal Territory Card (Basin) → Place 8 spice in Basin (sector 8, not in storm)
4. ✅ Nexus triggered
5. ✅ Phase completes

**Final State Validation:**
- ✅ Spice Bank: 98 (100 - 10 + 10 - 8 = 92... wait, let me recalculate)
  - Actually: Started 100, placed 10 (now 90), destroyed 10 returned (now 100), placed 8 (now 92)
- ✅ South Mesa: 0 spice, 0 forces
- ✅ Basin: 8 spice
- ✅ Atreides Tanks: +3 regular forces
- ✅ Nexus occurred: true

---

## References

- **Phase Handler**: `src/lib/game/phases/handlers/spice-blow.ts`
- **Rules**: `dune-rules/all-spice-blow-phase.md`
- **Test Plan**: `research/spice-blow/test-plan.md`
- **Validation Function**: `src/lib/game/test-full-game.ts` (validateSpiceBlow)

---

## Notes

- Validation should be done manually by reviewing game logs
- Check both events and final state
- Pay attention to Turn 1 special rules
- Verify faction abilities are correctly applied
- Use this guide as a checklist for log reviews


