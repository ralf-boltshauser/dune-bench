# SHIPMENT & MOVEMENT PHASE BUG REPORT

**Analysis Date:** 2025-11-27
**Files Analyzed:**
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/handwritten-rules/shipment-movement.md` (Authoritative Rules)
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/shipment-movement.ts` (Phase Handler)
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/tools/actions/shipment.ts` (Shipment Tool)
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/tools/actions/movement.ts` (Movement Tool)
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/rules/movement.ts` (Movement Rules)

---

## CRITICAL BUGS

### BUG-01: Incorrect Phase Structure - Separate Sub-Phases vs Sequential Actions

**Severity:** CRITICAL
**Rule Reference:** Line 3 - "The First Player conducts their Force Shipment action and then Force Movement action. Play proceeds in Storm Order until all players have completed this Phase."

**Expected Behavior (per rules):**
Each faction should complete BOTH their shipment AND movement actions sequentially before the next faction in storm order acts. The sequence should be:
1. Faction 1: Ship → Move
2. Faction 2: Ship → Move
3. Faction 3: Ship → Move
etc.

**Actual Behavior (in code):**
The implementation uses two separate sub-phases:
1. ALL factions complete shipment (Faction 1 ships, Faction 2 ships, Faction 3 ships...)
2. THEN ALL factions complete movement (Faction 1 moves, Faction 2 moves, Faction 3 moves...)

Lines 46-54 define separate SHIPMENT and MOVEMENT sub-phases with tracking sets.
Lines 459-540 show the logic switches between sub-phases only after all factions complete one action.

**Fix Required:**
Completely restructure the phase handler to process shipment and movement sequentially per faction instead of in separate sub-phases. Each faction should complete both actions before the next faction acts.

**Code Location:**
- `shipment-movement.ts:46-54` - SubPhase type and tracking sets
- `shipment-movement.ts:59-92` - initialize() only starts with shipment
- `shipment-movement.ts:455-540` - continueToNextFaction() separates into sub-phases
- Entire handler architecture needs refactoring

---

### BUG-02: Spacing Guild Payment Incorrect - Wrong Amount and Timing

**Severity:** CRITICAL
**Rule Reference:** Line 64 - "PAYMENT FOR SHIPMENT: When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank."

**Expected Behavior (per rules):**
When any other faction ships forces, they pay the FULL shipment cost to the Spacing Guild (NOT to the bank). For example, if shipping 5 forces to a stronghold costs 5 spice, the Guild receives all 5 spice.

**Actual Behavior (in code):**
In `shipment.ts:73-79`, the code:
1. Removes cost from the shipping faction (line 74)
2. Pays only HALF the cost to the Guild: `Math.floor(cost / 2)` (line 78)
3. The other half disappears (goes to neither bank nor Guild)

```typescript
newState = removeSpice(newState, faction, cost);
// Pay Guild if in game
if (newState.factions.has(Faction.SPACING_GUILD) && faction !== Faction.SPACING_GUILD) {
  newState = addSpice(newState, Faction.SPACING_GUILD, Math.floor(cost / 2));
}
```

**Fix Required:**
Change line 78 in `shipment.ts` from:
```typescript
newState = addSpice(newState, Faction.SPACING_GUILD, Math.floor(cost / 2));
```
to:
```typescript
newState = addSpice(newState, Faction.SPACING_GUILD, cost);
```

The Guild receives the FULL payment, not half.

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts:78` - Wrong calculation

---

### BUG-03: Spacing Guild Timing Logic Fundamentally Broken

**Severity:** CRITICAL
**Rule Reference:** Lines 74-77 - "SHIP AS IT PLEASES YOU: During the Shipment and Movement Phase you may activate either ability SHIP AND MOVE AHEAD OF SCHEDULE or HOLDING PATTERN. The rest of the factions must make their shipments and movements in the proper sequence. You do not have to make known when you intend to make your shipment and movement action until the moment you wish to take it."

**Expected Behavior (per rules):**
1. Guild can act at ANY point during the phase (before any faction, after any faction, or at their normal position)
2. Guild does BOTH shipment and movement together when they act
3. "until the moment you wish to take it" implies Guild should be asked ONCE per opportunity, not continuously
4. Guild can go first, go last, or interrupt anywhere in storm order
5. Once Guild acts, they're done - they don't get asked again

**Actual Behavior (in code):**
Multiple architectural problems:

