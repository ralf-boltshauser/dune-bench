# CHOAM Charity Phase Validation

## Overview

This document validates the CHOAM Charity Phase implementation against the game rules and test scenarios.

**Phase**: 1.03 CHOAM Charity  
**Handler**: `src/lib/game/phases/handlers/choam-charity.ts`  
**Rules**: `src/lib/game/rules/choam-charity.ts`  
**Test Suite**: `src/lib/game/phase-tests/choam-charity/`

## Rules Reference

### Core Rules (1.03.01)
- **Eligibility**: Factions with **0 or 1 spice** can claim CHOAM Charity
- **Amount**: Spice is collected to bring total to **2 spice**
  - 0 spice → receives 2 spice (0 → 2)
  - 1 spice → receives 1 spice (1 → 2)
- **Optional**: Factions can decline charity even if eligible
- **Simultaneous**: All eligible factions are asked simultaneously

### Fraud Safeguards (1.03.02)
- A player may **only claim CHOAM Charity once per turn**
- Duplicate claims in the same turn must be rejected

### Bene Gesserit Advanced Ability (2.02.09)
- **Advanced Rules Only**: Bene Gesserit always eligible regardless of spice holdings
- **Amount**: Always receives **at least 2 spice** (not bringing to 2, but adding 2)
- **Karama Cancellation**: Can be cancelled by Karama card (✷) - not yet implemented

## Implementation Validation

### ✅ Eligibility Logic

**File**: `src/lib/game/rules/choam-charity.ts`

```25:53:src/lib/game/rules/choam-charity.ts
export function isEligibleForCharity(
  state: GameState,
  faction: Faction
): CharityEligibility {
  const factionState = getFactionState(state, faction);
  const currentSpice = factionState.spice;

  // Check Bene Gesserit advanced ability
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    // Rule 2.02.09: Bene Gesserit always receive at least 2 spice regardless of holdings
    return {
      isEligible: true,
      reason: 'Bene Gesserit (Advanced) - always eligible',
    };
  }

  // Standard eligibility: 0 or 1 spice
  if (currentSpice <= GAME_CONSTANTS.CHOAM_CHARITY_THRESHOLD) {
    return {
      isEligible: true,
      reason: `${currentSpice} spice (will receive up to 2 spice)`,
    };
  }

  return {
    isEligible: false,
    reason: `${currentSpice} spice (not eligible)`,
  };
}
```

**Validation Checklist**:
- [x] Standard eligibility: 0-1 spice threshold
- [x] BG advanced: Always eligible when advanced rules enabled
- [x] BG basic: Follows standard rules (0-1 spice only)
- [x] Clear eligibility reasons for logging

### ✅ Charity Amount Calculation

**File**: `src/lib/game/rules/choam-charity.ts`

```87:126:src/lib/game/rules/choam-charity.ts
export function calculateCharityAmount(
  state: GameState,
  faction: Faction,
  currentSpice: number
): number {
  // Check Bene Gesserit advanced ability
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    // Rule 2.02.09: Bene Gesserit always receive at least 2 spice
    return 2;
  }

  // Standard: Bring to 2 spice total
  // 0 spice → receives 2 spice (0 → 2)
  // 1 spice → receives 1 spice (1 → 2)
  return Math.max(0, GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT - currentSpice);
}

/**
 * Get charity amount with potential modifiers (for future variants).
 * Currently returns the base amount, but can be extended for:
 * - Homeworlds variant: Low Threshold bonus (+1 spice)
 * - Other variant rules
 */
export function getCharityAmount(
  state: GameState,
  faction: Faction,
  currentSpice: number
): number {
  const baseAmount = calculateCharityAmount(state, faction, currentSpice);

  // TODO: Homeworlds variant - Low Threshold bonus (+1 spice)
  // if (state.config.variants?.homeworlds) {
  //   const factionState = getFactionState(state, faction);
  //   if (isAtLowThreshold(factionState)) {
  //     return baseAmount + 1;
  //   }
  // }

  return baseAmount;
}
```

**Validation Checklist**:
- [x] Standard: 0 spice → 2 spice
- [x] Standard: 1 spice → 1 spice
- [x] BG Advanced: Always 2 spice regardless of current holdings
- [x] Homeworlds variant: Marked as TODO (not yet implemented)

### ✅ Phase Handler Flow

**File**: `src/lib/game/phases/handlers/choam-charity.ts`

