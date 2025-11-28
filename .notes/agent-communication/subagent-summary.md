# Subagent Assignment Summary

This document lists all 10 subagent groups created to fix TypeScript errors in the codebase.

## Group 1: Test State Builders
**Focus:** TreacheryCard, TraitorCard, ForceStack type issues
**Instruction File:** `.notes/agent-communication/group1-test-state-builders.md`
**Report File:** `.notes/agent-communication/group1-report.md`
**Files:** 
- `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`
- `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts`
- `src/lib/game/test-battle-phase-example.ts`

## Group 2: Base Scenario Classes
**Focus:** boolean | undefined and context access issues
**Instruction File:** `.notes/agent-communication/group2-base-scenarios.md`
**Report File:** `.notes/agent-communication/group2-report.md`
**Files:** All base-scenario.ts files across phase tests

## Group 3: Battle Phase
**Focus:** TerritoryId enum, event types, type errors
**Instruction File:** `.notes/agent-communication/group3-battle-phase.md`
**Report File:** `.notes/agent-communication/group3-report.md`
**Files:**
- `src/lib/game/phase-tests/battle/scenarios/multi-faction-battle.ts`
- `src/lib/game/phase-tests/battle/scenarios/test-validation.ts`
- `src/lib/game/phases/handlers/battle.ts`
- `src/lib/game/test-battle-phase-example.ts`

## Group 4: Bidding Phase
**Focus:** AgentResponseBuilder type mismatches, missing test functions
**Instruction File:** `.notes/agent-communication/group4-bidding-phase.md`
**Report File:** `.notes/agent-communication/group4-report.md`
**Files:** All bidding phase scenario and test files

## Group 5: Revival Phase
**Focus:** Validation error codes, action types, boolean types
**Instruction File:** `.notes/agent-communication/group5-revival-phase.md`
**Report File:** `.notes/agent-communication/group5-report.md`
**Files:**
- `src/lib/game/phase-tests/revival/scenarios/real-scenario-test.ts`
- `src/lib/game/phases/handlers/revival.ts`
- `src/lib/game/rules/revival.ts`

## Group 6: Event Types
**Focus:** Invalid PhaseEventType in bidding handler
**Instruction File:** `.notes/agent-communication/group6-event-types.md`
**Report File:** `.notes/agent-communication/group6-report.md`
**Files:**
- `src/lib/game/phases/handlers/bidding.ts`

## Group 7: Module Imports
**Focus:** Incorrect import paths in test files
**Instruction File:** `.notes/agent-communication/group7-module-imports.md`
**Report File:** `.notes/agent-communication/group7-report.md`
**Files:**
- `src/lib/game/test-cheap-hero-enforcement.ts`
- `src/lib/game/test-fremen-revival-boost.ts`
- `src/lib/game/test-fremen-shipment.ts`
- `src/lib/game/test-fremen-tool.ts`
- `src/lib/game/phase-tests/helpers/test-logger.ts`

## Group 8: Test Type Mismatches
**Focus:** BattlePlan, TerritoryId, ToolCallOptions, function signatures
**Instruction File:** `.notes/agent-communication/group8-test-type-mismatches.md`
**Report File:** `.notes/agent-communication/group8-report.md`
**Files:**
- `src/lib/game/test-battle-phase-example.ts`
- `src/lib/game/test-emperor-ally-revival.ts`
- `src/lib/game/test-full-game.ts`
- `src/lib/game/test-leader-protection.ts`
- `src/lib/game/test-tleilaxu-ghola.ts`
- `src/lib/game/test-voice-compliance.ts`

## Group 9: Spice Collection
**Focus:** Missing property in ForcePlacement
**Instruction File:** `.notes/agent-communication/group9-spice-collection.md`
**Report File:** `.notes/agent-communication/group9-report.md`
**Files:**
- `src/lib/game/phase-tests/spice-collection/scenarios/elite-vs-regular.ts`

## Group 10: Tools and Rules
**Focus:** ToolError type issues
**Instruction File:** `.notes/agent-communication/group10-tools-rules.md`
**Report File:** `.notes/agent-communication/group10-report.md`
**Files:**
- `src/lib/game/tools/actions/revival.ts`

## Verification
After all subagents complete their fixes, run:
```bash
tsc --noEmit
pnpm build
```