**Problem 3A: Asked Multiple Times in WRONG Context**
Lines 86-88, 148-150, 170-172, 493-495 - Guild is asked before each faction's turn in BOTH sub-phases. This creates up to 2×N opportunities (where N = number of factions), which is wrong. Guild should be asked at natural transition points in the sequential flow, not before every sub-phase action.

**Problem 3B: Sub-Phase Structure Incompatible with Guild Timing**
Because the code uses separate sub-phases (shipment-then-movement for all), the Guild timing ability doesn't work correctly. The rules assume a sequential structure (each faction ships+moves) where Guild can insert themselves. The sub-phase structure breaks this model.

**Problem 3C: Incomplete State Tracking**
Line 57: `guildActed` flag resets at line 484 when switching sub-phases, which could allow Guild to act twice (once in shipment sub-phase, once in movement sub-phase). The rules state Guild does BOTH actions together ONCE.

**Problem 3D: Wrong Logic for "Act Now"**
Lines 103-130 show that if Guild acts during SHIPMENT sub-phase, they do both ship and move. But this happens in isolation from the sub-phase structure, creating inconsistency. The code doesn't properly handle what happens to the faction sequence after Guild acts.

**Fix Required:**
This requires complete architectural redesign:
1. Remove sub-phase model (fixes BUG-01)
2. Implement sequential faction processing where each faction does ship→move
3. Before each faction's turn, offer Guild the option to act instead
4. Once Guild acts (or explicitly waits), mark them as handled for the entire phase
5. Track Guild's position choice and execute accordingly

**Code Location:**
- `shipment-movement.ts:56-57` - Guild state tracking
- `shipment-movement.ts:86-88, 148-150, 170-172, 493-495` - Multiple Guild timing checks
- `shipment-movement.ts:277-363` - Guild timing decision logic
- Entire phase architecture

---

### BUG-04: Fremen Free Shipment Not Implemented

**Severity:** CRITICAL
**Rule Reference:** Line 37 - "SHIPMENT: During the Shipment, you may Send any or all your reserves for free onto the Great Flat or onto any one Territory on the Map within two territories of the Great Flat (subject to storm and Occupancy Limit). This ability costs 1 shipment action to use."

**Expected Behavior (per rules):**
Fremen have a special shipment ability:
- Can ship forces for FREE (no spice cost)
- Can only ship to Great Flat OR territories within 2 territories of Great Flat
- Still subject to storm and occupancy limits
- Uses their one shipment action

**Actual Behavior (in code):**
1. `movement.ts:62-71` completely blocks Fremen from shipping: "Fremen cannot use normal shipment"
2. No alternative shipment tool or logic exists for Fremen's free placement ability
3. Fremen reserves are marked as 'reserves_local' in faction config (line 106 of faction-config.ts) but there's no code that implements their special shipment rules

**Fix Required:**
1. Create a new tool `fremen_send_forces` that implements the free shipment to Great Flat area
2. Calculate which territories are within 2 of Great Flat
3. Allow free shipment (no spice cost) only to those territories
4. Make this tool available only to Fremen during shipment
5. Remove the blanket block in movement.ts and replace with conditional logic

**Code Location:**
- `src/lib/game/rules/movement.ts:62-71` - Blocks Fremen from shipping entirely
- `src/lib/game/tools/actions/shipment.ts` - Missing Fremen-specific tool
- Need to add territory distance calculations for Great Flat range

---

### BUG-05: Bene Gesserit Spiritual Advisors Not Implemented

**Severity:** CRITICAL
**Rule Reference:** Line 96 - "SPIRITUAL ADVISORS: Whenever any other faction Ships Forces onto Dune from off-planet, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink."

**Expected Behavior (per rules):**
Whenever another faction ships forces from reserves:
1. Bene Gesserit is offered the opportunity to ship 1 fighter to Polar Sink for free
2. This happens as a reaction to each other faction's shipment
3. Advanced rules (lines 101-102): Can send 1 advisor to the same territory/sector instead if no fighters present there
4. This doesn't count as BG's shipment action

**Actual Behavior (in code):**
No implementation exists anywhere:
- No tool for BG advisor placement
- No reactive logic in shipment processing
- No checks for when other factions ship
- Phase handler doesn't track or trigger BG responses