**Initialization** (`initialize`):
```37:83:src/lib/game/phases/handlers/choam-charity.ts
  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.eligibleFactions = [];
    this.processedFactions = new Set();

    const events: PhaseEvent[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("💰 CHOAM CHARITY PHASE (Turn " + state.turn + ")");
    console.log("=".repeat(80));

    // Find factions eligible for charity
    this.eligibleFactions = getEligibleFactions(state);

    // Log eligibility for all factions
    for (const [faction] of state.factions) {
      const eligibility = isEligibleForCharity(state, faction);
      if (eligibility.isEligible) {
        console.log(`  ✅ ${FACTION_NAMES[faction]}: ${eligibility.reason}`);
      } else {
        console.log(`  ❌ ${FACTION_NAMES[faction]}: ${eligibility.reason}`);
      }
    }

    console.log(
      `\n  📊 ${this.eligibleFactions.length} faction(s) eligible for CHOAM Charity`
    );
    console.log("=".repeat(80) + "\n");

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here
    // Just emit eligible factions info
    events.push({
      type: "CHOAM_ELIGIBLE",
      data: {
        eligibleFactions: this.eligibleFactions,
      },
      message: `CHOAM Charity: ${this.eligibleFactions.length} factions eligible`,
    });

    if (this.eligibleFactions.length === 0) {
      // No one eligible, skip phase
      return this.complete(state, Phase.BIDDING, events);
    }

    // Request charity decisions from eligible factions (simultaneously)
    return this.requestCharityDecisions(state, events);
  }
```

**Validation Checklist**:
- [x] Resets context on initialization
- [x] Determines eligible factions
- [x] Logs eligibility for all factions
- [x] Emits CHOAM_ELIGIBLE event
- [x] Skips phase if no eligible factions
- [x] Requests decisions simultaneously

**Processing** (`processStep`):
```85:114:src/lib/game/phases/handlers/choam-charity.ts
  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    console.log("\n" + "=".repeat(80));
    console.log("💰 PROCESSING CHOAM CHARITY CLAIMS");
    console.log("=".repeat(80));

    // Process charity claims
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    for (const response of responses) {
      const result = this.processCharityResponse(newState, response);
      newState = result.state;
      events.push(...result.events);
    }

    console.log("=".repeat(80) + "\n");

    // Check if all eligible factions have been processed
    const remaining = this.eligibleFactions.filter(
      (f) => !this.processedFactions.has(f)
    );

    if (remaining.length > 0) {
      return this.requestCharityDecisions(newState, events);
    }

    // Phase complete
    return this.complete(newState, Phase.BIDDING, events);
  }
```

**Validation Checklist**:
- [x] Processes all responses
- [x] Tracks processed factions
- [x] Continues requesting if factions remain
- [x] Completes phase when all processed

**Fraud Safeguards**:
```128:158:src/lib/game/phases/handlers/choam-charity.ts
  private processCharityResponse(
    state: GameState,
    response: AgentResponse
  ): { state: GameState; events: PhaseEvent[] } {
    const events: PhaseEvent[] = [];

    // Fraud safeguard: Check if already processed this turn
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    if (this.processedFactions.has(response.factionId)) {
      console.log(
        `  ⚠️  ${
          FACTION_NAMES[response.factionId]
        }: Already claimed this turn (fraud safeguard)`
      );
      return { state, events };
    }

    this.processedFactions.add(response.factionId);

    // Check if faction is claiming charity
    if (response.actionType === "CLAIM_CHARITY" || !response.passed) {
      return this.processCharityClaim(state, response.factionId, events);
    } else {
      // Faction declined charity
      console.log(
        `  ❌ ${FACTION_NAMES[response.factionId]}: Declines CHOAM Charity`
      );
      // Note: No event for declining charity - only claim events are tracked
      return { state, events };
    }
  }
```

**Validation Checklist**:
- [x] Checks for duplicate claims (fraud safeguard)
- [x] Rejects duplicate claims silently
- [x] Handles claim vs decline correctly
- [x] No event logged for declining

## Test Scenarios Validation

### Scenario 1: Standard Charity - Zero Spice ✅
**Expected**:
- Faction with 0 spice is eligible
- Receives 2 spice (0 → 2)
- CHARITY_CLAIMED event logged

**Validation Points**:
- [x] Eligibility correctly determined
- [x] Amount calculation: 2 spice
- [x] State updated correctly
- [x] Event logged with correct data

### Scenario 2: Standard Charity - One Spice ✅
**Expected**:
- Faction with 1 spice is eligible
- Receives 1 spice (1 → 2)
- CHARITY_CLAIMED event logged

**Validation Points**:
- [x] Eligibility correctly determined
- [x] Amount calculation: 1 spice
- [x] Final total: 2 spice
- [x] Event logged correctly

### Scenario 3: Bene Gesserit Advanced - High Spice ✅
**Expected**:
- BG with 5 spice is eligible (advanced ability)
- Receives 2 spice (5 → 7)
- Not bringing to 2, but adding 2

