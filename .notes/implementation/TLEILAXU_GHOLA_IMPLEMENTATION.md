# Tleilaxu Ghola Card Implementation

## Summary

Implemented the Tleilaxu Ghola special treachery card, allowing players to gain an extra revival during gameplay.

## Rule Reference

From `handwritten-rules/battle.md` line 214:
> **TLEILAXU GHOLA**: Special - Play at any time to gain an extra Revival. You may immediately revive 1 of your Leaders regardless of how many leaders you have in the Tanks (adding it to your Active Leader pool) or up to 5 of your Forces from the Tleilaxu Tanks to your reserves at no cost in spice. You still receive your normal revivals. Discard after use.

## Implementation Details

### Files Modified

1. **`src/lib/game/tools/schemas.ts`**
   - Added `UseTleilaxuGholaSchema` with validation for:
     - `reviveType`: enum ['leader', 'forces']
     - `leaderId`: optional string (required when reviveType is 'leader')
     - `forceCount`: optional number 1-5 (required when reviveType is 'forces')
   - Added schema to `RevivalSchemas` export

2. **`src/lib/game/tools/actions/revival.ts`**
   - Imported `UseTleilaxuGholaSchema` and `discardTreacheryCard`
   - Created `use_tleilaxu_ghola` tool with comprehensive validation:
     - Verifies player has the card in hand
     - For leader revival:
       - Validates leader ID is provided
       - Checks leader exists and is in tanks
       - Revives leader for FREE (no spice cost)
     - For force revival:
       - Validates force count (1-5)
       - Checks forces available in tanks
       - Revives forces for FREE (no spice cost)
     - Discards card after use
   - Added tool name to `REVIVAL_TOOL_NAMES` array

3. **`src/lib/game/tools/registry.ts`**
   - Added `'use_tleilaxu_ghola'` to multiple phases to implement "play at any time" rule:
     - `Phase.REVIVAL` (primary use case)
     - `Phase.SHIPMENT_MOVEMENT` (for emergency revival before shipping)
     - `Phase.BATTLE` (for emergency revival during battle)

### Test Coverage

Created `src/lib/game/test-tleilaxu-ghola.ts` with three test scenarios:

1. **Leader Revival Test**
   - ✓ Successfully revives Paul Atreides from tanks
   - ✓ Places leader in active leader pool (LEADER_POOL)
   - ✓ Discards Tleilaxu Ghola card after use
   - ✓ No spice cost

2. **Force Revival Test**
   - ✓ Successfully revives 5 forces from tanks
   - ✓ Adds forces to reserves
   - ✓ Removes forces from tanks
   - ✓ Discards card after use
   - ✓ No spice cost

3. **Validation Test**
   - ✓ Prevents usage when player doesn't have the card
   - ✓ Provides clear error message

All tests pass successfully.

## Key Features

### Proper Validation
- Card ownership verification
- Leader existence and tank location checks
- Force availability checks
- Parameter validation (leader ID when reviving leaders, force count when reviving forces)

### Rule Adherence
- **Free Revival**: No spice cost for either leaders or forces
- **Leader Override**: Can revive a leader even when normally restricted
- **Force Limit**: Maximum 5 forces per use
- **One-Time Use**: Card is discarded after use
- **Additional Revival**: Works in addition to normal revival phase actions
- **Play Timing**: Available during Revival, Shipment-Movement, and Battle phases

### Error Handling
- Comprehensive error messages with suggestions
- Validation error codes for debugging
- Field-specific error information

## Usage Example

```typescript
// During Revival phase with Tleilaxu Ghola card in hand
await use_tleilaxu_ghola({
  reviveType: 'leader',
  leaderId: 'paul_atreides'
});

// OR

await use_tleilaxu_ghola({
  reviveType: 'forces',
  forceCount: 5
});
```

## Design Decisions

1. **Phase Availability**: While rules say "play at any time", implemented in 3 key phases (Revival, Shipment-Movement, Battle) rather than all phases, as this covers all practical use cases while maintaining code simplicity.

2. **Parameter Design**: Used a single `reviveType` enum rather than separate tools for leader/force revival, keeping the interface clean while maintaining type safety through conditional validation.

3. **Free Revival**: Both leader and force revivals are completely free (0 spice cost), as per the rule text "at no cost in spice".

## Future Enhancements

If needed, the tool could be extended to:
- Be available in additional phases
- Track usage statistics
- Support interrupting other players' actions (though this would require significant phase handler changes)
