# Group 2: Fix Base Scenario Classes

## Task
Fix `boolean | undefined` type issues and context access problems in base scenario classes across all phase tests.

## Files to Fix
- `src/lib/game/phase-tests/battle/scenarios/base-scenario.ts` (line 93)
- `src/lib/game/phase-tests/bidding/scenarios/base-scenario.ts` (line 103)
- `src/lib/game/phase-tests/choam-charity/scenarios/base-scenario.ts` (line 93)
- `src/lib/game/phase-tests/revival/scenarios/base-scenario.ts` (line 94)
- `src/lib/game/phase-tests/shipment-movement/scenarios/base-scenario.ts` (lines 75, 102)
- `src/lib/game/phase-tests/spice-blow/scenarios/base-scenario.ts` (line 97)
- `src/lib/game/phase-tests/storm/scenarios/base-scenario.ts` (lines 119, 170)

## Specific Issues
1. **boolean | undefined** - Multiple locations where `boolean | undefined` is not assignable to `boolean`
2. **Context access** - Property `context` doesn't exist on `ShipmentMovementPhaseHandler` (line 75)

## Instructions
1. Find where `boolean | undefined` values are being assigned to `boolean` properties
2. Add proper default values or null checks (e.g., `value ?? false`)
3. Fix the context access issue in shipment-movement base scenario
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group2-report.md`

