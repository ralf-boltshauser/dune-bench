# Group 7: Fix Module Import Path Issues

## Task
Fix incorrect module import paths in test files.

## Files to Fix
- `src/lib/game/test-cheap-hero-enforcement.ts` (lines 9, 10, 17)
- `src/lib/game/test-fremen-revival-boost.ts` (lines 6, 7, 8, 9, 10)
- `src/lib/game/test-fremen-shipment.ts` (lines 7, 8)
- `src/lib/game/test-fremen-tool.ts` (lines 8, 9, 10, 11, 12)
- `src/lib/game/phase-tests/helpers/test-logger.ts` (lines 13, 131, 134, 143)

## Specific Issues
1. **Wrong import paths** - Multiple files using `./src/lib/game/...` instead of relative paths
2. **Missing module** - `'../../../types'` cannot be found
3. **Type issues** - Implicit `any` types in test-logger.ts

## Instructions
1. Fix all import paths to use correct relative paths (e.g., `../types` instead of `./src/lib/game/types`)
2. Find the correct path for the `types` module
3. Fix type annotations in test-logger.ts
4. Run `tsc --noEmit` to verify fixes
5. Document your changes in `.notes/agent-communication/group7-report.md`

