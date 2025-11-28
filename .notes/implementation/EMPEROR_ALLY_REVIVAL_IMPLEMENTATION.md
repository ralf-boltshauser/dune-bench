# Emperor Ally Revival Implementation

## Summary

Implemented the Emperor's special alliance ability to pay for up to 3 extra force revivals for their ally beyond the normal revival limit, as specified in the Dune board game rules (battle.md line 108).

## Rule Reference

**ALLIANCE: You may pay spice for the revival of up to 3 extra of your ally's Forces beyond their current limit from the Tleilaxu Tanks.**

This means:
- Emperor can pay 2 spice per force (normal revival cost)
- Up to 3 extra forces per turn
- This is IN ADDITION to the ally's normal revival (not instead of)
- Only available when Emperor is allied

## Files Modified

### 1. `/src/lib/game/types/state.ts`
Added tracking field to `FactionState`:
```typescript
emperorAllyRevivalsUsed?: number; // Track Emperor's ally revival bonus used this turn (0-3)
```

### 2. `/src/lib/game/rules/revival.ts`
Updated `RevivalLimits` interface:
```typescript
export interface RevivalLimits {
  // ... existing fields
  emperorBonusAvailable: number;  // How many bonus revivals Emperor can still provide (0-3)
  emperorBonusUsed: number;       // How many have been used this turn
}
```

Updated `getRevivalLimits()` function:
- Checks if Emperor is the faction's ally
- Calculates available bonus: `3 - emperorAllyRevivalsUsed`
- Returns 0 if not allied with Emperor

### 3. `/src/lib/game/tools/schemas.ts`
Added new schema for the tool:
```typescript
export const EmperorPayAllyRevivalSchema = z.object({
  forceCount: z.number()
    .int()
    .min(1)
    .max(3)
    .describe('Number of ally forces to revive (1-3). Emperor pays 2 spice per force.')
});
```

Updated exports:
```typescript
export const RevivalSchemas = {
  reviveForces: ReviveForcesSchema,
  reviveLeader: ReviveLeaderSchema,
  emperorPayAllyRevival: EmperorPayAllyRevivalSchema,  // NEW
  pass: PassActionSchema,
};
```

### 4. `/src/lib/game/tools/actions/revival.ts`
Added new tool `emperor_pay_ally_revival`:
- **Description**: "EMPEROR ONLY: Pay spice to revive extra forces for your ally beyond their normal revival limit."
- **Validation**:
  - Must be Emperor faction
  - Must be allied
  - Ally must have forces in tanks
  - Request must be within available bonus (0-3)
  - Emperor must have enough spice
- **Execution**:
  - Revives forces for ally using `reviveForces()`
  - Deducts spice from Emperor using `removeSpice()`
  - Tracks usage in ally's `emperorAllyRevivalsUsed` field

Updated tool list:
```typescript
export const REVIVAL_TOOL_NAMES = [
  'revive_forces',
  'revive_leader',
  'emperor_pay_ally_revival',  // NEW
  'pass_revival'
] as const;
```

### 5. `/src/lib/game/phases/handlers/revival.ts`
Updated `initialize()` method:
- Resets `emperorAllyRevivalsUsed` to 0 for all factions at start of revival phase

Updated `requestRevivalDecisions()` method:
- Detects if faction is Emperor and allied
- Adds information to prompt about ally revival ability
- Includes `emperorAllyRevival` context data with:
  - `allyId`: The ally faction
  - `allyForcesInTanks`: How many forces ally has in tanks
  - `emperorBonusAvailable`: How many bonus revivals are available
  - `costPerForce`: Cost per force (2 spice)

### 6. `/src/lib/game/tools/index.ts`
Added schema export:
```typescript
export {
  // ...
  // Revival schemas
  ReviveForcesSchema,
  ReviveLeaderSchema,
  EmperorPayAllyRevivalSchema,  // NEW
  // ...
}
```

## How It Works

### Phase Flow

