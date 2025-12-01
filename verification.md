# Verification Checklist

*This file lists fixes that have been implemented but not yet tested/verified.*

## Verification Reminders

**TODO: Verify after next test runs:**

- [ ] **Bene Gesserit Invalid Battle Choice Fix** - Phase: battle, Turn: 1. Game: game_mimwe69l_04aea3bc. Fixed validation bug where BG battle choice to attack Atreides in Arrakeen was marked invalid. BG can now only choose battles where they have fighters (not just advisors). Verify BG with fighters can choose battles, and BG with only advisors cannot see/choose battles.

- [ ] **CHOAM Charity Auto-Claim Fix** - Phase: choam_charity, Turn: All turns. Game: game_miljehzi_6f560fec. Verify BG is asked for decision, not auto-claimed. **Status: Verification failed - phase completes without agent interaction (see findings.md)**

- [ ] **Stronghold Occupancy Limit Bug Fix** - Phase: shipment_movement, battle, Turn: 2. Game: game_miljehzi_6f560fec. Verify BG advisors count toward 2-faction limit in strongholds.

- [ ] **Storm Turn 2 Deck Reveal Fix** - Phase: storm, Turn: 2. Game: game_mimwe69l_04aea3bc. Verify that after Fremen reveals the storm card from the storm deck, storm movement is applied, a STORM_MOVED event is emitted, and the phase advances to Spice Blow instead of getting stuck.

---

## TAKE UP ARMS Rule Verification

**Issue:** TAKE UP ARMS rule (2.02.17) is not implemented. When Bene Gesserit moves advisors into an occupied territory, they should have the option to flip them to fighters, but this functionality is missing.

**Rule:** "When you Move advisors into an occupied Territory, you may flip them to fighters following occupancy limit if you do not already have advisors present.✷"

**Phase:** shipment_movement  
**Faction:** Bene Gesserit (advanced rules)

**Verification Status:**

**Key Findings:**

**✅ Infrastructure Available:**
- `convertAdvisorsToFighters()` - exists in `force-utils.ts` (line 599)
- `convertBGAdvisorsToFighters()` - exists in `mutations.ts` (line 486)
- `getBGAdvisorsInTerritory()` - exists in `queries.ts` (line 257)
- `getBGFightersInTerritory()` - exists in `queries.ts` (line 242)
- `getFactionsInTerritory()` - exists in `queries.ts` (line 193) - can check if territory is occupied

**❌ Missing Implementation:**
- Movement execution code (`shipment-movement.ts` lines 1008-1042) only calls `moveForces()` with no TAKE UP ARMS logic
- No detection of: advisors being moved to occupied territory
- No check for: BG already has advisors in destination
- No agent request type `TAKE_UP_ARMS` in `types.ts` (only `FLIP_ADVISORS` exists for other rules)
- Restrictions (PEACETIME, STORMED IN) not validated before offering flip
- Karama cancellation not implemented (though mentioned in `karama.ts` line 629)

**Key Distinction from ADAPTIVE FORCE:**
- **ADAPTIVE FORCE (2.02.21)**: Moving to territory where YOU have the opposite type → **AUTOMATIC** flip (implemented in `force-utils.ts` lines 390-469)
- **TAKE UP ARMS (2.02.17)**: Moving advisors to territory where **OTHER FACTIONS** have forces → **OPTIONAL** flip (NOT implemented)

**Code Locations:**
- Movement handler: `src/lib/game/phases/handlers/shipment-movement.ts:1008-1042`
- ADAPTIVE FORCE logic: `src/lib/game/state/force-utils.ts:390-469`
- Conversion functions: `src/lib/game/state/force-utils.ts:597-640`
- Query functions: `src/lib/game/state/queries.ts:193-317`

**Documentation:**
- Detailed report: `.notes/verification/take-up-arms-verification.md`
- Status: ❌ **NOT IMPLEMENTED** - Requires implementation

**Next Steps:**
1. Implement detection logic in movement handler (after `moveForces()` call)
2. Create `TAKE_UP_ARMS` agent request type in `types.ts`
3. Add validation for all restrictions (PEACETIME, STORMED IN, occupancy limit)
4. Implement state mutation with `convertBGAdvisorsToFighters()`
5. Add Karama cancellation support
6. Write unit tests

---

## INTRUSION Rule Verification (Rule 2.02.16)

**Issue:** INTRUSION rule (2.02.16) is not implemented. When a non-ally faction enters a territory where Bene Gesserit has fighters, BG should have the option to flip those fighters to advisors, but this functionality is missing.

**Rule:** "When a Force of another faction that you are not allied to enters a Territory where you have fighters, you may flip them to advisors.✷"

**Phase:** shipment_movement (and potentially spice_blow for worm ride)  
**Faction:** Bene Gesserit (advanced rules)

**Verification Status:**