**Fix Required:**
1. Create `bg_send_spiritual_advisor` tool for Basic rules (fighter to Polar Sink)
2. Create `bg_send_advisor_to_territory` tool for Advanced rules (advisor to same territory)
3. In processShipment(), after any non-BG faction ships, check if BG is in game
4. If yes, create a pending request for BG to optionally use spiritual advisor ability
5. Process BG's response before continuing to next faction
6. Track that this doesn't count against BG's normal shipment action

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts` - Missing BG tools
- `src/lib/game/phases/handlers/shipment-movement.ts:703-741` - processShipment() needs BG hooks
- Need advisor vs fighter force type tracking (currently not implemented)

---

### BUG-06: Guild Cross-Ship Ability Not Implemented

**Severity:** HIGH
**Rule Reference:** Line 66 - "CROSS-SHIP: You may ship any number of Forces from any one Territory to any other Territory on the board."

**Expected Behavior (per rules):**
Spacing Guild has three types of shipment:
1. Normal shipment (reserves to territory) - implemented
2. Cross-ship (territory to territory on-board) - NOT implemented
3. Off-planet (territory back to reserves) - NOT implemented

Cross-ship allows Guild to move forces as a shipment action, not bound by movement range limits.

**Actual Behavior (in code):**
Only normal shipment from reserves is implemented. The `ship_forces` tool only handles reserve→territory shipment (line 29-96 of shipment.ts). No cross-ship or off-planet tools exist.

**Fix Required:**
1. Create `guild_cross_ship` tool that moves forces territory→territory as shipment (not movement)
2. Create `guild_ship_off_planet` tool that returns forces to reserves (line 67-69: "OFF-PLANET: You may ship any number of Forces from any one Territory back to your reserves")
3. Make these tools available only to Guild during shipment
4. Cross-ship uses half-price shipping cost (same as normal shipment)
5. Off-planet retreat cost: 1 spice per 2 forces (line 69)

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts` - Missing Guild-specific tools
- Need to add to tool registry for Guild faction

---

### BUG-07: Fremen 2-Territory Movement Not Implemented

**Severity:** HIGH
**Rule Reference:** Line 38 - "MOVEMENT: During movement you may Move your Forces two territories instead of one."

**Expected Behavior (per rules):**
Fremen can move 2 territories (not 1) during movement phase, regardless of ornithopter access.

**Actual Behavior (in code):**
Partially implemented but incorrect. In `movement.ts:440-446`:
```typescript
export function getMovementRange(state: GameState, faction: Faction): number {
  // Fremen always move 2 territories
  if (faction === Faction.FREMEN) return 2;

  return checkOrnithopterAccess(state, faction) ? 3 : 1;
}
```

This correctly sets range to 2, BUT there's a critical issue: The code doesn't properly handle whether Fremen movement range stacks with ornithopters. If Fremen control Arrakeen/Carthag, should they move 2 or 3 territories?

**Expected Behavior (Clarified):**
Based on rule interpretation, Fremen's 2-territory movement appears to be their base ability (like desert movement), while ornithopters override this to 3 territories if they control Arrakeen/Carthag. The rule text "MOVEMENT: During movement you may Move your Forces two territories instead of one" suggests 2 is their standard, but ornithopters might still grant 3.

**Actual Behavior:**
Code always returns 2 for Fremen, never checking ornithopters.

**Fix Required:**
Need rule clarification, but likely should be:
```typescript
export function getMovementRange(state: GameState, faction: Faction): number {
  // Ornithopters override Fremen bonus
  if (checkOrnithopterAccess(state, faction)) return 3;

  // Fremen always move 2 territories without ornithopters
  if (faction === Faction.FREMEN) return 2;

  return 1;
}
```

**Code Location:**
- `src/lib/game/rules/movement.ts:440-446`

---

### BUG-08: Storm Order Processing After Guild Acts Not Handled

**Severity:** HIGH
**Rule Reference:** Lines 74-77 (Guild timing)

**Expected Behavior (per rules):**
When Guild acts out of order:
1. Guild completes both shipment and movement
2. Storm order continues from where it left off
3. Factions that already acted don't act again
4. Guild doesn't act again (already completed their turn)

**Actual Behavior (in code):**
Lines 103-130 show Guild acting, but the continuation logic (line 130: `continueToNextFaction`) doesn't properly track which faction should go next. The code calls `continueToNextFaction` which increments `currentFactionIndex`, but this may skip factions or cause other sequencing issues because:
- The index was pointing at a non-Guild faction
- Guild interrupts and acts
- Continuation increments the index, potentially skipping the faction that was about to act

