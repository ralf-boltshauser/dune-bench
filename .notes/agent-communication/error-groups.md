# TypeScript Error Groups for Subagents

This file contains the grouped TypeScript errors from the codebase. Each group should be assigned to a subagent for fixing.

## Group 1: Test State Builders - TreacheryCard, TraitorCard, ForceStack
**Files:**
- `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`
- `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts`
- `src/lib/game/test-battle-phase-example.ts`

**Issues:**
1. Line 226: Missing `location` and `ownerId` properties when creating `TreacheryCard`
2. Line 254: `TraitorCard` type mismatch - `faction` property doesn't exist
3. Line 86: Missing `factionId` property in `ForceStack`
4. Line 91: `ForceStack | undefined` passed where `ForceStack` required
5. Lines 93, 95: `stack` is possibly `undefined`
6. Line 182: Missing `location` and `ownerId` properties when creating `TreacheryCard`
7. Line 113: `TraitorCard` type mismatch - `faction` property doesn't exist

## Group 2: Base Scenario Classes - boolean | undefined and Context Access
**Files:**
- `src/lib/game/phase-tests/battle/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/bidding/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/choam-charity/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/revival/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/shipment-movement/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/spice-blow/scenarios/base-scenario.ts`
- `src/lib/game/phase-tests/storm/scenarios/base-scenario.ts`

**Issues:**
1. Multiple lines: `boolean | undefined` not assignable to `boolean` (lines 93, 103, 94, 102, 97, 119, 170)
2. Line 75: Property `context` doesn't exist on `ShipmentMovementPhaseHandler`

## Group 3: Battle Phase - TerritoryId and Event Types
**Files:**
- `src/lib/game/phase-tests/battle/scenarios/multi-faction-battle.ts`
- `src/lib/game/phase-tests/battle/scenarios/test-validation.ts`
- `src/lib/game/phases/handlers/battle.ts`
- `src/lib/game/test-battle-phase-example.ts`

**Issues:**
1. Lines 34, 42, 50, 58, 81, 118: `TerritoryId.GREAT_FLAT` doesn't exist (6 errors)
2. Line 77: `null` not assignable to parameter type
3. Line 500: `"INVALID_ACTION"` not assignable to `PhaseEventType`
4. Line 1286: `unknown` not assignable to expected type
5. Lines 1774, 1799: `Faction | null` not assignable to `Faction`
6. Lines 2435, 2445: `"CARD_DISCARD_CHOICE"` should be `"CARD_DISCARDED"`
7. Line 223: Type comparison error with `"BATTLES_IDENTIFIED"`

## Group 4: Bidding Phase - AgentResponseBuilder and Missing Tests
**Files:**
- `src/lib/game/phase-tests/bidding/scenarios/atreides-prescience.ts`
- `src/lib/game/phase-tests/bidding/scenarios/bought-in-rule.ts`
- `src/lib/game/phase-tests/bidding/scenarios/complex-multi-card.ts`
- `src/lib/game/phase-tests/bidding/scenarios/emperor-payment.ts`
- `src/lib/game/phase-tests/bidding/scenarios/hand-size-changes.ts`
- `src/lib/game/phase-tests/bidding/scenarios/harkonnen-top-card.ts`
- `src/lib/game/phase-tests/bidding/scenarios/multiple-factions-bidding-war.ts`
- `src/lib/game/phase-tests/bidding/test-bidding-phase.ts`

**Issues:**
1. Multiple files: `AgentResponseBuilder` not assignable to `string` (7 errors)
2. Lines 33, 40, 47, 54, 61, 68, 75: Cannot find test function names (7 errors)

## Group 5: Revival Phase - ForceStack, Validation Codes, Action Types
**Files:**
- `src/lib/game/phase-tests/revival/scenarios/real-scenario-test.ts`
- `src/lib/game/phases/handlers/revival.ts`
- `src/lib/game/rules/revival.ts`

**Issues:**
1. Line 211: `boolean | undefined` not assignable to `boolean`
2. Line 580: `"KWISATZ_HADERACH_REVIVED"` not assignable to `GameActionType`
3. Line 172: `"ELITE_REVIVAL_LIMIT_EXCEEDED"` not assignable to `ValidationErrorCode`
4. Line 189: `"ELITE_REVIVAL_ALREADY_USED"` not assignable to `ValidationErrorCode`

## Group 6: Phase Handler Event Types - Invalid PhaseEventType Strings
**Files:**
- `src/lib/game/phases/handlers/bidding.ts`

**Issues:**
1. Line 574: `"KARAMA_BUY_WITHOUT_PAYING"` not assignable to `PhaseEventType`

## Group 7: Test Files - Module Import Path Issues
**Files:**
- `src/lib/game/test-cheap-hero-enforcement.ts`
- `src/lib/game/test-fremen-revival-boost.ts`
- `src/lib/game/test-fremen-shipment.ts`
- `src/lib/game/test-fremen-tool.ts`
- `src/lib/game/phase-tests/helpers/test-logger.ts`

**Issues:**
1. Multiple files: Cannot find modules with wrong import paths (15+ errors)
2. Line 13: Cannot find module `'../../../types'`
3. Lines 131, 134, 143: Type issues in test-logger.ts

## Group 8: Test Files - Type Mismatches (BattlePlan, TerritoryId, ToolCallOptions)
**Files:**
- `src/lib/game/test-battle-phase-example.ts`
- `src/lib/game/test-emperor-ally-revival.ts`
- `src/lib/game/test-full-game.ts`
- `src/lib/game/test-leader-protection.ts`
- `src/lib/game/test-tleilaxu-ghola.ts`
- `src/lib/game/test-voice-compliance.ts`

**Issues:**
1. Lines 74, 75, 78, 79: Wrong argument types (numbers instead of `boolean | undefined`)
2. Line 48: Expected 5-6 arguments, but got 3
3. Lines 452, 456: Property `spice` does not exist on `SpiceLocation`
4. Line 26: Unknown property `advancedCombat` in object literal
5. Multiple lines: `"ARRAKEEN"` not assignable to `TerritoryId` (4 errors)
6. Line 36: `number` not assignable to `TreacheryCardType`
7. Lines 66, 117, 166: Missing required properties in `ToolCallOptions` (3 errors)
8. Line 7: No exported member `createInitialGameState` (should be `createGameState`)
9. Multiple lines: Missing `announcedNoLeader` property in `BattlePlan` (5 errors)

## Group 9: Spice Collection and Shipment Movement
**Files:**
- `src/lib/game/phase-tests/spice-collection/scenarios/elite-vs-regular.ts`

**Issues:**
1. Line 25: Missing `regular` property in `ForcePlacement`

## Group 10: Tools and Rules - ToolError and ValidationErrorCode
**Files:**
- `src/lib/game/tools/actions/revival.ts`

**Issues:**
1. Lines 511, 563: `faction` property doesn't exist in `ToolError` (2 errors)

