# Group 8: Test Files Type Mismatches - Fix Report

## Summary
Fixed various type mismatches in test files as specified in `group8-test-type-mismatches.md`. All targeted files now compile without TypeScript errors.

## Files Fixed

### 1. `test-battle-phase-example.ts`
**Issues:**
- Lines 74, 75, 78, 79: `shipForces` was called with numeric values (0, 2, 0, 3) for the `isElite` parameter, which expects `boolean | undefined`

**Fixes:**
- Changed `0` to `false` for regular forces
- Changed `2` and `3` to `true` for elite forces
- Removed `faction` property from `TraitorCard` object (line 113) - `TraitorCard` interface only has `leaderId`, `leaderName`, `leaderFaction`, and `heldBy`

### 2. `test-emperor-ally-revival.ts`
**Issues:**
- Line 48: `sendForcesToTanks` was called with only 3 arguments, but requires 5-6 arguments

**Fixes:**
- Updated call to include all required parameters: `sendForcesToTanks(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 10, false)`
- Added `TerritoryId` to imports

### 3. `test-full-game.ts`
**Issues:**
- Lines 452, 456: `SpiceLocation.spice` property doesn't exist - should be `amount`

**Fixes:**
- Changed `s.spice` to `s.amount` in both reduce operations

### 4. `test-leader-protection.ts`
**Issues:**
- Line 26: `advancedCombat` property doesn't exist in variants object
- Line 40: `'ARRAKEEN'` string literal not assignable to `TerritoryId` type

**Fixes:**
- Removed `advancedCombat` from variants (not a valid variant option)
- Changed `'ARRAKEEN'` to `TerritoryId.ARRAKEEN`
- Added `TerritoryId` to imports

### 5. `test-tleilaxu-ghola.ts`
**Issues:**
- Line 31: `'ARRAKEEN'` string literal not assignable to `TerritoryId`
- Line 36: `type: 6` (number) not assignable to `TreacheryCardType` enum
- Lines 66, 117, 166: `ToolCallOptions` missing required properties `toolCallId` and `messages`

**Fixes:**
- Changed all `'ARRAKEEN'` string literals to `TerritoryId.ARRAKEEN` (lines 31, 101, 157)
- Changed `type: 6` to `type: TreacheryCardType.SPECIAL`
- Added `TerritoryId` and `TreacheryCardType` to imports
- Updated all `ToolCallOptions` objects to include `toolCallId` and `messages` properties:
  ```typescript
  {
    toolCallId: 'test-1', // or 'test-2', 'test-3'
    messages: [],
  }
  ```

### 6. `test-voice-compliance.ts`
**Issues:**
- Line 7: `createInitialGameState` function doesn't exist - should be `createGameState`
- Lines 54, 76, 93, 115, 132: `BattlePlan` objects missing required `announcedNoLeader` property
- Lines 29, 35, 41, 47: `'hand'` string literal not assignable to `CardLocation` enum

**Fixes:**
- Changed import from `createInitialGameState` to `createGameState` from `./state/factory`
- Added `announcedNoLeader: false` to all 5 `BattlePlan` objects
- Changed all `'hand' as const` to `CardLocation.HAND`
- Added `CardLocation` to imports

## Verification
Ran `tsc --noEmit` and confirmed all errors in the specified files are resolved.

## Notes
- All fixes maintain the original test logic and intent
- Type safety improvements ensure better compile-time error detection
- Consistent use of enum values instead of string literals improves maintainability

