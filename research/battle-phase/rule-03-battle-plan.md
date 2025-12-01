# Battle Plan Requirements Verification

**Rule Reference**: `handwritten-rules/battle.md` lines 9-10

**Rule Text**:
> Battle Plan: To resolve a battle, each player secretly formulates a Battle Plan. -1.14.01 -2.01.08 -2.01.09
> A Battle Plan always includes the number of Forces dialed on the Battle Wheel. When possible, it must include a player's leader or a Cheap Hero. It may include Treachery Cards at the player's discretion.

## Verification Summary

✅ **PASS** - All requirements are correctly implemented.

## Detailed Findings

### 1. Secretly Formulated ✅

**Requirement**: Battle plans must be secretly formulated.

**Implementation Status**: ✅ **CORRECT**

**Evidence**:
- Plans are submitted simultaneously via `simultaneousRequests: true` in `requestBattlePlans()`:
  ```680:680:src/lib/game/phases/handlers/battle.ts
  simultaneousRequests: true, // Both submit at same time
  ```

- Plans are stored in the battle context (`aggressorPlan` and `defenderPlan`) and not revealed until `processReveal()`:
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

- Plans are sanitized for logging (redacted until reveal):
  ```1742:1752:src/lib/game/phases/handlers/battle.ts
  private sanitizePlanForLog(plan: BattlePlan | null): Record<string, unknown> | null {
    if (!plan) return null;
    return {
      factionId: plan.factionId,
      leaderId: plan.leaderId ? '[redacted]' : null,
      forcesDialed: '[redacted]',
      weaponCardId: plan.weaponCardId ? '[redacted]' : null,
      defenseCardId: plan.defenseCardId ? '[redacted]' : null,
      announcedNoLeader: plan.announcedNoLeader,
    };
  }
  ```

**Note**: The only exception is Atreides Prescience ability, which can force revelation of one element before battle plans are finalized. This is a faction ability that supersedes the secret rule, which is correct per game rules.

### 2. Forces Dialed (Always Required) ✅

**Requirement**: A Battle Plan always includes the number of Forces dialed on the Battle Wheel.

**Implementation Status**: ✅ **CORRECT**

**Evidence**:
- `forcesDialed` is a required field in the `BattlePlan` interface:
  ```158:174:src/lib/game/types/entities.ts
  export interface BattlePlan {
    factionId: Faction;
    forcesDialed: number;
    leaderId: string | null;
    cheapHeroUsed: boolean;
    weaponCardId: string | null;
    defenseCardId: string | null;
    // Atreides specific
    kwisatzHaderachUsed: boolean;
    // Advanced rules
    spiceDialed: number;
    // Leader announcement (battle.md line 14)
    announcedNoLeader: boolean; // True if player announced they cannot play leader/hero
    // Computed values (filled in during resolution)
    totalStrength?: number;
    leaderKilled?: boolean;
  }
  ```

- Validation ensures `forcesDialed` is within valid range (0 to forces in territory):
  ```86:108:src/lib/game/rules/combat.ts
  // Check: Forces dialed
  if (plan.forcesDialed < 0) {
    errors.push(
      createError('FORCES_DIALED_EXCEEDS_AVAILABLE', 'Forces dialed cannot be negative', {
        field: 'forcesDialed',
        actual: plan.forcesDialed,
        expected: '>= 0',
      })
    );
  } else if (plan.forcesDialed > forcesInTerritory) {
    errors.push(
      createError(
        'FORCES_DIALED_EXCEEDS_AVAILABLE',
        `Cannot dial ${plan.forcesDialed} forces, only ${forcesInTerritory} in territory`,
        {
          field: 'forcesDialed',
          actual: plan.forcesDialed,
          expected: `0-${forcesInTerritory}`,
          suggestion: `Dial ${forcesInTerritory} forces (maximum available)`,
        }
      )
    );
  }
  ```

- Schema requires `forcesDialed`:
  ```328:332:src/lib/game/tools/schemas.ts
  forcesDialed: z.number()
    .int()
    .min(0)
    .max(20)
    .describe('Number of forces to dial on battle wheel. These forces are lost regardless of outcome.'),
  ```

### 3. Leader or Cheap Hero (When Possible) ✅

**Requirement**: When possible, it must include a player's leader or a Cheap Hero.

**Implementation Status**: ✅ **CORRECT**

**Evidence**:
- Validation enforces the requirement with three scenarios:
  1. **Has leaders available**: Must play a leader
  2. **No leaders but has Cheap Hero**: Must play Cheap Hero
  3. **No leaders AND no Cheap Hero**: Must announce inability

  ```110:153:src/lib/game/rules/combat.ts
  // Check: Leader or Cheap Hero requirement
  if (!plan.leaderId && !plan.cheapHeroUsed) {
    if (hasLeaders) {
      // Has leaders available - must play a leader
      errors.push(
        createError(
          'MUST_PLAY_LEADER',
          'You must play a leader when you have available leaders',
          {
            field: 'leaderId',
            suggestion: `Play ${availableLeaders[0].definitionId}`,
          }
        )
      );
    } else if (hasCheapHeroCard) {
      // No leaders but has Cheap Hero - MUST play it (forced rule)
      errors.push(
        createError(
          'MUST_PLAY_CHEAP_HERO',
          'You must play Cheap Hero when you have no available leaders',
          {
            field: 'cheapHeroUsed',
            suggestion: 'Set cheapHeroUsed to true',
          }
        )
      );
    } else {
      // No leaders AND no cheap hero - must announce inability
      // Rule from battle.md line 14: "When it is not possible, a player must
      // announce that they can not play a leader or Cheap Hero."
      if (!plan.announcedNoLeader) {
        errors.push(
          createError(
            'MUST_ANNOUNCE_NO_LEADER',
            'You must announce that you cannot play a leader or Cheap Hero',
            {
              field: 'announcedNoLeader',
              suggestion: 'Set announcedNoLeader to true',
            }
          )
        );
      }
    }
  }
  ```

