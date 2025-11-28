# Group 8: Fix Test Files Type Mismatches

## Task
Fix various type mismatches in test files including BattlePlan, TerritoryId, ToolCallOptions, and function signatures.

## Files to Fix
- `src/lib/game/test-battle-phase-example.ts` (lines 74, 75, 78, 79)
- `src/lib/game/test-emperor-ally-revival.ts` (line 48)
- `src/lib/game/test-full-game.ts` (lines 452, 456)
- `src/lib/game/test-leader-protection.ts` (lines 26, 40)
- `src/lib/game/test-tleilaxu-ghola.ts` (lines 31, 36, 66, 101, 117, 157, 166)
- `src/lib/game/test-voice-compliance.ts` (lines 7, 54, 76, 93, 115, 132)

## Specific Issues
1. **Wrong argument types** - Numbers instead of `boolean | undefined` (4 errors)
2. **Wrong argument count** - Expected 5-6 arguments, got 3
3. **SpiceLocation.spice** - Property doesn't exist (2 errors)
4. **advancedCombat** - Unknown property in object literal
5. **TerritoryId.ARRAKEEN** - Not assignable (4 errors)
6. **TreacheryCardType** - `number` not assignable
7. **ToolCallOptions** - Missing required properties (3 errors)
8. **createInitialGameState** - Should be `createGameState`
9. **BattlePlan.announcedNoLeader** - Missing property (5 errors)

## Instructions
1. Fix all function call arguments to match expected types
2. Check TerritoryId enum - use correct territory ID or fix enum
3. Add missing properties to object literals
4. Fix function name from `createInitialGameState` to `createGameState`
5. Add `announcedNoLeader` property to all BattlePlan objects
6. Run `tsc --noEmit` to verify fixes
7. Document your changes in `.notes/agent-communication/group8-report.md`

