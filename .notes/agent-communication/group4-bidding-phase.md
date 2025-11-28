# Group 4: Fix Bidding Phase Issues

## Task
Fix AgentResponseBuilder type mismatches and missing test function exports in bidding phase tests.

## Files to Fix
- `src/lib/game/phase-tests/bidding/scenarios/atreides-prescience.ts` (line 64)
- `src/lib/game/phase-tests/bidding/scenarios/bought-in-rule.ts` (line 46)
- `src/lib/game/phase-tests/bidding/scenarios/complex-multi-card.ts` (line 118)
- `src/lib/game/phase-tests/bidding/scenarios/emperor-payment.ts` (line 80)
- `src/lib/game/phase-tests/bidding/scenarios/hand-size-changes.ts` (line 58)
- `src/lib/game/phase-tests/bidding/scenarios/harkonnen-top-card.ts` (line 62)
- `src/lib/game/phase-tests/bidding/scenarios/multiple-factions-bidding-war.ts` (line 84)
- `src/lib/game/phase-tests/bidding/test-bidding-phase.ts` (lines 33, 40, 47, 54, 61, 68, 75)

## Specific Issues
1. **AgentResponseBuilder** - 7 locations where `AgentResponseBuilder` is not assignable to `string`
2. **Missing test functions** - 7 test function names cannot be found

## Instructions
1. Check how `AgentResponseBuilder` should be converted to string (may need `.toString()` or `.build()`)
2. Find the actual test function names or export them properly
3. Fix all type mismatches
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group4-report.md`