**Key Findings:**
- Infrastructure exists: `convertFightersToAdvisors()`, `getBGFightersInSector()`, `FLIP_ADVISORS` request type
- No detection logic when forces enter territories (ship, move, send, worm ride)
- No `shouldAskBGIntrusion()` function to check trigger conditions
- No `requestBGIntrusion()` function to create agent request
- No handler for `FLIP_ADVISORS` response in shipment-movement phase
- Karama support exists in `karama.ts` but rule not implemented to be cancellable

**Documentation:**
- Detailed report: `.notes/verification/intrusion-rule-verification.md`
- Status: ❌ **NOT IMPLEMENTED** - Requires implementation

**Next Steps:**
1. Implement detection logic after shipment/movement/send/worm ride completes
2. Create `shouldAskBGIntrusion()` helper function
3. Create `requestBGIntrusion()` helper function
4. Add handler for `FLIP_ADVISORS` request type
5. Integrate checks after all force entry points (ship, move, send, worm ride)
6. Write unit tests

---


## UNIVERSAL STEWARDS Rule Verification (Rule 2.02.22)

**Issue:** Verify that UNIVERSAL STEWARDS rule correctly auto-flips BG advisors to fighters when alone before Battle Phase.

**Rule:** "When advisors are ever alone in a Territory before Battle Phase [1.07], they automatically flip to fighters."

**Phase:** battle  
**Faction:** Bene Gesserit (advanced rules)

**Verification Status:**

**Key Findings:**
- Implementation completely missing from `BattlePhaseHandler.initialize()`
- No check for BG advisors before `identifyBattles()` call
- No "alone" condition check
- No PEACETIME restriction check (ally in territory blocks flip)
- No STORMED IN restriction check (storm sector blocks flip)
- No advanced rules check
- All required helper functions exist and work correctly

**Impact:**
- **Severity:** HIGH
- Advisors remain as advisors when alone, violating Rule 2.02.22
- Game state doesn't match rule requirements
- Battle identification may be incorrect if advisors should be fighters

**Required Implementation:**
1. Add check in `BattlePhaseHandler.initialize()` BEFORE `identifyBattles()` call
2. Check all territories where BG has advisors
3. For each sector with advisors:
   - Check if alone (no other factions in territory)
   - Check PEACETIME (ally in territory blocks)
   - Check STORMED IN (storm sector blocks)
   - Auto-flip if conditions met
4. Only applies when advanced rules enabled

**Documentation:**
- Detailed report: `.notes/verification/universal-stewards-verification-complete.md`
- Status: ❌ **NOT IMPLEMENTED** - Requires implementation

**Next Steps:**
1. Implement UNIVERSAL STEWARDS check in `BattlePhaseHandler.initialize()`
2. Add before `identifyBattles(state)` call
3. Check all territories with BG advisors (sector-by-sector)
4. Apply PEACETIME and STORMED IN restrictions
5. Auto-flip when conditions met
6. Write unit tests for all scenarios
7. Test with advanced rules enabled/disabled

---


## WARTIME Rule Verification (Rule 2.02.18)

**Issue:** WARTIME rule is not implemented. Before Shipment and Movement phase starts, Bene Gesserit should have the option to flip all advisors to fighters in each territory where they have advisors.

**Rule:** "Before Shipment and Movement [1.06.00], in each Territory that you have advisors, you may flip all of those advisors to fighters. This change must be publicly announced.✷"

**Phase:** shipment_movement (before phase starts)  
**Faction:** Bene Gesserit (advanced rules)

**Verification Status:**

**Key Findings:**
- Infrastructure exists: `convertAdvisorsToFighters()`, `getBGAdvisorsInTerritory()`, etc.
- Phase handler `initialize()` method does NOT check for WARTIME before starting phase
- No agent request type for WARTIME decisions
- No validation for PEACETIME restrictions (ally present)
- No validation for STORMED_IN restrictions (storm sector)
- No helper function to find all territories with advisors
- Karama cancellation not implemented (though listed in karama.ts)
- Public announcement not implemented

**Documentation:**
- Detailed report: `.notes/verification/wartime-rule-verification.md`
- Status: ❌ **NOT IMPLEMENTED** - Requires implementation

**Next Steps:**
1. Create helper function to find all territories with advisors
2. Create validation functions for PEACETIME and STORMED_IN restrictions
3. Add WARTIME check in phase handler `initialize()` method (before phase starts)
4. Create BG_WARTIME agent request type
5. Implement request handler for WARTIME decisions
6. Implement response processing with state mutation
7. Add public announcement events
8. Handle Karama cancellation
9. Write unit tests for all scenarios

---


## CHOAM Charity Auto-Claim Fix

**Issue:** Bene Gesserit automatically receives CHOAM charity every turn without player decision. Handler was auto-claiming when `passed` field was undefined, and no tools were available for explicit decisions.

