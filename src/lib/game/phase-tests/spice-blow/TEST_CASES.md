# Spice Blow Phase - Comprehensive Test Cases

## Test Coverage Overview

This document defines all test cases needed to verify the refactored spice-blow phase handler. Tests are organized by functionality area and include positive, negative, and edge cases.

---

## 1. Card Revelation Tests

### 1.1 Basic Card Revelation
- **Test:** Reveal single Territory Card (Turn 2+)
  - Verify card is drawn from deck A
  - Verify card is removed from deck
  - Verify `SPICE_CARD_REVEALED` event emitted
  - Verify card definition is retrieved correctly
  - Verify card is discarded to correct pile

- **Test:** Reveal Shai-Hulud Card (Turn 2+)
  - Verify card is drawn from deck A
  - Verify `SHAI_HULUD_APPEARED` event emitted
  - Verify worm count incremented
  - Verify card is discarded to correct pile

### 1.2 Deck Management
- **Test:** Empty Deck Reshuffle
  - Setup: Deck A is empty, discard pile has cards
  - Verify discard pile is reshuffled into deck
  - Verify discard pile is cleared
  - Verify card can be drawn after reshuffle

- **Test:** Both Decks Empty
  - Setup: Both decks and discard piles empty
  - Verify phase handles gracefully
  - Verify `cardARevealed` is set to true
  - Verify no errors thrown

- **Test:** Invalid Card Definition
  - Setup: Card with invalid definitionId
  - Verify card is skipped gracefully
  - Verify `cardARevealed` is set to true
  - Verify no errors thrown

### 1.3 Advanced Rules - Double Spice Blow
- **Test:** Reveal Card B (Advanced Rules)
  - Setup: Advanced rules enabled, Card A revealed
  - Verify Card B is revealed from deck B
  - Verify separate discard piles maintained
  - Verify both cards processed independently

- **Test:** Card B Not Revealed (Standard Rules)
  - Setup: Standard rules, Card A revealed
  - Verify Card B is NOT revealed
  - Verify phase completes after Card A

---

## 2. Spice Placement Tests

### 2.1 Basic Spice Placement
- **Test:** Place Spice on Territory (Not in Storm)
  - Setup: Territory card with spice amount, sector not in storm
  - Verify spice added to territory
  - Verify `SPICE_PLACED` event emitted
  - Verify `lastSpiceLocation` updated
  - Verify spice amount correct
  - Verify action logged

- **Test:** Place Spice on Multi-Sector Territory
  - Setup: Territory spanning multiple sectors
  - Verify spice placed in correct sector
  - Verify location tracking correct

### 2.2 Storm Validation
- **Test:** Spice NOT Placed - Exact Sector Match
  - Setup: Territory card, storm at exact sector
  - Verify spice NOT placed
  - Verify `SPICE_CARD_REVEALED` event with `inStorm: true`
  - Verify card still discarded
  - Verify `lastSpiceLocation` NOT updated

- **Test:** Spice NOT Placed - Multi-Sector Territory
  - Setup: Multi-sector territory, storm in different sector of same territory
  - Verify spice NOT placed (storm in any sector blocks)
  - Verify validation uses `isTerritoryInStorm()`

- **Test:** Spice Placed - Protected Territory
  - Setup: Protected territory (e.g., Imperial Basin) with storm passing through
  - Verify spice IS placed (protected territories allow placement)
  - Verify validation handles protected territories correctly

- **Test:** Invalid Territory Card
  - Setup: Card missing territoryId, sector, or spiceAmount
  - Verify card skipped
  - Verify `cardARevealed` set to true
  - Verify no errors thrown

### 2.3 Post-Phase Validation
- **Test:** Runtime Validation - No Spice in Storm
  - Setup: Phase completes, all spice placed correctly
  - Verify validation passes
  - Verify success message logged