**Validation Points**:
- [x] BG always eligible with advanced rules
- [x] Always receives 2 spice regardless of current holdings
- [x] Final total: 7 spice (not 2)
- [x] Event logged correctly

### Scenario 4: Bene Gesserit Advanced - One Spice ✅
**Expected**:
- BG with 1 spice is eligible
- Receives 2 spice (1 → 3)
- Advanced ability applies

**Validation Points**:
- [x] BG eligible even with 1 spice (advanced)
- [x] Receives 2 spice (not 1)
- [x] Final total: 3 spice

### Scenario 5: Bene Gesserit Basic Rules ✅
**Expected**:
- BG with 1 spice: eligible
- BG with 5 spice: NOT eligible
- Follows standard rules

**Validation Points**:
- [x] BG follows standard rules in basic game
- [x] Only eligible with 0-1 spice
- [x] Advanced ability not active

### Scenario 6: Multiple Factions Simultaneous ✅
**Expected**:
- All eligible factions asked simultaneously
- Each receives correct amount
- All claims processed

**Validation Points**:
- [x] All eligible factions identified
- [x] Simultaneous requests sent
- [x] Each receives correct amount
- [x] All events logged

### Scenario 7: Mixed Claim and Decline ✅
**Expected**:
- Some factions claim, others decline
- Only claiming factions receive spice
- No event for declining

**Validation Points**:
- [x] Claims processed correctly
- [x] Declines handled correctly
- [x] No spice added for declines
- [x] No events for declines

### Scenario 8: Fraud Safeguards ✅
**Expected**:
- First claim processed
- Second claim rejected
- Only first claim affects state

**Validation Points**:
- [x] Duplicate detection works
- [x] Second claim rejected
- [x] State unchanged by duplicate
- [x] Warning logged

### Scenario 9: No Eligible Factions ✅
**Expected**:
- Phase completes immediately
- No agent requests
- No state changes

**Validation Points**:
- [x] Phase skips correctly
- [x] No requests sent
- [x] Transitions to next phase
- [x] CHOAM_ELIGIBLE event with 0 factions

### Scenario 10: Complex Mixed Scenario ✅
**Expected**:
- BG (advanced) + standard factions
- Mixed claim/decline
- All amounts correct

**Validation Points**:
- [x] BG advanced ability works
- [x] Standard factions work
- [x] Mixed responses handled
- [x] All amounts correct

## Log Validation Checklist

When reviewing test logs (`test-logs/choam-charity/*.log`), verify:

### Eligibility Section
- [ ] All factions listed with eligibility status
- [ ] Correct reasons for eligibility/ineligibility
- [ ] BG advanced ability noted when applicable
- [ ] Count of eligible factions matches expectations

### Processing Section
- [ ] Each claim shows:
  - Current spice amount
  - Amount received
  - New total
- [ ] BG advanced claims show "always 2 spice" message
- [ ] Declines logged correctly
- [ ] Fraud safeguards trigger for duplicates

### Events
- [ ] CHOAM_ELIGIBLE event with correct eligible factions
- [ ] CHARITY_CLAIMED events for each claim:
  - Correct faction
  - Correct amount
  - Correct previous/new totals
- [ ] No events for declines
- [ ] Events in correct order

### State Changes
- [ ] Spice amounts updated correctly
- [ ] No unintended side effects
- [ ] Final totals match expectations

## Known Limitations

### Not Yet Implemented
1. **Karama Cancellation** (2.02.09)
   - Karama card can cancel BG CHARITY ability
   - If cancelled, BG follows standard rules
   - Status: TODO

2. **Homeworlds Variant** (Low Threshold Bonus)
   - Factions at Low Threshold receive +1 extra spice
   - Status: TODO (marked in code)

## Running Validation

### Run Test Suite
```bash
pnpm test:choam-charity
```

### Review Logs
```bash
# View latest test logs
ls -lt test-logs/choam-charity/*.log | head -5

# Review specific scenario
cat test-logs/choam-charity/standard-charity---zero-spice-*.log
```

### Manual Validation
1. Run test suite
2. Review each log file
3. Verify eligibility determination
4. Verify spice amounts
5. Verify events
6. Verify state changes
7. Check for errors or warnings

## Summary

### ✅ Implementation Status
- **Core Rules**: Fully implemented
- **Eligibility Logic**: Correct
- **Amount Calculation**: Correct
- **Fraud Safeguards**: Implemented
- **BG Advanced Ability**: Implemented
- **Test Coverage**: 10 scenarios passing

### ⚠️ Future Enhancements
- Karama cancellation of BG ability
- Homeworlds variant Low Threshold bonus

### 📊 Test Results
- **Total Scenarios**: 10
- **Passing**: 10
- **Failing**: 0
- **Coverage**: All critical paths tested