1. **Revival Phase Starts** (`initialize`)
   - All factions' `emperorAllyRevivalsUsed` counters are reset to 0
   - Emperor receives information about ally revival option in prompt (if allied)

2. **Emperor's Turn**
   - Emperor can use three tools:
     - `revive_forces` - for their own forces (normal rules)
     - `emperor_pay_ally_revival` - for ally forces (special ability)
     - `pass_revival` - skip revival
   - Tool validates all conditions
   - Executes revival and tracks usage

3. **Tracking**
   - Each use of `emperor_pay_ally_revival` increments the ally's `emperorAllyRevivalsUsed`
   - Subsequent calls check this counter to enforce the 3-revival limit
   - Counter is specific to each ally (not global for Emperor)

### Example Usage

```typescript
// Emperor with 10 spice, allied to Atreides who has 5 forces in tanks

// Normal Atreides revival (their own action)
revive_forces({ count: 3 })  // 2 free + 1 paid = 2 spice from Atreides

// Emperor pays for extra Atreides revival
emperor_pay_ally_revival({ forceCount: 2 })  // 4 spice from Emperor
// Atreides now has 5 forces revived total (3 from themselves + 2 from Emperor)

// Remaining Emperor bonus: 1 more force available this turn
```

### Validation Flow

```
emperor_pay_ally_revival call
  ↓
Is faction Emperor?
  ↓ Yes
Is Emperor allied?
  ↓ Yes (allyId exists)
Get ally's revival limits
  ↓
Is bonus available? (emperorBonusAvailable > 0)
  ↓ Yes
Is forceCount within bonus? (≤ emperorBonusAvailable)
  ↓ Yes
Does ally have forces in tanks?
  ↓ Yes
Does Emperor have enough spice?
  ↓ Yes
Execute:
  - Revive forces for ally
  - Deduct spice from Emperor
  - Increment ally's emperorAllyRevivalsUsed
```

## Testing

Created test file: `/src/lib/game/test-emperor-ally-revival.ts`

Tests cover:
1. ✓ Revival limits correctly show Emperor bonus (3 available)
2. ✓ Emperor can pay for ally revivals (spice deducted, forces revived)
3. ✓ Tracking correctly shows remaining bonus (1 after using 2)
4. ✓ Non-allied factions don't get Emperor bonus
5. ✓ Bonus tracking resets at start of new turn

All tests pass successfully.

## Integration with Existing System

The implementation follows the existing patterns:

1. **Immutable State**: All state updates return new objects
2. **Tool Pattern**: Follows the same structure as other revival tools
3. **Validation**: Comprehensive error checking with helpful messages
4. **Phase Management**: Properly resets state at phase boundaries
5. **Tool Registry**: Automatically available during REVIVAL phase

## Tool Availability

The `emperor_pay_ally_revival` tool is:
- Available during the `Phase.REVIVAL` phase
- Included in `REVIVAL_TOOL_NAMES` constant
- Automatically registered in the tool registry
- Visible to Emperor agents when they have an ally

## AI Agent Usage

The AI agent (Claude) will see this tool in the revival phase when playing as Emperor with an ally:

**Tool Description**:
```
EMPEROR ONLY: Pay spice to revive extra forces for your ally beyond their normal revival limit.

Rules:
- Only available to Emperor when allied
- Can revive up to 3 extra forces for ally per turn
- Costs 2 spice per force (paid by Emperor)
- Ally must have forces in tanks
- This is IN ADDITION to ally's normal revival (not instead of)

Use this to help rebuild your ally's forces after battle.
```

**Parameters**:
```typescript
{
  forceCount: number  // 1-3, how many ally forces to revive
}
```

## Notes

- The ability is tracked per ally (stored on ally's FactionState)
- Each ally can receive up to 3 bonus revivals per turn
- The counter resets at the start of each revival phase
- Emperor can still do their own normal revival separately
- The ally's normal revival limit (3 forces max) is not affected by this ability
- Cost is always 2 spice per force (same as normal paid revival)
