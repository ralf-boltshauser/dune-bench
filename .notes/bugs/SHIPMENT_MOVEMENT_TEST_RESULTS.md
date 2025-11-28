# Shipment & Movement Phase: Test Results

**Test Date**: 2025-11-27
**Simulation Command**: `npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,fremen,spacing_guild,bene_gesserit --turns 2 --only shipment_movement`

**Factions Tested**: Atreides, Harkonnen, Fremen, Spacing Guild, Bene Gesserit
**Storm Order**: Atreides → Harkonnen → Fremen → Spacing Guild → Bene Gesserit
**Initial Storm Sector**: 0

---

## Executive Summary

**CRITICAL BUGS FOUND**: 5
**Status**: FAILED - Multiple critical rule violations

The Shipment & Movement phase implementation has several critical bugs that violate the official rules:

1. **CRITICAL**: Guild timing is fundamentally broken - Guild is asked TWICE per turn instead of once
2. **CRITICAL**: Current faction tracking is broken - shows "null" instead of actual faction
3. **CRITICAL**: Fremen faction is completely skipped - never asked to act
4. **SEVERE**: Guild "delay" incorrectly skipped over Fremen entirely
5. **MINOR**: Guild should go last after BG when delayed, but was skipped

---

## Detailed Analysis

### Rule Verification Table

| Rule | Description | Status | Evidence |
|------|-------------|--------|----------|
| 1.06.12.01 | Each faction does ship THEN move sequentially | PARTIAL | Works for Atreides/Harkonnen/BG but Fremen skipped |
| 2.06.12.01 | Guild can act AHEAD OF SCHEDULE (before turn) | BROKEN | Guild asked twice - before first AND at normal position |
| 2.06.12.02 | Guild can use HOLDING PATTERN (delay to last) | BROKEN | Guild "wait" skipped Fremen, didn't go last after BG |
| 2.04.03 | Fremen free shipment to Great Flat area | UNTESTED | Fremen never asked to act |
| 2.04.04 | Fremen can move 2 territories instead of 1 | UNTESTED | Fremen never asked to act |
| 2.02.05 | BG Spiritual Advisors after other factions ship | NOT SEEN | Should trigger after Harkonnen/Atreides ship |
| 1.06.03.08 | Alliance constraint after EACH faction completes | CORRECT | Applied after each faction |

---

## Critical Bug #1: Guild Timing Asked TWICE

### The Problem

The Guild was asked about timing **TWO TIMES** in a single turn:

1. **First ask**: "Do you want to go FIRST?" (before Atreides)
2. **Second ask**: "Do you want to ACT NOW or DELAY?" (at their normal storm order position)

### Expected Behavior (from rules)

**Rule 2.06.12**: "SHIP AS IT PLEASES YOU: During the Shipment and Movement Phase you may activate either ability SHIP AND MOVE AHEAD OF SCHEDULE [2.06.12.01] or HOLDING PATTERN [2.06.12.02]. The rest of the factions must make their shipments and movements in the proper sequence. **You do not have to make known when you intend to make your shipment and movement action until the moment you wish to take it.**"

**Correct interpretation**:
- Guild should be asked ONLY ONCE: "When do you want to act? (Now/Later/Last)"
- Once Guild makes a decision, they should NOT be asked again
- If Guild says "act now" - they ship and move immediately, then are DONE
- If Guild says "wait" - they continue to be offered the chance before each subsequent faction
- If Guild says "delay" - they skip their normal turn and go after all other factions

### Observed Behavior

```
Turn 1:
⏰ GUILD TIMING: Do you want to go FIRST?
   Next faction: Atreides
   Guild response: ✓ Action: GUILD_ACT_NOW

⚠️  No response from null   <-- BUG: Current faction is NULL

🚢 SHIPMENT: Harkonnen     <-- Skipped Atreides AND Guild shipment
   ... Harkonnen ships and moves ...

⏰ GUILD TIMING: Do you want to ACT NOW or DELAY?   <-- BUG: ASKED AGAIN
   Guild response: ✓ Action: GUILD_WAIT
```

### Root Cause

In `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/shipment-movement.ts`:

**Lines 271-293**: When Guild chooses "act_now", the code sets:
```typescript
this.guildTimingState = 'acting_now';
this.currentFaction = Faction.SPACING_GUILD;
this.currentFactionPhase = 'AWAITING_SHIP';
return this.requestShipmentDecision(state, events);
```

