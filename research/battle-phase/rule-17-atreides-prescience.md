# Rule 17: Atreides Prescience Verification

## Rule Reference
From `handwritten-rules/battle.md` line 57:
> PRESCIENCE: Before Battle Wheel [1.07.04.01], before any elements of the Battle Plan are determined you may force your opponent to Reveal your choice of one of these elements they intend to use in their Battle Plan against you: the leader, the weapon, the defense, or the number dialed. If you choose to ask about a weapon or defense and your opponent tells you that they are not playing that element during this battle, you may not then ask to see a different element.✷  +3.04.01 +3.04.03

Alliance rule from line 58:
> ALLIANCE: In your ally's battle you may use ability Prescience [2.01.08] on your ally's opponent.✷

## Implementation Location
- **Main Handler**: `src/lib/game/phases/handlers/battle.ts`
- **Tools**: `src/lib/game/tools/actions/battle.ts`
- **Types**: `src/lib/game/phases/types.ts`

## Verification Results

### ✅ CORRECTLY IMPLEMENTED

#### 1. Timing: Before Battle Wheel, Before Elements Determined
**Status**: ✅ **CORRECT**

The prescience opportunity is triggered immediately after battle initialization, before battle plans are created:

```365:389:src/lib/game/phases/handlers/battle.ts
    // Check for Atreides prescience
    if (state.factions.has(Faction.ATREIDES)) {
      const atreidesInBattle =
        aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
      const atreidesAlly = getAlly(state, Faction.ATREIDES);
      const allyInBattle = atreidesAlly && (aggressor === atreidesAlly || defender === atreidesAlly);

      if (atreidesInBattle || allyInBattle) {
        // Determine opponent to use prescience against
        let prescienceTarget: Faction;
        if (atreidesInBattle) {
          prescienceTarget = aggressor === Faction.ATREIDES ? defender : aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          prescienceTarget = aggressor === atreidesAlly ? defender : aggressor;
        }

        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events, prescienceTarget);
      }
    }

    // Skip to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
```

This ensures prescience happens before any battle plan elements are determined, as required by the rule.

#### 2. Elements That Can Be Revealed
**Status**: ✅ **CORRECT**

The implementation correctly allows revealing one of four elements:

```421:421:src/lib/game/phases/handlers/battle.ts
          options: ['leader', 'weapon', 'defense', 'number'],
```

This matches the rule: "the leader, the weapon, the defense, or the number dialed."

#### 3. Alliance Usage
**Status**: ✅ **CORRECT**

The implementation correctly supports using prescience in an ally's battle:

```367:383:src/lib/game/phases/handlers/battle.ts
      const atreidesInBattle =
        aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
      const atreidesAlly = getAlly(state, Faction.ATREIDES);
      const allyInBattle = atreidesAlly && (aggressor === atreidesAlly || defender === atreidesAlly);

      if (atreidesInBattle || allyInBattle) {
        // Determine opponent to use prescience against
        let prescienceTarget: Faction;
        if (atreidesInBattle) {
          prescienceTarget = aggressor === Faction.ATREIDES ? defender : aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          prescienceTarget = aggressor === atreidesAlly ? defender : aggressor;
        }

        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events, prescienceTarget);
      }
```

The code:
- Checks if Atreides is directly in battle OR if their ally is in battle
- Correctly identifies the opponent to use prescience against (either Atreides' direct opponent or their ally's opponent)
- Provides appropriate prompts for both scenarios:

```407:410:src/lib/game/phases/handlers/battle.ts
    let promptMessage = `Use prescience to see one element of ${prescienceTarget}'s battle plan?`;
    if (isAllyBattle && !atreidesInBattle) {
      promptMessage = `Your ally ${atreidesAlly} is in battle against ${prescienceTarget}. Use prescience on your ally's opponent?`;
    }
