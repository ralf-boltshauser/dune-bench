/**
 * Common Test Helpers for Shipment & Movement Phase
 * 
 * Reusable utilities for common test patterns.
 */

import { Faction, Phase, TerritoryId, type GameState } from '../../../types';
import { buildTestState, type TestStateConfig } from './test-state-builder';
import { AgentResponseBuilder } from './agent-response-builder';
import { TEST_FACTIONS, TEST_TERRITORIES, FORCE_PRESETS, SPICE_PRESETS, RESERVE_PRESETS } from './fixtures';

/**
 * Create a basic test state with common factions
 */
export function createBasicTestState(factions: Faction[] = TEST_FACTIONS.BASIC): GameState {
  return buildTestState({
    factions,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map(factions.map((f) => [f, SPICE_PRESETS.MEDIUM])),
  });
}

/**
 * Create a test state with Guild
 */
export function createGuildTestState(factions: Faction[] = TEST_FACTIONS.WITH_GUILD): GameState {
  return buildTestState({
    factions,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map(factions.map((f) => [f, SPICE_PRESETS.MEDIUM])),
  });
}

/**
 * Create a test state with BG
 */
export function createBGTestState(factions: Faction[] = TEST_FACTIONS.WITH_BG): GameState {
  return buildTestState({
    factions,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map(factions.map((f) => [f, SPICE_PRESETS.MEDIUM])),
  });
}

/**
 * Create a test state with Fremen
 */
export function createFremenTestState(factions: Faction[] = TEST_FACTIONS.WITH_FREMEN): GameState {
  return buildTestState({
    factions,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map(factions.map((f) => [f, SPICE_PRESETS.MEDIUM])),
  });
}

/**
 * Create normal phase flow responses
 */
export function createNormalPhaseResponses(
  factions: Faction[],
  actions: Array<{
    faction: Faction;
    shipment?: {
      territoryId: TerritoryId;
      sector: number;
      regularCount: number;
      eliteCount?: number;
    };
    movement?: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      toTerritoryId: TerritoryId;
      toSector: number;
      count: number;
      useElite?: boolean;
    };
  }>
): AgentResponseBuilder {
  const builder = new AgentResponseBuilder();

  for (const action of actions) {
    if (action.shipment) {
      builder.queueShipment(action.faction, action.shipment);
    } else {
      builder.queuePassShipment(action.faction);
    }

    if (action.movement) {
      builder.queueMovement(action.faction, action.movement);
    } else {
      builder.queuePassMovement(action.faction);
    }
  }

  return builder;
}

/**
 * Assert phase completed
 */
export function assertPhaseCompleted(result: { completed: boolean }): void {
  if (!result.completed) {
    throw new Error('Expected phase to be completed, but it was not');
  }
}

/**
 * Assert phase not completed
 */
export function assertPhaseNotCompleted(result: { completed: boolean }): void {
  if (result.completed) {
    throw new Error('Expected phase to NOT be completed, but it was');
  }
}

/**
 * Assert events emitted
 */
export function assertEventsEmitted(
  result: { events: Array<{ type: string }> },
  eventTypes: string[]
): void {
  const actualTypes = result.events.map((e) => e.type);
  for (const expectedType of eventTypes) {
    if (!actualTypes.includes(expectedType)) {
      throw new Error(
        `Expected event ${expectedType} to be emitted, but it was not. Actual events: ${actualTypes.join(', ')}`
      );
    }
  }
}