But the next `processStep` call:
- **Line 134**: Checks `currentResponse.factionId === this.currentFaction`
- Fails to find a response because Guild's timing decision response is not a shipment response
- **Line 136**: Returns `advanceToNextAction(newState, events)`
- **Line 377**: Increments `this.currentFactionIndex++`
- **Line 378**: Calls `startNextFaction()` again

Then in `startNextFaction()` at **lines 327-328**:
```typescript
if (faction === Faction.SPACING_GUILD && this.guildTimingState === 'not_decided') {
    return this.askGuildTiming(state, events, 'guild_turn');
```

This checks if Guild's timing is "not_decided", but it was never set to 'completed' after they acted.

### Fix Required

**Location**: `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/shipment-movement.ts`

**Lines 258-293** (`processGuildTimingDecision`):

When Guild chooses to "act_now":
1. Set `this.guildTimingState = 'completed'` (not 'acting_now')
2. Mark `this.factionsCompleted.add(Faction.SPACING_GUILD)`
3. ONLY THEN set `this.currentFaction` and request shipment

When Guild chooses to "wait":
1. Keep `this.guildTimingState = 'waiting'`
2. DO NOT reset to 'not_decided' in line 336

**Lines 327-338** (`startNextFaction`):

Change the Guild timing check:
```typescript
// OLD:
if (faction === Faction.SPACING_GUILD && this.guildTimingState === 'not_decided') {
    return this.askGuildTiming(state, events, 'guild_turn');
}

// NEW:
if (faction === Faction.SPACING_GUILD) {
    if (this.guildTimingState === 'completed') {
        // Guild already acted - skip
        this.currentFactionIndex++;
        continue;
    }
    if (this.guildTimingState === 'not_decided') {
        return this.askGuildTiming(state, events, 'guild_turn');
    }
    // If 'waiting', continue to next faction
}
```

---

## Critical Bug #2: Current Faction Is NULL

### The Problem

```
⏰ GUILD TIMING: Do you want to go FIRST?
   Guild response: ✓ Action: GUILD_ACT_NOW

⚠️  No response from null   <-- BUG: Should be "No response from SPACING_GUILD"
```

### Root Cause

**Lines 271-278**: When Guild timing decision is processed:
```typescript
this.guildTimingState = 'acting_now';
this.currentFaction = Faction.SPACING_GUILD;  // Set current faction
this.currentFactionPhase = 'AWAITING_SHIP';
return this.requestShipmentDecision(state, events);  // Request shipment
```

But then in `processStep` at **lines 133-136**:
```typescript
const currentResponse = responses.find(r => r.factionId === this.currentFaction);
if (!currentResponse) {
    console.error(`⚠️  No response from ${this.currentFaction}`);  // NULL here
    return this.advanceToNextAction(newState, events);
}
```

The problem is that `this.currentFaction` was set to `SPACING_GUILD`, but the response contains:
- `factionId: Faction.SPACING_GUILD`
- `actionType: 'GUILD_ACT_NOW'` (not 'SHIP_FORCES')

The find() fails because the next request is for shipment, but the response is still the timing decision.

### Fix Required

The flow needs to be:
1. Ask Guild timing → Get timing response → Process timing response
2. If Guild acts now → Ask Guild shipment → Get shipment response → Process shipment
3. Then ask Guild movement → etc.

The bug is that timing decision response is being processed in the NEXT iteration, where it's looking for a shipment response.

**Solution**: In `processGuildTimingDecision` at lines 271-278, after setting current faction, the code should:
1. NOT increment faction index
2. Set state properly so next processStep knows to ask for shipment
3. OR: Handle the timing decision and immediately ask for shipment in the SAME request

---

## Critical Bug #3: Fremen Completely Skipped

### The Problem

The Fremen faction never received a shipment or movement decision request. The turn order was:
1. Guild (timing decision - "act now") → ERROR
2. Harkonnen (ship + move) → SUCCESS
3. Atreides (ship + move) → SUCCESS
4. Guild (timing decision AGAIN - "wait") → BUG
5. Bene Gesserit (ship + move) → SUCCESS
6. **Fremen: NEVER ASKED**

### Expected Storm Order

```
Storm Order: Atreides → Harkonnen → Fremen → Spacing Guild → Bene Gesserit
```

### Observed Execution Order

```
1. Guild (timing - says "act now") [SHOULD SHIP+MOVE BUT DOESN'T]
2. Harkonnen (ship + move)
3. Atreides (ship + move)
4. Guild (timing - says "wait") [ASKED AGAIN - BUG]
5. Bene Gesserit (ship + move)
```

Fremen was completely missing from the execution.

### Root Cause

