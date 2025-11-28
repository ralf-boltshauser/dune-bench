# Rule 06: Treachery Cards in Battle

## Rule Reference

**Source:** `handwritten-rules/battle.md` line 16

**Rule Text:**
> TREACHERY CARDS: Players with a leader or Cheap Hero may play a Weapon Treachery Card, Defense Treachery Card, or both by holding them against the wheel. They may choose not to play Treachery Cards as well. +2.02.06 +2.02.07

## Rule Requirements

The rule specifies that:

1. **Prerequisite:** Players must have a leader or Cheap Hero to play Treachery Cards
2. **Optional Weapon:** Players may play a Weapon Treachery Card
3. **Optional Defense:** Players may play a Defense Treachery Card
4. **Both Allowed:** Players may play both a Weapon and Defense card
5. **Neither Required:** Players may choose not to play any Treachery Cards

## Implementation Verification

### Type Definitions

**File:** `src/lib/game/types/entities.ts`

```158:164:src/lib/game/types/entities.ts
export interface BattlePlan {
  factionId: Faction;
  forcesDialed: number;
  leaderId: string | null;
  cheapHeroUsed: boolean;
  weaponCardId: string | null;
  defenseCardId: string | null;
```

**Finding:** ✅ Both `weaponCardId` and `defenseCardId` are defined as `string | null`, making them optional.

### Validation Logic

**File:** `src/lib/game/rules/combat.ts`

#### 1. Prerequisite Check (Lines 216-226)

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

**Finding:** ✅ Correctly prevents playing Treachery Cards without a leader or Cheap Hero.

#### 2. Optional Weapon Validation (Lines 228-237)

```228:237:src/lib/game/rules/combat.ts
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
```

**Finding:** ✅ Only validates weapon if provided. No requirement to play a weapon.

#### 3. Optional Defense Validation (Lines 239-248)

```239:248:src/lib/game/rules/combat.ts
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

**Finding:** ✅ Only validates defense if provided. No requirement to play a defense.

#### 4. Both Cards Allowed (Lines 250-259)

```250:259:src/lib/game/rules/combat.ts
  // Check: Same card used twice
  if (plan.weaponCardId && plan.weaponCardId === plan.defenseCardId) {
    errors.push(
      createError(
        'CARD_NOT_IN_HAND',
        'Cannot use the same card as both weapon and defense',
        { field: 'defenseCardId' }
      )
    );
  }
```

**Finding:** ✅ Prevents using the same card for both weapon and defense, but allows different cards for both.

### Schema Definitions

**File:** `src/lib/game/tools/schemas.ts`

```333:336:src/lib/game/tools/schemas.ts
  weaponCardId: CardIdSchema
    .describe('Weapon treachery card to use, or null'),
  defenseCardId: CardIdSchema
    .describe('Defense treachery card to use, or null'),
```

**Finding:** ✅ Both fields are optional (nullable) in the schema.

### Tool Implementation

**File:** `src/lib/game/tools/actions/battle.ts`

The `submit_battle_plan` tool validates weapon and defense cards only if provided:

```122:163:src/lib/game/tools/actions/battle.ts
        // Validate weapon card if provided
        if (weaponCardId) {
          const card = factionState.hand.find((c) => c.definitionId === weaponCardId);
          if (!card) {
            return failureResult(
              `Weapon card not in hand: ${weaponCardId}`,
              {
                code: 'CARD_NOT_IN_HAND',
                message: 'You do not have this card',
                suggestion: 'Check your hand with view_my_hand',
              },
              false
            );
          }
          const cardDef = getTreacheryCardDefinition(weaponCardId);
          if (!cardDef || !cardDef.type.includes('WEAPON')) {
            return failureResult(
              `${weaponCardId} is not a weapon`,
              {
                code: 'INVALID_WEAPON',
                message: 'This card cannot be used as a weapon',
              },
              false
            );
          }
        }

        // Validate defense card if provided
        if (defenseCardId) {
          const card = factionState.hand.find((c) => c.definitionId === defenseCardId);
          if (!card) {
            return failureResult(
              `Defense card not in hand: ${defenseCardId}`,
              {
                code: 'CARD_NOT_IN_HAND',
                message: 'You do not have this card',
                suggestion: 'Check your hand with view_my_hand',
              },
              false
            );
          }
        }
```

**Finding:** ✅ Validation only occurs if cards are provided. No enforcement to play cards.

## Test Cases

### Case 1: Player with Leader, No Treachery Cards
- **Setup:** Player has leader, no weapon/defense cards in hand
- **Expected:** ✅ Can submit battle plan with `weaponCardId: null, defenseCardId: null`
- **Status:** ✅ **PASS** - Implementation allows this

### Case 2: Player with Leader, Weapon Only
- **Setup:** Player has leader and weapon card
- **Expected:** ✅ Can submit battle plan with `weaponCardId: <card>, defenseCardId: null`
- **Status:** ✅ **PASS** - Implementation allows this

### Case 3: Player with Leader, Defense Only
- **Setup:** Player has leader and defense card
- **Expected:** ✅ Can submit battle plan with `weaponCardId: null, defenseCardId: <card>`
- **Status:** ✅ **PASS** - Implementation allows this

### Case 4: Player with Leader, Both Cards
- **Setup:** Player has leader, weapon, and defense cards
- **Expected:** ✅ Can submit battle plan with both `weaponCardId` and `defenseCardId`
- **Status:** ✅ **PASS** - Implementation allows this

### Case 5: Player with Cheap Hero, No Treachery Cards
- **Setup:** Player has Cheap Hero, no weapon/defense cards
- **Expected:** ✅ Can submit battle plan with `weaponCardId: null, defenseCardId: null`
- **Status:** ✅ **PASS** - Implementation allows this

### Case 6: Player without Leader or Cheap Hero
- **Setup:** Player has no leader and no Cheap Hero card
- **Expected:** ❌ Cannot submit battle plan with `weaponCardId` or `defenseCardId`
- **Status:** ✅ **PASS** - Implementation correctly prevents this (line 218-225)

## Summary

### ✅ Implementation Status: **CORRECT**

The implementation correctly enforces all aspects of the rule:

1. ✅ **Prerequisite enforced:** Players cannot play Treachery Cards without a leader or Cheap Hero
2. ✅ **Optional weapon:** Players may choose to play a weapon or not
3. ✅ **Optional defense:** Players may choose to play a defense or not
4. ✅ **Both allowed:** Players can play both weapon and defense cards
5. ✅ **Neither required:** Players can choose not to play any Treachery Cards

### Key Implementation Points

- `weaponCardId` and `defenseCardId` are nullable in the `BattlePlan` interface
- Validation only occurs when cards are provided (conditional checks)
- No enforcement exists that requires players to play Treachery Cards when they have a leader/Cheap Hero
- The prerequisite check (leader/Cheap Hero required) is correctly implemented

### Related Rules

- **Line 15 (NO TREACHERY):** Players without leader/Cheap Hero cannot play Treachery Cards - ✅ Correctly enforced
- **Line 14 (LEADER ANNOUNCEMENT):** Players must play leader/Cheap Hero if possible - ✅ Enforced separately (lines 111-153)

## Conclusion

The implementation fully complies with the rule from `handwritten-rules/battle.md` line 16. Players with a leader or Cheap Hero have complete discretion over whether to play Weapon, Defense, both, or neither Treachery Cards.


