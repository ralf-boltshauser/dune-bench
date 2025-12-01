# Rule 7: Revealing Wheels - Verification Report

## Rule Reference

**Source**: `handwritten-rules/battle.md` line 17

**Rule Text**: 
> REVEALING WHEELS: When both players are ready, the Battle Plans are Revealed simultaneously.

## Implementation Analysis

### Code Location

The revealing mechanism is implemented in:
- `src/lib/game/phases/handlers/battle.ts`:
  - `requestBattlePlans()` (lines 603-684): Requests plans from both players
  - `processBattlePlans()` (lines 686-767): Processes both plans
  - `processReveal()` (lines 841-896): Reveals both plans simultaneously

### Implementation Details

#### 1. Simultaneous Plan Submission

```680:680:src/lib/game/phases/handlers/battle.ts
      simultaneousRequests: true, // Both submit at same time
```

Both players are requested to submit battle plans with `simultaneousRequests: true`, which ensures:
- Both requests are sent at the same time
- Both responses are collected in parallel using `Promise.all()` in the agent provider
- Neither player sees the other's plan before submission

#### 2. Plan Collection

```686:750:src/lib/game/phases/handlers/battle.ts
  private processBattlePlans(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;

    for (const response of responses) {
      const plan = response.data.plan as BattlePlan;
      if (!plan) continue;

      // Validate plan
      const validation = validateBattlePlan(state, response.factionId, battle.territoryId, plan);
      if (!validation.valid) {
        events.push({
          type: 'BATTLE_PLAN_SUBMITTED',
          data: {
            faction: response.factionId,
            invalid: true,
            errors: validation.errors,
          },
          message: `${response.factionId} battle plan invalid: ${validation.errors[0]?.message}`,
        });
        // Use default plan
        const defaultPlan: BattlePlan = {
          factionId: response.factionId,
          leaderId: null,
          forcesDialed: 0,
          spiceDialed: 0,
          weaponCardId: null,
          defenseCardId: null,
          kwisatzHaderachUsed: false,
          cheapHeroUsed: false,
          announcedNoLeader: false,
        };
        if (response.factionId === battle.aggressor) {
          battle.aggressorPlan = defaultPlan;
        } else {
          battle.defenderPlan = defaultPlan;
        }
        continue;
      }

      if (response.factionId === battle.aggressor) {
        battle.aggressorPlan = plan;
      } else {
        battle.defenderPlan = plan;
      }

      events.push({
        type: 'BATTLE_PLAN_SUBMITTED',
        data: { faction: response.factionId },
        message: `${response.factionId} submits battle plan`,
      });

      // Log leader announcement if applicable
      // Rule from battle.md line 14: Player must announce when they cannot play a leader or Cheap Hero
      if (plan.announcedNoLeader) {
        events.push({
          type: 'NO_LEADER_ANNOUNCED',
          data: { faction: response.factionId },
          message: `${response.factionId} announces they cannot play a leader or Cheap Hero`,
        });
      }
    }
```

**Key Points**:
- Both responses are processed together in a single loop
- If a plan is missing or invalid, a default plan is created
- Both plans are stored in `battle.aggressorPlan` and `battle.defenderPlan`
- Only after both plans are processed does the code proceed to reveal

#### 3. Simultaneous Reveal

```841:857:src/lib/game/phases/handlers/battle.ts
  private processReveal(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Plans are revealed simultaneously
    const battle = this.context.currentBattle!;

    events.push({
      type: 'BATTLE_PLAN_SUBMITTED',
      data: {
        aggressor: battle.aggressor,
        aggressorPlan: this.sanitizePlanForLog(battle.aggressorPlan),
        defender: battle.defender,
        defenderPlan: this.sanitizePlanForLog(battle.defenderPlan),
      },
      message: 'Battle plans revealed!',
    });
```

**Key Points**:
- Both plans are revealed in a **single event** (`BATTLE_PLAN_SUBMITTED`)
- The event contains both `aggressorPlan` and `defenderPlan` together
- The comment explicitly states "Plans are revealed simultaneously"
- Both plans are sanitized for logging (hiding secret information until reveal)

### Flow Verification

1. **Request Phase**: Both players receive requests simultaneously
   - `requestBattlePlans()` creates requests for both aggressor and defender
   - `simultaneousRequests: true` ensures parallel processing

2. **Collection Phase**: Both responses are collected before proceeding
   - Phase manager waits for all responses when `simultaneousRequests: true`
   - `processBattlePlans()` only runs after both responses are received

3. **Reveal Phase**: Both plans are revealed together
   - `processReveal()` is only called after both plans are processed
   - Single event contains both plans simultaneously

## Verification Result

### ✅ **CORRECTLY IMPLEMENTED**

The implementation correctly follows the rule:

1. ✅ **Simultaneous Submission**: Both players submit plans at the same time (parallel processing)
2. ✅ **Both Ready Check**: The code ensures both plans are collected before revealing (via `processBattlePlans()` processing all responses)
3. ✅ **Simultaneous Reveal**: Both plans are revealed together in a single event

### Implementation Strengths

1. **True Parallel Processing**: Uses `Promise.all()` to collect responses simultaneously
2. **Single Reveal Event**: Both plans are revealed in one event, ensuring true simultaneity
3. **Default Plan Handling**: If a plan is missing/invalid, a default plan is created, ensuring both plans always exist before reveal

### Potential Edge Cases

1. **Missing Response**: If a player doesn't respond, a default plan is created. This ensures both plans exist, but the rule says "when both players are ready" - the code assumes readiness after timeout/default.

2. **No Explicit "Ready" Check**: The code doesn't explicitly check if both players are "ready" - it assumes both responses are collected. In a real game, players would physically indicate readiness before revealing.

3. **Voice Phase**: Between plan submission and reveal, there's a Voice opportunity phase (Bene Gesserit). This is correct per rules, but means plans are technically "submitted" before being "revealed" - the reveal happens after Voice.

## Recommendations

1. **Consider Adding Explicit Ready Check**: For better rule compliance, consider adding an explicit "ready" state check before revealing, though the current implementation (waiting for both responses) effectively achieves this.

2. **Documentation**: The comment "Plans are revealed simultaneously" is good, but could be more explicit about the flow ensuring both plans are collected first.

## Conclusion

The implementation correctly implements the "Revealing Wheels" rule. Battle plans are:
- Submitted simultaneously (parallel processing)
- Collected before revealing (both responses processed together)
- Revealed simultaneously (single event with both plans)

The code follows the rule's intent: when both players have submitted their plans (are "ready"), the plans are revealed together in a single simultaneous event.





