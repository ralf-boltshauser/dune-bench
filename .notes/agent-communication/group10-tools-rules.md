# Group 10: Fix Tools and Rules Type Issues

## Task
Fix ToolError type issues in revival action handler.

## Files to Fix
- `src/lib/game/tools/actions/revival.ts` (lines 511, 563)

## Specific Issues
1. **ToolError.faction** - Property doesn't exist in `ToolError` type (2 errors)

## Instructions
1. Check `ToolError` type definition
2. Either remove `faction` property or add it to the type definition
3. If removing, ensure error messages still provide necessary context
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group10-report.md`