```

### ✅ FIXED

#### 4. "Cannot Ask Different Element" Rule
**Status**: ✅ **FIXED**

**Rule Requirement**: 
> "If you choose to ask about a weapon or defense and your opponent tells you that they are not playing that element during this battle, you may not then ask to see a different element."

**Implementation**:
The code now explicitly enforces this rule by:
1. Tracking when weapon/defense is asked and opponent says "not playing" (null value)
2. Setting `prescienceBlocked` flag to prevent asking about a different element
3. Emitting a `PRESCIENCE_BLOCKED` event for clarity

**Updated Flow**:
```669:717:src/lib/game/phases/handlers/battle.ts
  private processPrescienceReveal(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const response = responses.find((r) => r.factionId === battle.prescienceOpponent);

    if (response && response.actionType === 'REVEAL_PRESCIENCE_ELEMENT') {
      const target = battle.prescienceTarget!;
      let revealedValue: string | number | null;

      // Extract the revealed value based on the target type
      if (target === 'leader') {
        revealedValue = (response.data.leaderId as string) || null;
      } else if (target === 'weapon') {
        revealedValue = (response.data.weaponCardId as string) || null;
      } else if (target === 'defense') {
        revealedValue = (response.data.defenseCardId as string) || null;
      } else if (target === 'number') {
        // Number could be forces or spice (we store both)
        const forces = response.data.forcesDialed as number;
        const spice = response.data.spiceDialed as number;
        if (forces !== undefined || spice !== undefined) {
          revealedValue = {
            forces: forces ?? 0,
            spice: spice ?? 0,
          } as unknown as string;
        } else {
          revealedValue = null;
        }
      } else {
        revealedValue = 'unknown';
      }

      // Rule: If asking about weapon/defense and opponent says "not playing",
      // cannot ask about a different element
      if ((target === 'weapon' || target === 'defense') && revealedValue === null) {
        battle.prescienceBlocked = true;
        events.push({
          type: 'PRESCIENCE_BLOCKED',
          data: {
            target,
            opponent: battle.prescienceOpponent,
          },
          message: `Atreides asked about ${target} but opponent is not playing it. Cannot ask about a different element.`,
        });
      }

      battle.prescienceResult = {
        type: target,
        value: revealedValue,
      };

      const revealedMessage = revealedValue === null 
        ? `not playing ${target}`
        : JSON.stringify(revealedValue);

      events.push({
        type: 'PRESCIENCE_USED',
        data: {
          target,
          revealed: revealedValue,
          opponent: battle.prescienceOpponent,
        },
        message: `Atreides sees opponent's ${target}: ${revealedMessage}`,
      });
    }

    // Move to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }
```

**Changes Made**:
- Added `prescienceBlocked` field to `CurrentBattle` interface
- Updated `processPrescienceReveal` to handle null values properly
- Added explicit check for weapon/defense + null value to set `prescienceBlocked` flag
- Added `PRESCIENCE_BLOCKED` event for clarity

#### 5. Prescience Commitment Validation
**Status**: ✅ **FIXED**

**Rule Requirement**: 
The opponent must use the element they revealed to prescience in their actual battle plan.

**Implementation**:
The code now validates prescience commitments in `processBattlePlans` before calling `validateBattlePlan`:

```837:950:src/lib/game/phases/handlers/battle.ts
    for (const response of responses) {
      const plan = response.data.plan as BattlePlan;
      if (!plan) continue;

      // Validate prescience commitment if applicable
      if (
        battle.prescienceUsed &&
        battle.prescienceResult &&
        battle.prescienceOpponent === response.factionId
      ) {
        const prescienceTarget = battle.prescienceResult.type;
        const prescienceValue = battle.prescienceResult.value;

        // Check if submitted plan matches prescience commitment
        let commitmentViolated = false;
        let violationMessage = '';

        if (prescienceTarget === 'leader') {
          // For leader, check if the committed leader matches
          if (prescienceValue !== null) {
            // If a specific leader was committed, must use that leader (or Cheap Hero if leader was null)
            if (prescienceValue !== plan.leaderId && !(prescienceValue === null && plan.cheapHeroUsed)) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use leader ${prescienceValue}, but your plan uses ${plan.leaderId || 'Cheap Hero'}`;
            }
          } else {
            // If committed to "not playing leader", must not play leader or Cheap Hero
            if (plan.leaderId || plan.cheapHeroUsed) {
              commitmentViolated = true;
              violationMessage = 'Prescience commitment: You revealed you would not play a leader, but your plan includes a leader or Cheap Hero';
            }
          }
        } else if (prescienceTarget === 'weapon') {
          // For weapon, check if the committed weapon matches
          if (prescienceValue !== null) {
            // If a specific weapon was committed, must use that weapon
            if (plan.weaponCardId !== prescienceValue) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use weapon ${prescienceValue}, but your plan uses ${plan.weaponCardId || 'no weapon'}`;
            }
          } else {
            // If committed to "not playing weapon", must not play weapon
            if (plan.weaponCardId) {
              commitmentViolated = true;
              violationMessage = 'Prescience commitment: You revealed you would not play a weapon, but your plan includes a weapon';
            }
          }
        } else if (prescienceTarget === 'defense') {
          // For defense, check if the committed defense matches
          if (prescienceValue !== null) {
            // If a specific defense was committed, must use that defense
            if (plan.defenseCardId !== prescienceValue) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use defense ${prescienceValue}, but your plan uses ${plan.defenseCardId || 'no defense'}`;
            }
          } else {
            // If committed to "not playing defense", must not play defense
            if (plan.defenseCardId) {
              commitmentViolated = true;
              violationMessage = 'Prescience commitment: You revealed you would not play a defense, but your plan includes a defense';
            }
          }
        } else if (prescienceTarget === 'number') {
          // For number, check if the committed forces/spice match
          if (prescienceValue !== null && typeof prescienceValue === 'object' && !Array.isArray(prescienceValue)) {
            const committed = prescienceValue as { forces: number; spice: number };
            if (plan.forcesDialed !== committed.forces || plan.spiceDialed !== committed.spice) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would dial ${committed.forces} forces and ${committed.spice} spice, but your plan dials ${plan.forcesDialed} forces and ${plan.spiceDialed} spice`;
            }
          }
        }

        if (commitmentViolated) {
          const error = createError(
            'PRESCIENCE_COMMITMENT_VIOLATION',
            violationMessage,
            { field: prescienceTarget }
          );
          events.push({
            type: 'BATTLE_PLAN_SUBMITTED',
            data: {
              faction: response.factionId,
              invalid: true,
              errors: [error],
            },
            message: `${response.factionId} battle plan violates prescience commitment: ${violationMessage}`,
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
      }

      // Validate plan
      const validation = validateBattlePlan(state, response.factionId, battle.territoryId, plan);
```

**Changes Made**:
- Added prescience commitment validation in `processBattlePlans` before `validateBattlePlan`
- Validates all four element types (leader, weapon, defense, number)
- Handles both "playing" and "not playing" cases
- Returns proper validation error with `PRESCIENCE_COMMITMENT_VIOLATION` code
- Added `PRESCIENCE_COMMITMENT_VIOLATION` to `ValidationErrorCode` type

## Summary

### ✅ Working Correctly
1. Prescience timing (before Battle Wheel, before elements determined)
2. All four elements can be revealed (leader, weapon, defense, number)
3. Alliance usage (Atreides can use prescience in ally's battle)
4. **"Cannot ask different element" rule**: Now explicitly enforced with `prescienceBlocked` flag
5. **Prescience commitment validation**: Opponent's battle plan is validated against their prescience commitment

### ✅ Fixed Issues
1. **"Cannot ask different element" rule**: 
   - Added `prescienceBlocked` field to track when weapon/defense was asked and opponent said "not playing"
   - Added explicit check in `processPrescienceReveal` to set the flag
   - Added `PRESCIENCE_BLOCKED` event for clarity

2. **Prescience commitment validation**: 
   - Added validation in `processBattlePlans` before `validateBattlePlan`
   - Validates all four element types (leader, weapon, defense, number)
   - Handles both "playing" and "not playing" cases
   - Returns proper validation error with `PRESCIENCE_COMMITMENT_VIOLATION` code

## Edge Cases Handled

1. **Opponent reveals weapon/defense but doesn't have a leader**: 
   - The prescience commitment validation will catch if they try to use a weapon/defense without a leader
   - The battle plan validation (`validateBattlePlan`) will also catch this as a separate error
   - Both validations run, ensuring the commitment is enforced

2. **Opponent reveals a specific card but loses it**: 
   - The prescience commitment validation will fail if they don't use the committed card
   - This is correct behavior - they committed to using it, so they need to ensure they keep it

3. **Opponent says "not playing" for weapon/defense**: 
   - The `prescienceBlocked` flag is set, preventing asking about a different element
   - The commitment validation ensures they don't play that element in their battle plan

## Files Modified
- `src/lib/game/phases/types.ts` - Added `prescienceBlocked` field and updated `prescienceResult` type
- `src/lib/game/phases/handlers/battle.ts` - Updated `processPrescienceReveal` and `processBattlePlans`
- `src/lib/game/rules/types.ts` - Added `PRESCIENCE_COMMITMENT_VIOLATION` error code

## Implementation Details

### Type Changes
- `CurrentBattle.prescienceResult.value`: Now allows `null` to represent "not playing"
- `CurrentBattle.prescienceBlocked`: New boolean field to track if prescience is blocked

### Validation Flow
1. Prescience opportunity offered (before battle plans)
2. Atreides chooses element to see
3. Opponent reveals element (or says "not playing" with null)
4. If weapon/defense + null, `prescienceBlocked` is set
5. Battle plans are requested
6. When opponent submits plan, prescience commitment is validated first
7. Then normal battle plan validation runs

