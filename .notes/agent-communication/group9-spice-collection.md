# Group 9: Fix Spice Collection

## Task
Fix missing property in ForcePlacement for spice collection tests.

## Files to Fix
- `src/lib/game/phase-tests/spice-collection/scenarios/elite-vs-regular.ts` (line 25)

## Specific Issues
1. **ForcePlacement.regular** - Missing `regular` property (only has `elite`)

## Instructions
1. Check `ForcePlacement` type definition
2. Add missing `regular` property to the object (likely should be `0` or appropriate default)
3. Run `tsc --noEmit` to verify fix
4. Document your changes in `.notes/agent-communication/group9-report.md`

