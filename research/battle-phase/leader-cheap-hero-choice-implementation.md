# Leader vs Cheap Hero Choice Implementation

This document shows how the "choosing" logic is implemented for selecting between a Leader and Cheap Hero in battle plans.

## Overview

When both a leader and Cheap Hero are available, the player can **choose** either one. The implementation enforces that at least one must be played, but allows the player to make the strategic choice.

## Flow Diagram

```
Agent/Player
    ↓
submit_battle_plan tool
    ↓
Tool validates basic availability
    ↓
Response with plan object
    ↓
Phase handler converts to BattlePlan
    ↓
validateBattlePlan() enforces choice
    ↓
Plan accepted or rejected with error
```

## 1. Tool Schema - Player Input

**Location**: `src/lib/game/tools/schemas.ts` lines 338-369

The tool accepts both `leaderId` and `useCheapHero` as **optional** parameters:

```338:369:src/lib/game/tools/schemas.ts
export const BattlePlanSchema = z.object({
  leaderId: LeaderIdSchema
    .describe('Leader to use in battle. Required if you have available leaders.'),
  forcesDialed: z.number()
    .int()
    .min(0)
    .max(20)
    .describe('Number of forces to dial on battle wheel. These forces are lost regardless of outcome.'),
  weaponCardId: CardIdSchema
    .describe('Weapon treachery card to use, or null'),
  defenseCardId: CardIdSchema
    .describe('Defense treachery card to use, or null'),
  useKwisatzHaderach: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to use Kwisatz Haderach (Atreides only, if active)'),
  useCheapHero: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to use Cheap Hero card instead of a leader'),
  announcedNoLeader: z.boolean()
    .optional()
    .default(false)
    .describe('Set to true to announce you cannot play a leader or Cheap Hero. Only required when you have no available leaders and no Cheap Hero card.'),
  spiceDialed: z.number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(0)
    .describe('Spice to pay for full-strength forces (advanced rules only). Each force needs 1 spice to count at full strength. Unspiced forces count at half strength. Fremen do not need spice (BATTLE HARDENED). When traitor is revealed, winner keeps spice paid.'),
});
```

**Key Points**:
- `leaderId` is nullable (can be `null`)
- `useCheapHero` is optional boolean (defaults to `false`)
- Player can set either `leaderId` OR `useCheapHero: true` OR both (but validation will catch if both are set)

## 2. Tool Execution - Basic Validation

**Location**: `src/lib/game/tools/actions/battle.ts` lines 82-188

The tool performs basic validation but **does not enforce the choice** - that's done later:

```82:120:src/lib/game/tools/actions/battle.ts
      execute: async (params: z.infer<typeof BattlePlanSchema>, options) => {
        const {
          leaderId,
          forcesDialed,
          weaponCardId,
          defenseCardId,
          useKwisatzHaderach,
          useCheapHero,
        } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Validate leader
        if (leaderId && !useCheapHero) {
          const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
          if (!leader) {
            return failureResult(
              `Leader not found: ${leaderId}`,
              {
                code: 'INVALID_LEADER',
                message: 'You do not have this leader',
                suggestion: 'Check available leaders with view_my_faction',
              },
              false
            );
          }
          if (leader.location !== LeaderLocation.LEADER_POOL) {
            return failureResult(
              `Leader ${leaderId} is not available`,
              {
                code: 'LEADER_UNAVAILABLE',
                message: `This leader is ${leader.location}`,
                suggestion: 'Choose an available leader or use Cheap Hero',
              },
              false
            );
          }
        }
```

**Key Logic**:
- Line 96: `if (leaderId && !useCheapHero)` - Only validates leader if Cheap Hero is NOT being used
- This allows the player to choose Cheap Hero even when leaders are available
- The tool returns a plan object with `useCheapHero` field

## 3. Plan Object Returned by Tool

**Location**: `src/lib/game/tools/actions/battle.ts` lines 170-187

The tool returns a plan object (not yet a full `BattlePlan`):

```170:187:src/lib/game/tools/actions/battle.ts
        return successResult(
          `Battle plan submitted: ${forcesDialed} forces dialed, ${leaderDef?.name ?? 'no leader'}`,
          {
            faction,
            plan: {
              leaderId,
              leaderName: leaderDef?.name,
              leaderStrength,
              forcesDialed,
              weaponCardId,
              defenseCardId,
              useKwisatzHaderach,
              useCheapHero,
            },
            estimatedTotal: forcesDialed + leaderStrength + kwisatzBonus,
          },
          false // State updated by phase handler
        );
```

**Note**: The tool returns `useCheapHero`, but the `BattlePlan` interface uses `cheapHeroUsed`. The transformation happens in the phase handler.

## 4. Phase Handler - Plan Conversion

**Location**: `src/lib/game/phases/handlers/battle.ts` line 840

The phase handler receives the tool response and casts it to `BattlePlan`:

```840:840:src/lib/game/phases/handlers/battle.ts
      const plan = response.data.plan as BattlePlan;
```