**Lines 285-286**: When Guild says "delay":
```typescript
this.guildDelayed = true;
this.factionsCompleted.add(Faction.SPACING_GUILD); // Skip in normal order
```

But when Guild says "wait" at **line 291**:
```typescript
this.guildTimingState = 'waiting';
return this.startNextFaction(state, events);
```

The problem is in **lines 318-324** (`startNextFaction`):
```typescript
while (this.currentFactionIndex < state.stormOrder.length) {
    const faction = state.stormOrder[this.currentFactionIndex];

    if (this.factionsCompleted.has(faction)) {
        this.currentFactionIndex++;
        continue;  // Skip this faction
    }
```

The issue: When the code goes to find the next faction, `currentFactionIndex` was already incremented somewhere, causing it to skip over a faction.

**Trace**:
1. Initial index = 0 (Atreides)
2. Guild acts first (or tries to), index remains 0
3. Something increments index
4. Harkonnen acts (index 1)
5. Atreides acts (index 0 - out of order!)
6. Index jumps to skip Fremen (index 2)
7. Guild asked again (index 3)
8. BG acts (index 4)

### Fix Required

The faction index management is broken. The code needs to:
1. Initialize `currentFactionIndex = 0`
2. Only increment when a faction COMPLETES (both ship + move)
3. When Guild acts out of order, DON'T increment the index
4. Track which factions have completed separately from the index

---

## Critical Bug #4: Guild Delay Doesn't Work Correctly

### The Problem

When Guild says "wait", it should mean:
- "I don't want to act right now"
- "Ask me again before the next faction"
- Continue asking until Guild either acts or reaches their normal position

When Guild says "delay" (HOLDING PATTERN), it should mean:
- "Skip my normal turn"
- "I will go after ALL other factions"

### Observed Behavior

```
⏰ GUILD TIMING: Do you want to go FIRST?
   Guild: ✓ Action: GUILD_ACT_NOW
   [FAILS TO ACT]

[After Harkonnen and Atreides]

⏰ GUILD TIMING: Do you want to ACT NOW or DELAY?
   Guild: ✓ Action: GUILD_WAIT

[Bene Gesserit acts]
[Phase ends - Guild never acts]
```

Guild said "WAIT" (not "DELAY"), but was never asked again. The correct behavior:
- Guild says "WAIT" → Continue to next faction (BG)
- Before BG acts, ask Guild again: "Do you want to act before BG?"
- If Guild still waits, then BG acts
- After BG, if Guild hasn't acted yet and hasn't delayed, Guild MUST go now

### Fix Required

**Lines 331-338**: The logic for asking Guild again is present but not working:
```typescript
// Check if Guild wants to act before this faction
if (state.factions.has(Faction.SPACING_GUILD) &&
    this.guildTimingState === 'waiting' &&
    !this.factionsCompleted.has(Faction.SPACING_GUILD)) {
    // Reset Guild state to ask again
    this.guildTimingState = 'not_decided';  // BUG: This resets it
    return this.askGuildTiming(state, events, 'before_faction');
}
```

The bug: Resetting to 'not_decided' causes the Guild to be asked at their normal position AGAIN.

**Solution**: Don't reset the state. Instead:
```typescript
if (state.factions.has(Faction.SPACING_GUILD) &&
    this.guildTimingState === 'waiting' &&
    !this.factionsCompleted.has(Faction.SPACING_GUILD)) {
    // Ask Guild again WITHOUT resetting state
    return this.askGuildTiming(state, events, 'before_faction');
}
```

---

## Bug #5: BG Spiritual Advisors Not Triggered

### Expected Behavior

**Rule 2.02.05**: "SPIRITUAL ADVISORS: Whenever any other faction Ships Forces onto Dune from off-planet, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink."

**Advanced Rule 2.02.14**: "ADVISORS: When using ability Spiritual Advisors [2.02.05], you may send 1 advisor for free from your reserves into the same Territory (and same Sector) that faction ships to, in place of sending a fighter to the Polar Sink."

### Observed Behavior

```
🚢 SHIPMENT: Harkonnen
   ✅ Shipped 10 forces to sietch_tabr (sector 13) for 10 spice

[NO BG PROMPT HERE]

🚶 MOVEMENT: Harkonnen
   [continues to movement]
```

After Harkonnen shipped 10 forces, BG should have been asked: "Harkonnen just shipped to Sietch Tabr. Do you want to send a spiritual advisor?"

Similarly after Atreides shipped 5 forces to Arrakeen.

### Why This Matters