- **Test:** Runtime Validation - Spice Found in Storm (Error Case)
  - Setup: Spice incorrectly placed in storm (should never happen)
  - Verify error logged (but phase completes)
  - Verify error includes storm sector and spice locations
  - Verify phase doesn't throw (allows completion for debugging)

---

## 3. Shai-Hulud (Sandworm) Tests

### 3.0 Missing Feature Note
**IMPORTANT:** Rule 2.04.15 (SANDWORMS) - "all additional sandworms that appear after the first sandworm in a Spice Blow can be Placed by you in any sand Territory you wish" - This feature is **NOT YET IMPLEMENTED** in the codebase. Tests should verify current behavior (worms devour at topmost Territory Card location) and note this as a future enhancement.

### 3.1 Turn 1 Special Rules
- **Test:** Turn 1 - Shai-Hulud Set Aside
  - Setup: Turn 1, Shai-Hulud card revealed
  - Verify card is NOT discarded
  - Verify card added to `turnOneWormsSetAside`
  - Verify `SHAI_HULUD_APPEARED` event with `ignoredTurnOne: true`
  - Verify drawing continues until Territory Card
  - Verify no Nexus triggered

- **Test:** Turn 1 - Multiple Worms Set Aside
  - Setup: Turn 1, multiple Shai-Hulud cards
  - Verify all worms set aside
  - Verify all reshuffled in cleanup (split between decks A and B)

- **Test:** Turn 1 - Cleanup Reshuffle
  - Setup: Turn 1 with set-aside worms
  - Verify worms split evenly between decks A and B
  - Verify both decks shuffled
  - Verify worms added to decks (not discard piles)

### 3.2 Normal Shai-Hulud Handling (Turn 2+)
- **Test:** Single Worm Devouring
  - Setup: Turn 2+, Shai-Hulud after Territory Card
  - Verify worm count incremented
  - Verify global `wormCount` incremented
  - Verify devour location from topmost Territory Card in discard
  - Verify spice destroyed
  - Verify forces devoured (except Fremen)
  - Verify drawing continues until Territory Card

- **Test:** Multiple Worms in Sequence
  - Setup: Territory Card, Worm, Worm, Territory Card
  - Verify each worm devours at correct location
  - Verify `shaiHuludCount` tracks correctly
  - Verify Nexus triggered after final Territory Card

- **Test:** Worm with No Territory Card in Discard
  - Setup: Worm appears, no Territory Card in discard yet
  - Verify fallback to `lastSpiceLocation`
  - Verify devouring still occurs
  - Verify graceful handling

### 3.3 Multiple Worms - First vs Additional
- **Test:** First Worm Devours at Topmost Territory Card
  - Setup: First worm in sequence
  - Verify devours at topmost Territory Card location
  - Verify normal devouring behavior

- **Test:** Additional Worms (Current Implementation)
  - Setup: Multiple worms in sequence (2nd, 3rd, etc.)
  - Verify each devours at topmost Territory Card in discard
  - **NOTE:** Rule 2.04.15 (Fremen can place additional worms) not yet implemented
  - Verify current behavior matches standard devouring

### 3.4 Shield Wall Destruction
- **Test:** Shield Wall Destroyed (4+ Worms)
  - Setup: Variant enabled, 4th worm appears
  - Verify `shieldWallDestroyed` set to true
  - Verify event emitted
  - Verify only triggers once

- **Test:** Shield Wall Not Destroyed (Variant Disabled)
  - Setup: Variant disabled, 4+ worms
  - Verify `shieldWallDestroyed` remains false
  - Verify no event emitted

---

## 4. Devouring Logic Tests

### 4.1 Basic Devouring
- **Test:** Devour Spice in Territory
  - Setup: Territory with spice, worm appears
  - Verify spice destroyed
  - Verify `SPICE_DESTROYED_BY_WORM` event emitted
  - Verify spice returned to bank

- **Test:** Devour Forces in Territory
  - Setup: Multiple factions with forces in territory
  - Verify all non-Fremen forces devoured
  - Verify `FORCES_DEVOURED` event for each faction
  - Verify forces sent to Tleilaxu Tanks
  - Verify correct force counts

