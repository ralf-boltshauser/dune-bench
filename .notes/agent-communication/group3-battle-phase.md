# Group 3: Fix Battle Phase Issues

## Task
Fix TerritoryId enum issues, event type mismatches, and type errors in battle phase handlers and tests.

## Files to Fix
- `src/lib/game/phase-tests/battle/scenarios/multi-faction-battle.ts` (lines 34, 42, 50, 58, 81, 118)
- `src/lib/game/phase-tests/battle/scenarios/test-validation.ts` (line 77)
- `src/lib/game/phases/handlers/battle.ts` (lines 500, 1286, 1774, 1799, 2435, 2445)
- `src/lib/game/test-battle-phase-example.ts` (line 223)

## Specific Issues
1. **TerritoryId.GREAT_FLAT** - Doesn't exist (6 occurrences)
2. **null parameter** - Line 77: `null` not assignable to parameter type
3. **INVALID_ACTION** - Line 500: Not a valid `PhaseEventType`
4. **unknown type** - Line 1286: `unknown` not assignable to expected type
5. **Faction | null** - Lines 1774, 1799: Need null checks
6. **CARD_DISCARD_CHOICE** - Lines 2435, 2445: Should be `"CARD_DISCARDED"`
7. **BATTLES_IDENTIFIED** - Line 223: Type comparison error

## Instructions
1. Check `TerritoryId` enum definition - either add `GREAT_FLAT` or replace with correct territory
2. Fix all event type strings to match `PhaseEventType` enum
3. Add proper null checks for `Faction | null` cases
4. Fix type assertions and comparisons
5. Run `tsc --noEmit` to verify fixes
6. Document your changes in `.notes/agent-communication/group3-report.md`

