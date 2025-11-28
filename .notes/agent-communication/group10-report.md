# Group 10: Fix Tools and Rules Type Issues - Report

## Task
Fix ToolError type issues in revival action handler.

## Issues Found
Two instances where `faction` property was being added to `ToolError` objects, but the `ToolError` interface doesn't include this property.

### Specific Errors
1. **Line 511** in `src/lib/game/tools/actions/revival.ts` - `grant_fremen_revival_boost` tool
2. **Line 563** in `src/lib/game/tools/actions/revival.ts` - `deny_fremen_revival_boost` tool

## Root Cause
The `ToolError` interface (defined in `src/lib/game/tools/types.ts`) only includes these properties:
- `code: string`
- `message: string`
- `suggestion?: string`
- `field?: string`
- `providedValue?: unknown`
- `validRange?: { min?: number; max?: number; options?: string[] }`

The `faction` property is not part of the interface, causing TypeScript errors.

## Solution
Removed the `faction` property from both error objects. The error messages already provide sufficient context:
- "This ability is exclusive to the Fremen faction"

The faction information is not needed in the error object since:
1. The error message already identifies the required faction
2. The `ToolError` type doesn't support custom properties
3. No other tools in the codebase include faction in their error objects

## Changes Made
1. **src/lib/game/tools/actions/revival.ts:511** - Removed `faction` property from error object in `grant_fremen_revival_boost` tool
2. **src/lib/game/tools/actions/revival.ts:563** - Removed `faction` property from error object in `deny_fremen_revival_boost` tool

## Verification
- ✅ TypeScript compilation (`tsc --noEmit`) confirms no errors related to ToolError.faction in revival.ts
- ✅ No linter errors found
- ✅ Error messages still provide necessary context without the faction property

## Status
**COMPLETED** - All ToolError type issues in revival action handler have been fixed.