**Note**: There should be a transformation step here that converts `useCheapHero` → `cheapHeroUsed`, but it appears the casting assumes the structure matches. The actual conversion likely happens implicitly or in a helper function.

## 5. Validation - Choice Enforcement

**Location**: `src/lib/game/rules/combat.ts` lines 110-169

This is where the **choosing logic** is actually enforced:

```110:169:src/lib/game/rules/combat.ts
  // Check: Leader or Cheap Hero requirement
  // Rule from battle.md line 12: "A Cheap Hero Card may be played in lieu of a Leader Disc."
  // Rule from battle.md line 14: "A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible."
  if (!plan.leaderId && !plan.cheapHeroUsed) {
    if (hasLeaders || hasCheapHeroCard) {
      // Has leaders OR Cheap Hero available - must play one (player's choice)
      if (hasLeaders && hasCheapHeroCard) {
        errors.push(
          createError(
            'MUST_PLAY_LEADER_OR_CHEAP_HERO',
            'You must play either a leader or Cheap Hero (your choice)',
            {
              field: 'leaderId',
              suggestion: `Play ${availableLeaders[0].definitionId} or set cheapHeroUsed to true`,
            }
          )
        );
      } else if (hasLeaders) {
        // Only leaders available - must play a leader
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
        // Only Cheap Hero available - MUST play it (forced rule)
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

**The Choosing Logic** (lines 116-126):
1. **Line 113**: Checks if neither leader nor Cheap Hero is set
2. **Line 114**: Checks if at least one is available
3. **Line 116**: **If BOTH are available** → Error says "your choice" - player must pick one, but can choose either
4. **Line 127**: If only leaders available → Must play leader
5. **Line 139**: If only Cheap Hero available → Must play Cheap Hero

**Key Point**: When both are available (line 116), the error message explicitly says "your choice", meaning the player can choose either option.

## 6. Additional Validation - Cannot Use Both

**Location**: `src/lib/game/rules/combat.ts` lines 205-214

The validation also prevents using both at the same time:

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

## 7. Suggestions Generator - Shows Options

**Location**: `src/lib/game/rules/combat.ts` lines 486-498

The suggestions generator includes Cheap Hero as an option even when leaders are available:

```486:498:src/lib/game/rules/combat.ts
  // Cheap Hero - can be played in lieu of a leader (battle.md line 12)
  // MANDATORY when no leaders available (battle.md line 190)
  if (hasCheapHero(state, faction)) {
    const isMandatory = leaders.length === 0;
    suggestions.push({
      forcesDialed: forcesAvailable,
      leaderId: null,
      weaponCardId: weapons[0]?.definitionId ?? null,
      defenseCardId: defenses[0]?.definitionId ?? null,
      estimatedStrength: forcesAvailable,
      description: `Cheap Hero with ${forcesAvailable} forces${isMandatory ? ' (MANDATORY - no leaders available)' : ' (optional - can be played in lieu of leader)'}`,
    });
  }
```

**Key Points**:
- Line 488: Checks if Cheap Hero is available
- Line 489: Determines if it's mandatory (no leaders) or optional (leaders available)
- Line 496: Description explicitly says "optional - can be played in lieu of leader" when leaders are available

## Summary: How the Choice Works

1. **Player Input**: Agent/player calls `submit_battle_plan` with either:
   - `leaderId: "some_leader"` and `useCheapHero: false` (or omitted)
   - `leaderId: null` and `useCheapHero: true`
   - Both set (will be caught by validation)

2. **Tool Validation**: Basic checks (leader exists, is available) but doesn't enforce choice

3. **Plan Submission**: Tool returns plan object with `useCheapHero` field

4. **Phase Handler**: Converts tool response to `BattlePlan` (with `cheapHeroUsed` field)

5. **Validation**: `validateBattlePlan()` enforces:
   - If both available → Must choose one (error says "your choice")
   - If only leaders → Must play leader
   - If only Cheap Hero → Must play Cheap Hero
   - If neither → Must announce inability
   - Cannot use both simultaneously

6. **Result**: Plan is accepted if valid, rejected with specific error if invalid

## Example Scenarios

### Scenario 1: Both Available - Choose Leader
```typescript
// Tool call
{
  leaderId: "duke_leto",
  useCheapHero: false,
  forcesDialed: 5
}
// ✅ Valid - chose leader
```

### Scenario 2: Both Available - Choose Cheap Hero
```typescript
// Tool call
{
  leaderId: null,
  useCheapHero: true,
  forcesDialed: 5
}
// ✅ Valid - chose Cheap Hero (strategic choice)
```

### Scenario 3: Both Available - Choose Neither
```typescript
// Tool call
{
  leaderId: null,
  useCheapHero: false,
  forcesDialed: 5
}
// ❌ Invalid - Error: "You must play either a leader or Cheap Hero (your choice)"
```

### Scenario 4: Both Available - Choose Both
```typescript
// Tool call
{
  leaderId: "duke_leto",
  useCheapHero: true,
  forcesDialed: 5
}
// ❌ Invalid - Error: "Cannot play both a leader and Cheap Hero - choose one"
```

