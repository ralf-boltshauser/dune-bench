# Group 1: Fix Test State Builders

## Task
Fix TypeScript errors in test state builder files related to TreacheryCard, TraitorCard, and ForceStack type mismatches.

## Files to Fix
- `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`
- `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts`
- `src/lib/game/test-battle-phase-example.ts`

## Specific Issues
1. **TreacheryCard creation** - Missing `location` and `ownerId` properties (lines 226, 182)
2. **TraitorCard creation** - `faction` property doesn't exist (lines 254, 113)
3. **ForceStack creation** - Missing `factionId` property (line 86)
4. **ForceStack undefined** - Handle undefined cases (lines 91, 93, 95)

## Instructions
1. Read the type definitions for `TreacheryCard`, `TraitorCard`, and `ForceStack` to understand required properties
2. Fix all object creations to include all required properties
3. Add proper null/undefined checks where needed
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group1-report.md`

