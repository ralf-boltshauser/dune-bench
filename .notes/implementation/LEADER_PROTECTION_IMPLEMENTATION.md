# Leader Protection Implementation

## Summary

Implemented protection for surviving leaders from game effects per the rule: "SURVIVING LEADERS: Leaders who survive remain in the Territory where they were used. (Game effects do not kill these leaders while there.)" (battle.md line 23)

## Rule Reference

**Source**: handwritten-rules/battle.md line 23

> "SURVIVING LEADERS: Leaders who survive remain in the Territory where they were used. (Game effects do not kill these leaders while there.) These are not part of the Leader Pool until Leader Return [1.07.07]."

## Key Points

1. Leaders who survive battles move to `LeaderLocation.ON_BOARD` status
2. Leaders with `ON_BOARD` status are immune to:
   - Storm damage
   - Sandworm devouring
   - Other "game effects"
3. Leaders with `ON_BOARD` status are NOT immune to:
   - Battle deaths (direct combat)
   - Lasgun/Shield explosions (KH PROPHECY BLINDED ability)
4. Protected leaders return to the leader pool during Leader Return phase

## Implementation Details

### 1. Query Functions (src/lib/game/state/queries.ts)

Added two new query functions to check leader protection status:

```typescript
/**
 * Check if a leader is protected from game effects.
 */
export function isLeaderProtectedOnBoard(
  state: GameState,
  faction: Faction,
  leaderId: string
): boolean;

/**
 * Get all leaders currently protected on board for a faction.
 * Returns the definitionIds of leaders that are immune to game effects.
 */
export function getProtectedLeaders(state: GameState, faction: Faction): string[];
```

### 2. Mutation Protection (src/lib/game/state/mutations.ts)

Updated `killLeader()` function to include protection check:

```typescript
export function killLeader(
  state: GameState,
  faction: Faction,
  leaderId: string,
  allowProtected: boolean = false  // NEW PARAMETER
): GameState;
```

- By default, leaders with `LeaderLocation.ON_BOARD` cannot be killed
- Set `allowProtected=true` to bypass protection (e.g., for Lasgun/Shield explosions)
- Logs a warning when attempting to kill a protected leader

### 3. Storm Phase Handler (src/lib/game/phases/handlers/storm.ts)

Updated `destroyForcesInStorm()` method:

- Added import of `getProtectedLeaders` and `LeaderLocation`
- Checks for protected leaders in affected territories
- Logs when protected leaders are present: `🛡️  {count} {faction} leader(s) protected from storm in {territory}`
- Note: Storm already only affects forces, not leaders directly, but this provides defensive logging

### 4. Spice Blow Phase Handler (src/lib/game/phases/handlers/spice-blow.ts)

Updated `executeDevour()` method:

- Added import of `getProtectedLeaders` and `LeaderLocation`
- Checks for protected leaders before sandworm devouring
- Logs when protected leaders are present: `🛡️  {count} {faction} leader(s) protected from sandworm in {territory}`
- Emits `LEADER_PROTECTED_FROM_WORM` event for tracking
- Note: Sandworms already only affect forces, not leaders directly, but this provides defensive logging

### 5. Event Type (src/lib/game/phases/types.ts)

Added new event type for tracking:

```typescript
export type PhaseEventType =
  // ... other types
  | 'LEADER_PROTECTED_FROM_WORM'
  // ...
```

## Testing

Created comprehensive test: `src/lib/game/test-leader-protection.ts`

Test results:
- ✅ Leaders with `LeaderLocation.ON_BOARD` are protected from `killLeader()` by default
- ✅ Protection can be bypassed with `allowProtected=true` (for Lasgun/Shield explosions)
- ✅ Query functions `isLeaderProtectedOnBoard()` and `getProtectedLeaders()` work correctly
- ✅ Storm and sandworm handlers log when protected leaders are present

## Usage Examples

### Battle Handler (when leader survives)
```typescript
// Mark leader as used in battle - moves to ON_BOARD status
state = markLeaderUsed(state, faction, leaderId, territoryId);
// Leader is now protected from game effects
```

### Storm/Sandworm Handling
```typescript
// Check for protected leaders
const protectedLeaders = getProtectedLeaders(state, faction);
if (protectedLeaders.length > 0) {
  console.log(`${protectedLeaders.length} leaders protected from game effect`);
}
// killLeader() will automatically skip protected leaders
```

### Lasgun/Shield Explosion (KH ability)
```typescript
// Bypass protection for special abilities
state = killLeader(state, faction, leaderId, true); // allowProtected=true
```

## Files Modified

1. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/queries.ts`
   - Added `isLeaderProtectedOnBoard()` function
   - Added `getProtectedLeaders()` function

2. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/mutations.ts`
   - Updated `killLeader()` with `allowProtected` parameter
   - Added protection check and warning log

3. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/index.ts`
   - Exported new query functions

4. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/storm.ts`
   - Added `getProtectedLeaders` and `LeaderLocation` imports
   - Added protection logging in `destroyForcesInStorm()`

5. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/spice-blow.ts`
   - Added `getProtectedLeaders` and `LeaderLocation` imports
   - Added protection logging in `executeDevour()`
   - Added `LEADER_PROTECTED_FROM_WORM` event

6. `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/types.ts`
   - Added `LEADER_PROTECTED_FROM_WORM` to `PhaseEventType`

## Future Considerations

1. **Leader Return Phase**: When implementing the Leader Return phase (1.07.07), leaders with `LeaderLocation.ON_BOARD` should be moved back to `LeaderLocation.LEADER_POOL`

2. **Battle Phase Integration**: Ensure battle handlers properly use `markLeaderUsed()` to set surviving leaders to `ON_BOARD` status

3. **Kwisatz Haderach Abilities**: The Atreides Kwisatz Haderach may have special interactions with leader protection (verify against rules)

4. **Lasgun/Shield Explosions**: When implementing KH PROPHECY BLINDED ability, use `killLeader(state, faction, leaderId, true)` to bypass protection

## Type Safety

All changes are type-safe and compile without errors. The implementation:
- Uses existing `LeaderLocation.ON_BOARD` enum value
- Adds optional parameter with default value for backward compatibility
- Exports new functions through the state module's public API
- Properly types all event data structures