**Game:** game_miljehzi_6f560fec  
**Phase:** choam_charity  
**Turn:** All turns (1, 2, 3+)

**Fix Applied:**
- Fixed handler logic to require explicit `CLAIM_CHARITY` action type (removed `!response.passed` condition)
- Created `claim_charity` and `pass` tools for CHOAM charity phase
- Registered tools in phase registry so agents can make explicit decisions
- Eligibility check verified correct (not a bug - Rule 2.02.09 correctly makes BG always eligible)

**Verification Needed:**
- [ ] Verify Bene Gesserit is asked for charity decision (not auto-claimed)
- [ ] Verify charity is only given when agent explicitly calls `claim_charity` tool
- [ ] Verify charity is declined when agent calls `pass` tool or doesn't respond
- [ ] Verify BG advanced ability (2.02.09) only affects eligibility, not auto-claiming
- [ ] Verify all factions (not just BG) require explicit claim decision
- [ ] Test with game_miljehzi_6f560fec scenario or similar
- [ ] Verify tools are available during CHOAM_CHARITY phase
- [ ] Verify agent response parsing correctly converts `claim_charity` → `CLAIM_CHARITY` action type

**Verification Results (2025-12-01):**
- ✅ **VERIFIED (NEW GAMES)** - CHOAM Charity phase tests all pass using the dedicated test suite:
  - `pnpm test:choam-charity` (`src/lib/game/phase-tests/choam-charity/test-choam-charity.ts`)
- Behavior verified:
  - Eligible factions always receive explicit requests (no auto-claim).
  - Charity is granted only when an agent explicitly chooses to claim (CLAIM_CHARITY).
  - PASS decisions correctly decline charity with no spice change.
  - Bene Gesserit advanced ability only affects eligibility; they still must claim.
  - Tools `claim_charity` and `pass` are available during CHOAM_CHARITY and map to `CLAIM_CHARITY` / `PASS` actions via the agent provider.
- Note: Historical game `game_miljehzi_6f560fec` still reflects pre-fix logs (phase completed without interaction), but the bug is fixed for all newly played games.

**Documentation:**
- Fix summary: `.csa/jobs/fix-bg-auto-choam-charity/FIXES.md`
- Status: ✅ **FIXES IMPLEMENTED** - ✅ **VERIFIED (NEW GAMES)** - Historical logs remain unchanged

---


## Stronghold Occupancy Limit Bug Fix

**Issue:** More than 2 factions can occupy a stronghold when Bene Gesserit has only advisors (no fighters). The `getFactionsInTerritory()` function excludes BG advisors for battle purposes, but was incorrectly used for occupancy validation, allowing 3+ factions in strongholds.

**Game:** game_miljehzi_6f560fec  
**Phase:** shipment_movement, battle  
**Turn:** 2

**Fix Applied:**
- Updated all 8 occupancy validation call sites to use `getFactionsOccupyingTerritory()` instead of `getFactionsInTerritory()`
  - `validateShipment()`, `generateShipmentSuggestions()`, `validateMovement()`, `findPath()`, `getReachableTerritories()`, `generateMovementSuggestions()`, `validateCrossShip()`, `fremen_send_forces` tool
- Updated helper functions: `getStrongholdOccupancy()`, `canShipToTerritory()`, `validateStrongholdOccupancy()`
- Added defensive validation in `shipForces()` and `moveForces()` to catch violations even if pre-validation is bypassed
- `getFactionsOccupyingTerritory()` includes ALL factions with forces (including BG advisors) for accurate occupancy counting

**Verification Needed:**
- [ ] Verify that BG advisors + 2 other factions in stronghold blocks 3rd faction from entering
- [ ] Verify that validation correctly counts BG advisors toward the 2-faction limit
- [ ] Verify that battle identification still works correctly (excludes BG advisors for battles)
- [ ] Verify pathfinding correctly blocks movement through full strongholds
- [ ] Verify suggestions don't include full strongholds
- [ ] Test with game_miljehzi_6f560fec Turn 2 scenario to ensure no violations occur
- [ ] Verify defensive validation in mutation functions catches any bypassed violations

**Documentation:**
- Investigation: `.csa/jobs/fix-bg-auto-choam-charity/task-1-issues.md`
- Analysis: `.csa/jobs/fix-bg-auto-choam-charity/analysis.md`
- Issues: `.csa/jobs/fix-bg-auto-choam-charity/issues.md`
- Complete Documentation: `.csa/jobs/fix-bg-auto-choam-charity/DOCUMENTATION.md`
- Status: ✅ **FIXES IMPLEMENTED** - Ready for verification testing

---

- [ ] Verify fix for Atreides self-outbidding in bidding phase (game `game_mimwe69l_04aea3bc`, Turn 1, Bidding phase: ensure current high bidder cannot place a higher bid on their own auction)