- Validation prevents using both leader and Cheap Hero simultaneously:
  ```205:214:src/lib/game/rules/combat.ts
  // Check: Cannot use both leader and cheap hero
  if (plan.leaderId && plan.cheapHeroUsed) {
    errors.push(
      createError(
        'MUST_PLAY_LEADER_OR_CHEAP_HERO',
        'Cannot play both a leader and Cheap Hero - choose one',
        { suggestion: 'Remove either leaderId or set cheapHeroUsed to false' }
      )
    );
  }
  ```

- Leader announcement is logged when required:
  ```741:749:src/lib/game/phases/handlers/battle.ts
      // Log leader announcement if applicable
      // Rule from battle.md line 14: Player must announce when they cannot play a leader or Cheap Hero
      if (plan.announcedNoLeader) {
        events.push({
          type: 'NO_LEADER_ANNOUNCED',
          data: { faction: response.factionId },
          message: `${response.factionId} announces they cannot play a leader or Cheap Hero`,
        });
      }
  ```

### 4. Treachery Cards (Optional) ✅

**Requirement**: It may include Treachery Cards at the player's discretion.

**Implementation Status**: ✅ **CORRECT**

**Evidence**:
- `weaponCardId` and `defenseCardId` are optional (nullable) in the `BattlePlan` interface:
  ```158:174:src/lib/game/types/entities.ts
  export interface BattlePlan {
    factionId: Faction;
    forcesDialed: number;
    leaderId: string | null;
    cheapHeroUsed: boolean;
    weaponCardId: string | null;
    defenseCardId: string | null;
    // Atreides specific
    kwisatzHaderachUsed: boolean;
    // Advanced rules
    spiceDialed: number;
    // Leader announcement (battle.md line 14)
    announcedNoLeader: boolean; // True if player announced they cannot play leader/hero
    // Computed values (filled in during resolution)
    totalStrength?: number;
    leaderKilled?: boolean;
  }
  ```

- Schema allows null values for weapon and defense cards:
  ```333:336:src/lib/game/tools/schemas.ts
  weaponCardId: CardIdSchema
    .describe('Weapon treachery card to use, or null'),
  defenseCardId: CardIdSchema
    .describe('Defense treachery card to use, or null'),
  ```

- Validation enforces that Treachery Cards require a leader or Cheap Hero (per battle.md line 15: "NO TREACHERY: A player with no leader or Cheap Hero must still battle, but they can not play any Treachery Cards"):
  ```216:226:src/lib/game/rules/combat.ts
  // Check: Treachery cards require leader or cheap hero
  const hasLeaderOrHero = plan.leaderId || plan.cheapHeroUsed;
  if (!hasLeaderOrHero && (plan.weaponCardId || plan.defenseCardId)) {
    errors.push(
      createError(
        'CANNOT_PLAY_TREACHERY_WITHOUT_LEADER',
        'Cannot play weapon or defense cards without a leader or Cheap Hero',
        { suggestion: 'Add a leader or Cheap Hero to your battle plan' }
      )
    );
  }
  ```

- Validation ensures cards are in hand and valid:
  ```228:248:src/lib/game/rules/combat.ts
  // Check: Weapon card validity
  if (plan.weaponCardId) {
    const weaponError = validateTreacheryCard(
      factionState.hand,
      plan.weaponCardId,
      'weapon',
      'weaponCardId'
    );
    if (weaponError) errors.push(weaponError);
  }

  // Check: Defense card validity
  if (plan.defenseCardId) {
    const defenseError = validateTreacheryCard(
      factionState.hand,
      plan.defenseCardId,
      'defense',
      'defenseCardId'
    );
    if (defenseError) errors.push(defenseError);
  }
  ```

## Conclusion

All four requirements from `handwritten-rules/battle.md` lines 9-10 are correctly implemented:

1. ✅ **Secretly formulated**: Plans are submitted simultaneously and stored privately until reveal
2. ✅ **Forces dialed always required**: Validated and enforced in schema and validation
3. ✅ **Leader or Cheap Hero when possible**: Enforced with proper validation logic covering all scenarios
4. ✅ **Treachery Cards optional**: Optional fields with proper validation when used

The implementation correctly handles edge cases such as:
- Players without leaders or Cheap Hero (requires announcement)
- Treachery Cards requiring a leader or Cheap Hero
- Simultaneous submission and revelation
- Atreides Prescience ability (faction ability that supersedes secrecy)

**Status**: ✅ **VERIFIED - Implementation is correct**





