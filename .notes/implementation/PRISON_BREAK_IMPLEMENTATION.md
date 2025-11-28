# Prison Break Implementation Summary

## Overview
Implemented the Prison Break rule from battle.md line 154: "When all your own leaders have been killed, you must return all captured leaders immediately to the players who last had them as an Active Leader."

## Changes Made

### 1. Added Prison Break Event Type
**File**: `src/lib/game/phases/types.ts`
- Added `PRISON_BREAK` to the `PhaseEventType` union type

### 2. Exported Captured Leader Functions
**File**: `src/lib/game/state/index.ts`
- Exported query functions:
  - `getCapturedLeaders`
  - `getAvailableLeadersForCapture`
  - `shouldTriggerPrisonBreak`
- Exported mutation functions:
  - `captureLeader`
  - `killCapturedLeader`
  - `returnCapturedLeader`
  - `returnAllCapturedLeaders`

### 3. Implemented Prison Break Check in Battle Handler
**File**: `src/lib/game/phases/handlers/battle.ts`

#### Added `checkPrisonBreak` Method
```typescript
private checkPrisonBreak(
  state: GameState,
  faction: Faction,
  events: PhaseEvent[]
): GameState
```

This method:
1. Checks if the faction is still in the game
2. Calls `shouldTriggerPrisonBreak()` to verify if all own leaders are dead
3. If triggered, calls `returnAllCapturedLeaders()` to return all captured leaders
4. Emits a `PRISON_BREAK` event with details

#### Integrated Prison Break Checks
Added `checkPrisonBreak()` calls after every leader death:

1. **Lasgun-Shield Explosion** (lines 1163-1169):
   - After aggressor's leader is killed
   - After defender's leader is killed

2. **Normal Battle Resolution** (lines 1222-1223):
   - After loser's leader is killed

## How It Works

### Detection Logic (`shouldTriggerPrisonBreak` in queries.ts)
1. Filters the faction's leaders to find only their own leaders (where `originalFaction === faction`)
2. Checks if ALL own leaders are in tanks (either TANKS_FACE_UP or TANKS_FACE_DOWN)
3. Checks if the faction has any captured leaders (`capturedBy !== null`)
4. Returns `true` only if both conditions are met

### Prison Break Execution (`returnAllCapturedLeaders` in mutations.ts)
1. Gets all captured leaders held by the faction
2. Calls `returnCapturedLeader()` for each one
3. Each leader is removed from the captor's pool and returned to their original faction's leader pool

### Edge Cases Handled
1. **No captured leaders**: Prison Break doesn't trigger (no leaders to return)
2. **Some own leaders still alive**: Prison Break doesn't trigger (rule requires ALL own leaders dead)
3. **Faction not in game**: Early return, no error
4. **Multiple leader deaths in same battle**: Prison Break check runs after each death, but only triggers once when condition is met
5. **Captured leaders from multiple factions**: All captured leaders are returned to their respective original owners

## Rule Implementation Notes

The implementation follows the exact rule text:
- ✅ Only triggers when **all own leaders** are killed (not captured ones)
- ✅ Returns **all captured leaders** immediately
- ✅ Leaders return to "players who last had them as an Active Leader" (original faction)
- ✅ Triggers **immediately** after the death that kills the last own leader

## Faction Support

While the rule description mentions Harkonnen specifically, the implementation is **generic** and works for any faction:
- The `shouldTriggerPrisonBreak()` function accepts any `Faction` parameter
- The `returnAllCapturedLeaders()` function works for any faction
- This is intentional design for potential future game variants or special abilities

## Testing Recommendations

To test Prison Break:
1. Set up a game with Harkonnen
2. Have Harkonnen win battles and capture enemy leaders
3. Kill all of Harkonnen's own leaders (through battles)
4. Verify that all captured leaders are immediately returned to their original factions
5. Check that the `PRISON_BREAK` event is emitted with correct data

## Files Modified
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/types.ts`
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts`
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/index.ts`

## Files Leveraged (Already Existed)
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/queries.ts` - `shouldTriggerPrisonBreak()`
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/state/mutations.ts` - `returnAllCapturedLeaders()`
