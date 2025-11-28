# Group 6: Fix Phase Handler Event Types

## Task
Fix invalid PhaseEventType string in bidding phase handler.

## Files to Fix
- `src/lib/game/phases/handlers/bidding.ts` (line 574)

## Specific Issues
1. **KARAMA_BUY_WITHOUT_PAYING** - Line 574: Not assignable to `PhaseEventType`

## Instructions
1. Check `PhaseEventType` enum definition
2. Either add the missing event type or use the correct existing one
3. Run `tsc --noEmit` to verify fix
4. Document your changes in `.notes/agent-communication/group6-report.md`