**Fix Required:**
After Guild acts out of order:
1. Don't increment currentFactionIndex
2. Continue with the faction that was about to act when Guild interrupted
3. Mark Guild as completed so they're not asked again

**Code Location:**
- `shipment-movement.ts:103-131` - Guild action processing
- `shipment-movement.ts:455-540` - continueToNextFaction() needs to handle post-Guild state

---

### BUG-09: Alliance Constraint Applied at Wrong Time

**Severity:** HIGH
**Rule Reference:** Line 27 - "CONSTRAINT: At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks."

**Expected Behavior (per rules):**
"At the end of YOUR Shipment and Movement actions" means after EACH INDIVIDUAL faction completes their turn (both ship and move), check that faction for alliance violations.

**Actual Behavior (in code):**
Lines 521-536 show alliance constraint applied only once at the very end of the entire phase, after ALL factions have completed BOTH sub-phases. This is wrong for two reasons:
1. It should be checked after each faction's actions
2. The sub-phase model makes this timing even more wrong

**Fix Required:**
1. After each faction completes BOTH shipment and movement (in the corrected sequential model)
2. Immediately check that faction for alliance constraint violations
3. Send any violating forces to tanks before next faction acts

**Code Location:**
- `shipment-movement.ts:521-536` - Wrong timing (end of phase)
- `shipment-movement.ts:184-268` - applyAllianceConstraint() method
- Should be called per-faction, not at phase end

---

### BUG-10: Fremen Storm Migration Not Implemented

**Severity:** MEDIUM
**Rule Reference:** Line 52 - "STORM MIGRATION: You may Send your reserves into a storm at half loss."

**Expected Behavior (per rules):**
Fremen can ship forces into storm sectors, but half the forces (rounded up) are destroyed on arrival.

**Actual Behavior (in code):**
Shipment validation (movement.ts:116-128) blocks ALL factions from shipping into storm:
```typescript
// Check: Sector not in storm
if (isSectorInStorm(state, sector)) {
  errors.push(createError(...));
}
```

No exception or special case for Fremen.

**Fix Required:**
1. In validateShipment(), check if faction is Fremen
2. If Fremen shipping to storm, allow it but mark in validation context
3. In ship_forces execution, if Fremen shipping to storm, destroy half the forces (rounded up) after placement
4. Log this as storm migration

**Code Location:**
- `src/lib/game/rules/movement.ts:116-128` - Blocks storm shipment
- `src/lib/game/tools/actions/shipment.ts:execute` - Needs Fremen storm logic

---

### BUG-11: Missing Repositioning Movement Within Same Territory

**Severity:** MEDIUM
**Rule Reference:** Line 28 - "Repositioning: A player may use their movement action to reposition their Forces to relocate to a different Sector within the same Territory. Storm limitations still apply."