This is a key BG ability that:
1. Lets BG place forces for FREE
2. Can be used to infiltrate territories
3. In advanced rules, can place advisors to spy on other factions
4. Is an important balancing mechanism for BG's limited resources

### Root Cause

The code has a method `requestBGSpiritualAdvisor()` at **lines 714-759**, but it's NEVER CALLED.

In `processShipment()` at **lines 502-536**, after a faction ships:
```typescript
console.log(`   ✅ Shipped ${count} forces to ${territoryId} (sector ${sector ?? 0}) for ${cost ?? 0} spice\n`);

newEvents.push({
    type: 'FORCES_SHIPPED',
    ...
});

return { state: newState, events: newEvents };
```

There's no code that checks "Was this another faction? If yes and BG is in game, ask BG about spiritual advisors."

### Fix Required

**Location**: Lines 502-536 in `processShipment()`

After line 533, before the return, add:
```typescript
// Rule 2.02.05: BG Spiritual Advisors
if (faction !== Faction.BENE_GESSERIT &&
    state.factions.has(Faction.BENE_GESSERIT) &&
    !this.factionsCompleted.has(Faction.BENE_GESSERIT)) {
    // BG can respond to this shipment
    this.waitingForBGSpiritualAdvisor = true;
    this.bgTriggeringShipment = { territory: territoryId, sector: sector ?? 0 };

    // DON'T move to movement yet - ask BG first
    // Return a request for BG spiritual advisor decision
}
```

And in `processStep()` at **lines 123-184**, add a check:
```typescript
// 1.5. Handle BG spiritual advisor decision
if (this.waitingForBGSpiritualAdvisor) {
    return this.processBGSpiritualAdvisorDecision(newState, responses, events);
}
```

---

## Untested Faction Abilities

Because Fremen was skipped and Guild didn't actually ship/move, these abilities were not tested:

### Fremen Abilities (Not Tested)

1. **Free Shipment** (Rule 2.04.03): "During the Shipment [1.06.03], you may Send any or all your reserves for free onto the Great Flat or onto any one Territory on the Map within two territories of the Great Flat (subject to storm and Occupancy Limit). This ability costs 1 shipment action to use."

2. **Extended Movement** (Rule 2.04.04): "During movement you may Move your Forces two territories instead of one."

3. **Great Flat Special Zone**: Fremen can ship to Great Flat, which is not a standard territory but a special area.

### Spacing Guild Abilities (Partially Tested)

1. **Cross-Ship** (Rule 2.06.05.01): "You may ship any number of Forces from any one Territory to any other Territory on the board." - NOT TESTED (Guild never actually shipped)

2. **Off-Planet Retreat** (Rule 2.06.05.02): "You may ship any number of Forces from any one Territory back to your reserves." - NOT TESTED

3. **Half Price Shipping** (Rule 2.06.07): "You pay only half the normal price (rounded up) when shipping your Forces." - NOT TESTED

4. **Payment for Shipment** (Rule 2.06.04): "When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank." - UNCLEAR if this was applied when Harkonnen/Atreides shipped

---

## What Worked Correctly

### 1. Alliance Constraint (Rule 1.06.03.08) ✓

After each faction completed their ship + move, the code correctly checked for alliance constraint:

```
   ✅ Harkonnen completed ship + move
[No alliance - no constraint]

   ✅ Atreides completed ship + move
[No alliance - no constraint]

   ✅ Bene Gesserit completed ship + move
[No alliance - no constraint]
```

The code at **lines 594-676** correctly:
- Checks if faction has an ally
- Finds territories where both faction and ally have forces
- Excludes Polar Sink
- Sends forces to Tleilaxu Tanks

### 2. Sequential Ship → Move Per Faction ✓

For the factions that DID act (Harkonnen, Atreides, BG), the sequence was correct:
1. Faction asked about shipment
2. Faction ships (or passes)
3. Faction asked about movement
4. Faction moves (or passes)
5. Alliance constraint applied
6. Next faction

This follows Rule 1.06.12.01: "The First Player conducts their Force Shipment action and then Force Movement action."

### 3. Ornithopter Detection ✓

```
🚶 MOVEMENT: Harkonnen
   Movement Range: 3 territoryies (Ornithopters)
```

Harkonnen has forces in Carthag (a stronghold), so they get ornithopter access and can move 3 territories. This is correctly detected at **line 459**: `const hasOrnithopters = checkOrnithopterAccess(state, faction);`

### 4. Storm Sector Tracking ✓

```
📍 Storm Sector: 0
📋 Storm Order: Atreides → Harkonnen → Fremen → Spacing Guild → Bene Gesserit
```

