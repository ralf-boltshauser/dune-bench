# Group 5: Fix Revival Phase Issues

## Task
Fix validation error codes, action types, and boolean type issues in revival phase.

## Files to Fix
- `src/lib/game/phase-tests/revival/scenarios/real-scenario-test.ts` (line 211)
- `src/lib/game/phases/handlers/revival.ts` (line 580)
- `src/lib/game/rules/revival.ts` (lines 172, 189)

## Specific Issues
1. **boolean | undefined** - Line 211: Not assignable to `boolean`
2. **KWISATZ_HADERACH_REVIVED** - Line 580: Not assignable to `GameActionType`
3. **ELITE_REVIVAL_LIMIT_EXCEEDED** - Line 172: Not assignable to `ValidationErrorCode`
4. **ELITE_REVIVAL_ALREADY_USED** - Line 189: Not assignable to `ValidationErrorCode`

## Instructions
1. Check `GameActionType` enum - add missing action type or use correct one
2. Check `ValidationErrorCode` enum - add missing error codes or use correct ones
3. Fix boolean type issue with proper default value
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group5-report.md`