**Expected Behavior (per rules):**
A faction can use their movement action to move forces from one sector to another sector within the same territory (e.g., moving from Arrakeen sector 1 to Arrakeen sector 2). Storm restrictions still apply (can't move to sector in storm).

**Actual Behavior (in code):**
The movement validation (movement.ts:296-427) doesn't handle same-territory repositioning. The path-finding logic (lines 361-385) requires different territories:
```typescript
const path = findPath(fromTerritory, toTerritory, state.stormSector);
```

If fromTerritory === toTerritory, the path would be empty (line 457: `if (from === to) return []`), but this likely causes validation errors.

**Fix Required:**
1. In validateMovement(), detect if fromTerritory === toTerritory
2. If same territory, skip path validation
3. Only validate: fromSector !== toSector, toSector not in storm, sufficient forces
4. Allow the repositioning move

**Code Location:**
- `src/lib/game/rules/movement.ts:296-427` - validateMovement() needs same-territory case
- `src/lib/game/rules/movement.ts:452-496` - findPath() returns empty for same territory

---

### BUG-12: Payment to Spice Bank Missing When Guild Not in Game

**Severity:** MEDIUM
**Rule Reference:** Line 8 - "PAYMENT: All spice paid for Shipment is Placed in the Spice Bank."
Line 64 - "PAYMENT FOR SHIPMENT: When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank."

**Expected Behavior (per rules):**
- If Guild is NOT in game: spice paid for shipment goes to bank (lost from game)
- If Guild IS in game: spice paid for shipment goes to Guild (not bank)

**Actual Behavior (in code):**
In shipment.ts:73-79:
```typescript
newState = removeSpice(newState, faction, cost);
// Pay Guild if in game
if (newState.factions.has(Faction.SPACING_GUILD) && faction !== Faction.SPACING_GUILD) {
  newState = addSpice(newState, Faction.SPACING_GUILD, Math.floor(cost / 2)); // BUG: should be full cost
}
```

When Guild is NOT in game, the spice is removed but never goes to bank - it just disappears. While this has the same gameplay effect (spice leaves circulation), there's no bank tracking. Additionally, when Guild IS in game, only half goes to Guild (BUG-02), and the other half disappears instead of going to bank.

**Fix Required:**
1. If Guild in game: Pay FULL cost to Guild (fixes BUG-02)
2. If Guild NOT in game: Add explicit comment that spice goes to bank (removed from circulation)
3. Optionally: Add bank tracking to GameState if detailed accounting needed

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts:73-79`

---

### BUG-13: Occupancy Limit Not Enforced for Movement Through Strongholds

**Severity:** MEDIUM
**Rule Reference:** Line 25 - "Occupancy Limit: Like Shipment, Forces can not be moved into or through a Stronghold if Forces of two other players are already there."

**Expected Behavior (per rules):**
Cannot move THROUGH a stronghold that has 2 other factions (pathfinding should avoid it).

**Actual Behavior (in code):**
Movement validation checks destination occupancy (movement.ts:401-413), but the pathfinding algorithm (findPath, lines 452-496) doesn't check occupancy limits when traversing territories. It only checks storm blocking, not occupancy.

This means a path might be found that goes THROUGH a stronghold with 2+ factions, which should be invalid.

**Fix Required:**
1. In findPath(), when checking adjacent territories
2. If territory is a stronghold, check occupancy count
3. If 2+ other factions present, treat as blocked (can't path through)
4. Exception: If one of the factions is the moving faction, allow (they're already there)

**Code Location:**
- `src/lib/game/rules/movement.ts:452-496` - findPath() needs occupancy checking

---

### BUG-14: Guild Half-Price Shipping Calculation Error

**Severity:** MEDIUM
**Rule Reference:** Line 68 - "HALF PRICE SHIPPING: You pay only half the normal price (rounded up) when shipping your Forces."

**Expected Behavior (per rules):**
Guild pays half the normal price, ROUNDED UP. For example:
- Normal: 1 spice to stronghold → Guild pays: ceil(1/2) = 1 spice
- Normal: 2 spice to territory → Guild pays: ceil(2/2) = 1 spice
- Shipping 3 forces to stronghold: Normal 3 → Guild pays: ceil(3/2) = 2 spice

**Actual Behavior (in code):**
The calculation in movement.ts:195-199 uses Math.ceil correctly:
```typescript
if (faction === Faction.SPACING_GUILD) {
  return Math.ceil((baseRate * forceCount) / 2);
}
```

However, the PROMPT in shipment-movement.ts:397-404 is misleading:
```typescript
shippingCostToStronghold: Math.ceil(baseShippingCost / 2), // Half price
shippingCostElsewhere: Math.ceil((baseShippingCost * 2) / 2), // Half price
```

This shows cost "per force" but should show total cost for the number being shipped. The agent might make wrong decisions based on this context.

**Fix Required:**
Update the prompt context to clearly show the half-price calculation applies to total cost, not per-force cost. Or remove the pre-calculation and let the tool calculate it.

**Code Location:**
- `src/lib/game/phases/handlers/shipment-movement.ts:397-404` - Misleading prompt context
- Calculation in movement.ts:195-199 is correct

---

### BUG-15: Polar Sink Storm Protection Not Validated

**Severity:** LOW
**Rule Reference:** Line 26 - "SAFE HAVEN: The Polar Sink is never in storm."

**Expected Behavior (per rules):**
Polar Sink should always be accessible regardless of storm sector.

**Actual Behavior (in code):**
The territory definition likely has `protectedFromStorm: true` but the shipment validation (movement.ts:116-128) and movement validation (movement.ts:387-399) check `isSectorInStorm` without first checking if territory is protected.

The pathfinding (movement.ts:478-481) correctly checks protectedFromStorm:
```typescript
const canPass = adjDef.protectedFromStorm ||
  adjDef.sectors.length === 0 ||
  adjDef.sectors.some((s) => s !== stormSector);
```

**Fix Required:**
In validateShipment and validateMovement, check territory.protectedFromStorm before checking storm:
```typescript
if (!territory.protectedFromStorm && isSectorInStorm(state, sector)) {
  // error
}
```

**Code Location:**
- `src/lib/game/rules/movement.ts:116-128` - Shipment storm check
- `src/lib/game/rules/movement.ts:387-399` - Movement storm check

---

### BUG-16: Missing Sector Specification Prompt

**Severity:** LOW
**Rule Reference:** Lines 9 and 24 - "When shipping into a Territory lying in several Sectors, a player must make clear in which Sector of the Territory they choose to leave their Forces."

**Expected Behavior (per rules):**
When shipping or moving to a territory with multiple sectors, the faction must explicitly choose which sector.

**Actual Behavior (in code):**
The tools require a sector parameter (ShipForcesSchema and MoveForcesSchema), so this is technically implemented. However, the prompts don't emphasize the importance of sector choice for territories spanning multiple sectors.

**Fix Required:**
Enhance tool descriptions and prompts to emphasize:
1. Territories may span multiple sectors
2. Sector choice affects storm vulnerability
3. Sector choice affects which forces can be combined for movement

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts:29-44` - Tool description
- `src/lib/game/tools/actions/movement.ts:28-39` - Tool description

---

### BUG-17: No Tool for Passing Individual Actions

**Severity:** LOW
**Rule Reference:** Line 3 (implied) - Players can choose not to ship or not to move.

**Expected Behavior (per rules):**
A faction might want to:
- Ship but not move
- Move but not ship
- Pass on both

**Actual Behavior (in code):**
Tools exist: `pass_shipment` (line 101-116 of shipment.ts) and `pass_movement` (line 99-116 of movement.ts). This is correctly implemented.

**Fix Required:**
None - this is working correctly. Listed here for completeness.

**Code Location:**
- `src/lib/game/tools/actions/shipment.ts:101-116` - pass_shipment (working)
- `src/lib/game/tools/actions/movement.ts:99-116` - pass_movement (working)

---

## SUMMARY

**Total Bugs Found:** 17
- Critical: 6 (BUG-01 through BUG-06)
- High: 4 (BUG-07 through BUG-09, BUG-13)
- Medium: 6 (BUG-10 through BUG-12, BUG-14, BUG-15)
- Low: 1 (BUG-16)
- Non-issue: 1 (BUG-17)

**Most Critical Issues:**
1. **BUG-01**: Wrong phase structure (sub-phases vs sequential) - architectural flaw
2. **BUG-02**: Guild payment incorrect (half instead of full)
3. **BUG-03**: Guild timing system fundamentally broken
4. **BUG-04**: Fremen free shipment completely missing
5. **BUG-05**: Bene Gesserit spiritual advisors completely missing
6. **BUG-06**: Guild cross-ship and off-planet abilities missing

**Recommended Fix Priority:**
1. Fix BUG-02 (Guild payment) - simple one-line fix
2. Fix BUG-04 (Fremen shipment) - implement missing ability
3. Fix BUG-05 (BG advisors) - implement missing ability
4. Refactor phase structure to fix BUG-01, which will naturally fix BUG-03, BUG-08, and BUG-09
5. Add Guild shipment variants (BUG-06)
6. Fix movement and validation issues (BUG-07, BUG-10, BUG-11, BUG-13)
7. Polish and minor fixes (remaining bugs)

**Architectural Recommendation:**
The shipment/movement phase needs a complete refactor. The current sub-phase model is incompatible with the Guild's timing ability and makes the phase logic overly complex. A cleaner design would be:

```typescript
for each faction in storm order:
  if faction === Guild and Guild.hasChosenWhen:
    continue; // Guild acts at their chosen time

  before_faction_turn:
    if Guild hasn't acted:
      offer Guild chance to act now
      if Guild acts:
        process_guild_ship_and_move()
        mark Guild as acted
        continue;

  process_faction_ship()
  process_faction_move()
  check_alliance_constraint(faction)

  after_faction_turn:
    if Guild hasn't acted and wants to delay:
      offer Guild chance to act now
```

This sequential model is much simpler and correctly handles all timing cases.