### 4.2 Fremen Immunity
- **Test:** Fremen Forces Not Devoured
  - Setup: Fremen forces in devour territory
  - Verify Fremen forces NOT devoured
  - Verify `FREMEN_WORM_IMMUNITY` event emitted
  - Verify forces remain on board

- **Test:** Fremen Leaders Protected
  - Setup: Fremen with protected leaders in territory
  - Verify leaders NOT devoured
  - Verify `LEADER_PROTECTED_FROM_WORM` event emitted

### 4.3 Fremen Ally Protection
- **Test:** Fremen Protects Ally
  - Setup: Fremen with ally, ally has forces in devour territory
  - Verify protection request sent to Fremen
  - Verify Fremen chooses to protect
  - Verify ally forces NOT devoured
  - Verify `FREMEN_PROTECTED_ALLY` event emitted

- **Test:** Fremen Allows Ally Devouring
  - Setup: Fremen with ally, ally has forces in devour territory
  - Verify protection request sent to Fremen
  - Verify Fremen chooses to allow devouring
  - Verify ally forces ARE devoured
  - Verify `FORCES_DEVOURED` event for ally

- **Test:** Fremen No Ally - No Protection Request
  - Setup: Fremen without ally, other forces in territory
  - Verify no protection request
  - Verify normal devouring proceeds

- **Test:** Fremen Ally Not in Territory
  - Setup: Fremen with ally, but ally forces not in devour territory
  - Verify no protection request
  - Verify normal devouring proceeds

### 4.4 Protected Leaders
- **Test:** Protected Leaders Not Devoured
  - Setup: Faction with protected leaders in territory
  - Verify leaders NOT devoured
  - Verify `LEADER_PROTECTED_FROM_WORM` event emitted
  - Verify forces still devoured (leaders separate)

### 4.5 Topmost Territory Card Location
- **Test:** Devour from Topmost Territory Card
  - Setup: Multiple Territory Cards in discard, worm appears
  - Verify devour location from LAST (topmost) Territory Card
  - Verify NOT from first Territory Card
  - Verify NOT from `lastSpiceLocation` if discard has cards

- **Test:** Fallback to Last Spice Location
  - Setup: Worm appears, no Territory Cards in discard
  - Verify fallback to `lastSpiceLocation`
  - Verify devouring still occurs

---

## 5. Nexus Detection and Triggering Tests

### 5.1 Nexus Trigger Detection
- **Test:** Nexus Triggered After Territory Card
  - Setup: Turn 2+, Shai-Hulud chain, then Territory Card
  - Verify Nexus triggered
  - Verify `nexusTriggered` flag set
  - Verify `NEXUS_STARTED` event emitted
  - Verify `nexusOccurring` state flag set

- **Test:** No Nexus on Turn 1
  - Setup: Turn 1, Shai-Hulud cards
  - Verify Nexus NOT triggered
  - Verify `nexusTriggered` remains false
  - Verify no `NEXUS_STARTED` event

- **Test:** No Nexus Without Shai-Hulud
  - Setup: Turn 2+, only Territory Cards
  - Verify Nexus NOT triggered
  - Verify phase completes normally

### 5.2 Fremen Worm Choice (Before Nexus)
- **Test:** Fremen Worm Ride Choice
  - Setup: Turn 2+, Fremen in game, worm appears, Territory Card placed
  - Verify worm ride request sent to Fremen (BEFORE Nexus, per implementation)
  - Verify request includes `lastSpiceLocation` and `forcesInTerritory`
  - Verify Fremen chooses to ride
  - Verify `fremenWormChoice` set to "ride"
  - Verify event emitted (choice marked, actual movement happens after Nexus)
  - Verify Nexus still triggered after choice
  - **NOTE:** Rule 2.04.08 says "Upon conclusion of the Nexus" - implementation marks choice before Nexus, movement happens after

