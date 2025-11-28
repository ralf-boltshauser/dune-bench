# Cheap Hero Enforcement Implementation Summary

## Problem
The Cheap Hero card was optional in battle plans, but according to the rules, it MUST be played when a player has no available leaders but has the card.

## Rule Reference
From `dune-rules/battle.md`:
- Line 14: "A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible."
- Line 190: "The Cheap Hero may be played in place of a leader, it must be played when you have no leaders available."

## Solution

### Files Modified

#### 1. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/rules/types.ts`
Added two new error codes to the `ValidationErrorCode` type:
- `MUST_PLAY_LEADER` - When player has available leaders but doesn't play one
- `MUST_PLAY_CHEAP_HERO` - When player has no leaders but has Cheap Hero card and doesn't play it

```typescript
// Combat
| 'MUST_PLAY_LEADER_OR_CHEAP_HERO'  // Existing generic error
| 'MUST_PLAY_LEADER'                // NEW: Must play leader when available
| 'MUST_PLAY_CHEAP_HERO'            // NEW: Must play Cheap Hero when no leaders
```

#### 2. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/rules/combat.ts`

**Updated `validateBattlePlan` function (lines 110-138):**

Changed from a generic "play leader or cheap hero" check to a specific enforcement:

```typescript
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
  }
  // If no leaders AND no cheap hero, that's legal - just can't play treachery
}
```

**Updated `generateBattlePlanSuggestions` function (lines 415-425):**

Enhanced the comment and description to make it clear Cheap Hero is mandatory:

```typescript
// Cheap Hero - MANDATORY when no leaders available (battle.md line 190)
if (hasCheapHero(state, faction) && leaders.length === 0) {
  suggestions.push({
    forcesDialed: forcesAvailable,
    leaderId: null,
    weaponCardId: weapons[0]?.definitionId ?? null,
    defenseCardId: defenses[0]?.definitionId ?? null,
    estimatedStrength: forcesAvailable,
    description: `Cheap Hero with ${forcesAvailable} forces (MANDATORY - no leaders available)`,
  });
}
```

## Validation Logic

The new logic enforces a strict hierarchy:

1. **Has leaders available** → MUST play a leader (`MUST_PLAY_LEADER` error if not)
2. **No leaders, has Cheap Hero** → MUST play Cheap Hero (`MUST_PLAY_CHEAP_HERO` error if not)
3. **No leaders, no Cheap Hero** → Legal to have no leader (but cannot play treachery cards)

## Test Results

Created `test-cheap-hero-enforcement.ts` to verify the implementation:

### Test 1: No leaders available, Cheap Hero not used
- **Expected**: Fail with `MUST_PLAY_CHEAP_HERO`
- **Result**: ✓ PASS
- **Message**: "You must play Cheap Hero when you have no available leaders"

### Test 2: No leaders available, Cheap Hero used
- **Expected**: Pass validation
- **Result**: ✓ PASS

### Test 3: Leader available, neither leader nor Cheap Hero used
- **Expected**: Fail with `MUST_PLAY_LEADER` (not `MUST_PLAY_CHEAP_HERO`)
- **Result**: ✓ PASS
- **Message**: "You must play a leader when you have available leaders"

## Benefits

1. **Rules Compliance**: Now enforces the mandatory Cheap Hero rule from battle.md
2. **Clear Error Messages**: Agents get specific feedback about what they must do
3. **Agent-Friendly**: The error includes the field name (`cheapHeroUsed`) and specific suggestion
4. **Suggestion Enhancement**: Battle plan suggestions now indicate when Cheap Hero is MANDATORY
5. **Type Safety**: New error codes are properly typed in the ValidationErrorCode union

## Impact

- AI agents will now be forced to play Cheap Hero when they have no leaders
- Error messages clearly distinguish between "must play leader" and "must play Cheap Hero" scenarios
- Battle suggestions will emphasize the mandatory nature of Cheap Hero in the appropriate context