The phase correctly displays storm information and uses it for validation (though we didn't see ships into storm sectors in this test).

---

## Recommended Test Scenarios (After Fixes)

Once the bugs are fixed, run these scenarios to verify:

### Test 1: Guild Acts First
```bash
npx tsx src/lib/game/run-game.ts --factions spacing_guild,atreides,harkonnen --only shipment_movement
```
Expected: Guild should be asked once, choose to act first, ship + move, then other factions proceed. Guild should NOT be asked again.

### Test 2: Guild Uses Holding Pattern
```bash
npx tsx src/lib/game/run-game.ts --factions atreides,spacing_guild,harkonnen --only shipment_movement
```
Expected: Guild should delay at their turn, other factions act in order, then Guild goes last after Harkonnen.

### Test 3: Guild Waits Multiple Times
```bash
npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,spacing_guild,emperor --only shipment_movement
```
Expected: Guild should be asked before Atreides (waits), before Harkonnen (waits), at their turn (acts now or delays). Should be asked at most N times where N = number of factions.

### Test 4: Fremen Free Shipment
```bash
npx tsx src/lib/game/run-game.ts --factions fremen,atreides --only shipment_movement
```
Expected: Fremen should be able to ship forces to Great Flat or territories near it for FREE. Cost should be 0 spice.

### Test 5: BG Spiritual Advisors
```bash
npx tsx src/lib/game/run-game.ts --factions atreides,bene_gesserit,harkonnen --only shipment_movement
```
Expected: After Atreides ships, BG should be asked if they want to send a spiritual advisor. Same after Harkonnen ships. BG should be asked 0-2 times depending on how many factions ship.

### Test 6: All Five Factions
```bash
npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,fremen,spacing_guild,bene_gesserit --turns 1 --only shipment_movement
```
Expected: All 5 factions should act in storm order (with Guild's special timing). Each faction should be asked exactly once for ship and once for move (unless they pass). BG should be asked about spiritual advisors after each off-planet shipment.

---

## Code Quality Observations

### Good Patterns

1. **Clear documentation**: The file header at lines 1-17 clearly explains the architecture and rule references. This is excellent.

2. **Type safety**: Uses TypeScript enums and types (`GuildTimingState`, `FactionPhase`) to track state machine states.

3. **Separation of concerns**: Request methods, processing methods, and helper methods are organized into clear sections.

4. **Rule references**: Many comments cite specific rules (e.g., "Rule 1.06.03.08", "Rule 2.06.12"), making it easy to cross-reference with the rules document.

### Issues

1. **State machine complexity**: The combination of `guildTimingState`, `currentFactionPhase`, `factionsCompleted`, and `currentFactionIndex` makes the state machine hard to reason about. Multiple state variables can become inconsistent.

2. **Missing error handling**: No validation that responses match expected action types. When Guild sends a timing decision but code expects a shipment response, it fails silently.

3. **Incomplete implementation**: The BG spiritual advisor code exists but is never called. This suggests the implementation is incomplete or partially refactored.

4. **Response handling mismatch**: The pattern of "ask for timing → process timing → ask for action → process action" requires two round-trips but the state machine treats them as one.

---

## Priority Fixes

### P0 (Critical - Breaks Game)

1. **Fix Guild timing to ask only once** - Lines 258-338
2. **Fix current faction NULL bug** - Lines 133-136, 271-278
3. **Fix Fremen being skipped** - Lines 318-378
4. **Fix faction index management** - Throughout file

### P1 (High - Missing Core Feature)

5. **Implement BG spiritual advisor triggering** - Lines 502-536, add call to `requestBGSpiritualAdvisor()`

### P2 (Medium - Incorrect Behavior)

6. **Fix Guild delay/wait distinction** - Lines 280-293, 331-338

---

## Conclusion

The Shipment & Movement phase has a solid architectural foundation with good documentation and clear rule references. However, the implementation has critical bugs in:

1. **Guild timing logic** - fundamental state machine errors causing Guild to be asked twice
2. **Faction sequencing** - Fremen is completely skipped due to index management bugs
3. **Current faction tracking** - NULL instead of actual faction name
4. **BG spiritual advisors** - code exists but never called

**Recommendation**: Before proceeding to test other phases, fix these P0 bugs. The faction sequencing logic needs to be refactored to be more robust - consider a simpler state machine with explicit "IDLE → TIMING_DECISION → AWAITING_SHIP → SHIPPED → AWAITING_MOVE → COMPLETED" states per faction.

The code quality and organization is good, but the implementation has fundamental logic errors that need to be fixed before the phase can work correctly.