- **Test:** Fremen Worm Devour Choice
  - Setup: Turn 2+, Fremen in game, worm appears, Territory Card placed
  - Verify worm ride request sent to Fremen
  - Verify Fremen chooses to devour
  - Verify `fremenWormChoice` set to "devour"
  - Verify devouring occurs at `lastSpiceLocation` (not topmost Territory Card for this choice)
  - Verify Nexus triggered after devouring

- **Test:** No Fremen - Direct Nexus
  - Setup: Turn 2+, no Fremen, worm appears
  - Verify no worm ride request
  - Verify Nexus triggered directly

- **Test:** Fremen No Last Spice Location
  - Setup: Turn 2+, Fremen in game, but no `lastSpiceLocation` (edge case)
  - Verify no worm ride request (requires lastSpiceLocation)
  - Verify Nexus triggered directly

---

## 6. Nexus Alliance Negotiations Tests

### 6.1 Alliance Request Generation
- **Test:** Request Sent to All Factions
  - Setup: Nexus triggered, multiple factions
  - Verify requests sent to all factions in storm order
  - Verify request includes current ally info
  - Verify request includes available factions
  - Verify `ALLIANCE_DECISION` request type

- **Test:** Skip Factions That Already Acted
  - Setup: Nexus, some factions already acted
  - Verify only remaining factions get requests
  - Verify `factionsActedInNexus` tracking works

- **Test:** Nexus Complete When All Acted
  - Setup: All factions have acted
  - Verify `NEXUS_ENDED` event emitted
  - Verify `nexusResolved` flag set
  - Verify `nexusOccurring` flag cleared
  - Verify no more requests

### 6.2 Form Alliance
- **Test:** Form Valid Alliance
  - Setup: Two factions, neither allied
  - Verify alliance formed
  - Verify both factions' `allyId` set correctly
  - Verify `ALLIANCE_FORMED` event emitted
  - Verify action logged
  - Verify alliance limits enforced (max 2 per alliance, no player in multiple)

- **Test:** Form Alliance - Target Already Allied (Invalid)
  - Setup: Target faction already has ally
  - Verify `validateAllianceTarget` returns false
  - Verify alliance NOT formed
  - Verify no state changes
  - Verify no event emitted

- **Test:** Form Alliance - Requester Already Allied (Invalid)
  - Setup: Requester faction already has ally
  - Verify alliance NOT formed (requester can't be in multiple alliances)
  - Verify no state changes

- **Test:** Form Alliance - Invalid Target Faction
  - Setup: Target faction doesn't exist
  - Verify `validateAllianceTarget` returns false
  - Verify alliance NOT formed
  - Verify graceful handling

- **Test:** Multiple Alliances in Same Nexus
  - Setup: Nexus with 4+ factions, multiple pairs form alliances
  - Verify each alliance formed independently
  - Verify no conflicts
  - Verify all events emitted

### 6.3 Break Alliance
- **Test:** Break Existing Alliance
  - Setup: Faction with ally
  - Verify alliance broken
  - Verify both factions' `allyId` cleared
  - Verify `ALLIANCE_BROKEN` event emitted
  - Verify action logged

- **Test:** Break Alliance - No Alliance (Invalid)
  - Setup: Faction without ally
  - Verify no state changes
  - Verify graceful handling

### 6.4 Pass in Nexus
- **Test:** Faction Passes
  - Setup: Faction receives request, passes
  - Verify faction marked as acted
  - Verify no state changes
  - Verify continues to next faction

---

## 7. Deck Operations Tests

### 7.1 Deck Selection
- **Test:** Select Deck A
  - Verify correct deck returned
  - Verify discard pile A returned

- **Test:** Select Deck B
  - Verify correct deck returned
  - Verify discard pile B returned

### 7.2 Reshuffling
- **Test:** Reshuffle Deck A
  - Setup: Deck A empty, discard A has cards
  - Verify discard shuffled
  - Verify deck A populated
  - Verify discard A cleared

- **Test:** Reshuffle Deck B
  - Setup: Deck B empty, discard B has cards
  - Verify discard shuffled
  - Verify deck B populated
  - Verify discard B cleared

- **Test:** Reshuffle Empty Discard
  - Setup: Deck empty, discard also empty
  - Verify no error
  - Verify state unchanged

- **Test:** Shuffle Algorithm
  - Setup: Known discard pile
  - Verify cards shuffled (order changed)
  - Verify all cards present
  - Verify no cards lost
  - Verify Fisher-Yates algorithm used

- **Test:** Advanced Game Reshuffle (Current Implementation)
  - Setup: Advanced rules, deck needs reshuffle
  - **NOTE:** Rule mentions special reshuffle (under topmost territory card in Pile A)
  - Verify current implementation uses standard shuffle
  - Verify both decks reshuffled independently
  - **NOTE:** Advanced game special reshuffle may not be fully implemented

### 7.3 Discarding
- **Test:** Discard to Pile A
  - Verify card added to discard A
  - Verify card not in discard B
  - Verify deck unchanged

- **Test:** Discard to Pile B
  - Verify card added to discard B
  - Verify card not in discard A
  - Verify deck unchanged

---

## 8. Context Management Tests

### 8.1 Context Initialization
- **Test:** Initial Context Creation
  - Verify all fields initialized correctly
  - Verify `cardARevealed` false
  - Verify `cardBRevealed` false
  - Verify `lastSpiceLocation` null
  - Verify `shaiHuludCount` 0
  - Verify all flags false/null

- **Test:** Context Reset
  - Setup: Context with values
  - Verify reset to initial state
  - Verify all fields reset correctly

### 8.2 Context Updates
- **Test:** Card Revealed Flags Updated
  - Verify `cardARevealed` set when Card A revealed
  - Verify `cardBRevealed` set when Card B revealed

- **Test:** Last Spice Location Updated
  - Verify updated when spice placed
  - Verify not updated when spice skipped (storm)

- **Test:** Shai-Hulud Count Tracking
  - Verify incremented for each worm
  - Verify persists across card draws

- **Test:** Nexus Flags Tracking
  - Verify `nexusTriggered` set when Nexus starts
  - Verify `nexusResolved` set when Nexus ends
  - Verify `factionsActedInNexus` tracks correctly

---

## 9. Event Emission Tests

### 9.1 Card Reveal Events
- **Test:** SPICE_CARD_REVEALED Event
  - Verify emitted for all card types
  - Verify includes card name, type, deck
  - Verify message correct

### 9.2 Spice Events
- **Test:** SPICE_PLACED Event
  - Verify emitted when spice placed
  - Verify includes territory, sector, amount
  - Verify message correct

- **Test:** SPICE_DESTROYED_BY_WORM Event
  - Verify emitted when spice destroyed
  - Verify includes territory, sector, amount
  - Verify message correct

### 9.3 Shai-Hulud Events
- **Test:** SHAI_HULUD_APPEARED Event (Normal)
  - Verify emitted for each worm
  - Verify includes worm number
  - Verify message correct

- **Test:** SHAI_HULUD_APPEARED Event (Turn 1)
  - Verify includes `ignoredTurnOne: true`
  - Verify message indicates Turn 1

### 9.4 Devouring Events
- **Test:** FORCES_DEVOURED Event
  - Verify emitted for each devoured faction
  - Verify includes faction, territory, sector, count
  - Verify message correct

- **Test:** FREMEN_WORM_IMMUNITY Event
  - Verify emitted when Fremen forces immune
  - Verify includes count
  - Verify message correct

- **Test:** FREMEN_PROTECTED_ALLY Event
  - Verify emitted when ally protected
  - Verify includes faction, count
  - Verify message correct

- **Test:** LEADER_PROTECTED_FROM_WORM Event
  - Verify emitted for protected leaders
  - Verify includes faction, count
  - Verify message correct

### 9.5 Nexus Events
- **Test:** NEXUS_STARTED Event
  - Verify emitted when Nexus begins
  - Verify message correct

- **Test:** NEXUS_ENDED Event
  - Verify emitted when Nexus completes
  - Verify message correct

### 9.6 Alliance Events
- **Test:** ALLIANCE_FORMED Event
  - Verify emitted when alliance formed
  - Verify includes both factions
  - Verify message correct

- **Test:** ALLIANCE_BROKEN Event
  - Verify emitted when alliance broken
  - Verify includes both factions
  - Verify message correct

---

## 10. Edge Cases and Negative Tests

### 10.1 Invalid Inputs
- **Test:** Invalid Sector Number
  - Setup: Sector < 0 or >= TOTAL_SECTORS
  - Verify validation handles gracefully
  - Verify doesn't block placement (fail-safe)
  - Verify error logged

- **Test:** Invalid Storm Sector
  - Setup: Storm sector invalid
  - Verify validation handles gracefully
  - Verify error logged

- **Test:** Missing Territory ID
  - Setup: Territory card without territoryId
  - Verify card skipped
  - Verify no errors thrown

### 10.2 Empty States
- **Test:** No Forces in Devour Territory
  - Setup: Worm appears, territory has no forces
  - Verify no devouring errors
  - Verify events still emitted correctly

- **Test:** No Spice in Devour Territory
  - Setup: Worm appears, territory has no spice
  - Verify no spice destruction errors
  - Verify events still emitted correctly

### 10.3 Complex Scenarios
- **Test:** Multiple Worms, Multiple Territories
  - Setup: Complex sequence of cards
  - Verify each worm devours at correct location
  - Verify Nexus triggered once at end
  - Verify all events emitted

- **Test:** Worm Chain with Fremen Protection Decision
  - Setup: Worm appears, Fremen ally in territory
  - Verify protection decision requested
  - Verify devouring continues after decision
  - Verify card drawing continues

- **Test:** Nexus with Multiple Alliance Changes
  - Setup: Nexus, multiple factions form/break alliances
  - Verify all changes processed correctly
  - Verify final alliance state correct
  - Verify all events emitted

### 10.4 Advanced Rules Edge Cases
- **Test:** Double Spice Blow - Both Piles Have Worms
  - Setup: Advanced rules, worms in both piles
  - Verify each pile processed independently
  - Verify devour locations from correct discard piles (A uses discardA, B uses discardB)
  - Verify Nexus triggered once (after both piles processed)
  - Verify separate discard piles maintained

- **Test:** Double Spice Blow - Pile B Empty
  - Setup: Advanced rules, Pile B empty
  - Verify graceful handling
  - Verify phase completes
  - Verify `cardBRevealed` set to true

- **Test:** Double Spice Blow - Pile A Has Worm, Pile B Territory Card
  - Setup: Advanced rules, different card types in each pile
  - Verify each processed correctly
  - Verify Nexus triggered after Pile A Territory Card
  - Verify Pile B still processed after Nexus

- **Test:** Double Spice Blow - Independent Devour Locations
  - Setup: Advanced rules, Territory Cards in different locations
  - Verify Pile A worm devours at Pile A topmost Territory Card
  - Verify Pile B worm devours at Pile B topmost Territory Card
  - Verify locations independent

---

## 11. Integration Tests

### 11.1 Full Phase Flow
- **Test:** Complete Standard Phase (Turn 2+)
  - Setup: Normal turn, Territory Card
  - Verify complete flow from initialize to cleanup
  - Verify all steps executed
  - Verify phase completes correctly
  - Verify next phase set correctly

- **Test:** Complete Phase with Nexus
  - Setup: Turn 2+, worm appears
  - Verify complete flow including Nexus
  - Verify all alliance negotiations
  - Verify phase completes after Nexus

- **Test:** Complete Turn 1 Phase
  - Setup: Turn 1 with worms
  - Verify worms set aside
  - Verify no Nexus
  - Verify cleanup reshuffles worms

### 11.2 State Persistence
- **Test:** Context Persists Across Steps
  - Verify context maintained between processStep calls
  - Verify flags not reset incorrectly
  - Verify state accumulation correct

- **Test:** Cleanup Resets Correctly
  - Verify cleanup only resets nexus flag
  - Verify context preserved for next phase
  - Verify turnOneWorms reshuffled correctly

---

## 12. Module-Specific Tests

### 12.0 Missing Features / Future Enhancements
- **Fremen Additional Sandworms (Rule 2.04.15)**: Not implemented - additional worms after first should allow Fremen to place in any sand territory
- **Advanced Game Reshuffle**: Special reshuffle rules may not be fully implemented
- **Fremen Karama Power**: Handled outside spice-blow phase (out of scope)

### 12.1 Validation Module
- **Test:** isInStorm - Exact Match
- **Test:** isInStorm - Multi-Sector Territory
- **Test:** isInStorm - Protected Territory
- **Test:** validateNoSpiceInStorm - Success
- **Test:** validateNoSpiceInStorm - Failure (Error Case)

### 12.2 Placement Module
- **Test:** handleTerritoryCard - Valid Card
- **Test:** handleTerritoryCard - Invalid Card
- **Test:** handleTerritoryCard - In Storm
- **Test:** handleTerritoryCard - Not in Storm

### 12.3 Reveal Module
- **Test:** revealSpiceCard - Territory Card
- **Test:** revealSpiceCard - Shai-Hulud Card
- **Test:** revealSpiceCard - Empty Deck
- **Test:** revealSpiceCard - Invalid Card

### 12.4 Deck Module
- **Test:** getDeck/getDiscardPile - Correct Selection
- **Test:** reshuffleSpiceDeck - Normal Case
- **Test:** reshuffleSpiceDeck - Empty Discard
- **Test:** discardSpiceCard - Both Piles
- **Test:** splitWormsEvenly - Turn 1 Reshuffle

### 12.5 Shai-Hulud Module
- **Test:** handleTurnOneWorm - Set Aside
- **Test:** handleNormalWorm - Devouring
- **Test:** getTopmostTerritoryCardLocation - From Discard
- **Test:** getTopmostTerritoryCardLocation - Fallback
- **Test:** devourForcesInTerritory - Normal
- **Test:** devourForcesInTerritory - Protection Request
- **Test:** executeDevour - All Factions

### 12.6 Nexus Module
- **Test:** checkNexusTriggerAfterTerritoryCard - Valid
  - Verify triggers when shaiHuludCount > 0, turn > 1, not already triggered

- **Test:** checkNexusTriggerAfterTerritoryCard - Turn 1
  - Verify does NOT trigger on turn 1

- **Test:** triggerNexus - With Fremen
  - Verify worm ride request sent before Nexus
  - Verify Nexus triggered after choice

- **Test:** triggerNexus - Without Fremen
  - Verify Nexus triggered directly
  - Verify no worm ride request

- **Test:** requestNexusDecisions - All Factions
  - Verify requests sent to all factions in storm order
  - Verify skips factions that already acted

- **Test:** requestNexusDecisions - Some Acted
  - Verify only remaining factions get requests
  - Verify `factionsActedInNexus` tracking

- **Test:** requestNexusDecisions - All Acted
  - Verify `NEXUS_ENDED` event
  - Verify `nexusResolved` flag set
  - Verify `nexusOccurring` cleared

- **Test:** processNexusResponses - Form Alliance
  - Verify alliance formed
  - Verify both factions updated
  - Verify events emitted

- **Test:** processNexusResponses - Break Alliance
  - Verify alliance broken
  - Verify both factions updated
  - Verify events emitted

- **Test:** processNexusResponses - Pass
  - Verify faction marked as acted
  - Verify no state changes

- **Test:** formAlliance - Valid
  - Verify both factions' allyId set
  - Verify state updated correctly

- **Test:** formAlliance - Invalid (Target Already Allied)
  - Verify `validateAllianceTarget` prevents formation
  - Verify no state changes

- **Test:** breakAlliance - Valid
  - Verify both factions' allyId cleared
  - Verify state updated correctly

- **Test:** breakAlliance - No Alliance
  - Verify graceful handling
  - Verify no errors

---

## Test Execution Strategy

### Unit Tests
- Test individual module functions in isolation
- Mock dependencies where needed
- Verify inputs/outputs

### Integration Tests
- Test module interactions
- Test complete phase flow
- Verify state transitions

### Scenario Tests (Existing)
- Run existing scenario tests
- Verify they still pass after refactoring
- Add new scenarios for uncovered cases

### Manual Review Tests
- Generate detailed log files
- Review for correctness
- Verify event sequences
- Verify state changes

---

## Test Priority

### Critical (Must Pass)
1. Basic card revelation
2. Spice placement (with/without storm)
3. Shai-Hulud devouring
4. Nexus triggering
5. Turn 1 special rules
6. Event emission

### High Priority
1. Fremen abilities (immunity, protection, ride)
2. Alliance formation/breaking
3. Advanced rules (Double Spice Blow)
4. Deck reshuffling
5. Context management

### Medium Priority
1. Edge cases
2. Error handling
3. Complex scenarios
4. Module-specific tests

### Low Priority
1. Performance tests
2. Stress tests
3. Boundary condition tests

---

## Success Criteria

All tests should verify:
1. ✅ Functionality matches original implementation
2. ✅ All events emitted correctly
3. ✅ State changes correct
4. ✅ No errors thrown (except expected error cases)
5. ✅ Context managed correctly
6. ✅ Rules followed correctly
7. ✅ Edge cases handled gracefully
8. ✅ Module boundaries respected
9. ✅ Refactored code behaves identically to original

## Known Limitations / Missing Features

The following features from the rules are **NOT YET IMPLEMENTED** in the codebase:

1. **Fremen Additional Sandworms (Rule 2.04.15)**
   - Rule: "all additional sandworms that appear after the first sandworm in a Spice Blow can be Placed by you in any sand Territory you wish"
   - Current: Additional worms devour at topmost Territory Card location (standard behavior)
   - Tests should verify current behavior and note as future enhancement

2. **Advanced Game Special Reshuffle**
   - Rule: "Shuffle in all discarded territory and Shai-Hulud cards under the topmost territory card in Spice Discard Pile A"
   - Current: Standard shuffle used for both decks
   - Tests should verify current behavior

3. **Fremen Karama Power (Rule 1.14.03)**
   - Rule: Fremen can use Karama to place sandworm token
   - Note: This is likely handled in a different phase/system, not in spice-blow handler
   - Out of scope for spice-blow phase tests

## Alignment with Rules

### ✅ Fully Covered
- Basic spice blow (Rule 1.02.01)
- Turn 1 special rules (Rule 1.02.02)
- No Nexus on Turn 1 (Rule 1.02.03)
- Territory card spice placement (Rule 1.02.04)
- Shai-Hulud devouring (Rule 1.02.05)
- Nexus triggering (Rule 1.02.06)
- Fremen worm immunity (Rule 2.04.07)
- Fremen worm ride choice (Rule 2.04.08) - choice before Nexus, movement after
- Fremen ally protection (Rule 2.04.16)
- Alliance formation/breaking (Alliance rules)
- Double Spice Blow (Rule 1.13.01) - basic implementation

### ⚠️ Partially Covered / Needs Verification
- Advanced Game reshuffle special rules
- Multiple worms sequence handling
- Complex Nexus scenarios with multiple alliances

### ❌ Not Implemented (Documented)
- Fremen additional sandworm placement (Rule 2.04.15)
- Advanced Game special reshuffle (may be standard shuffle)

