/**
 * Test Scenario: Ornithopter Access at Phase Start
 * 
 * Tests that ornithopter access is determined at phase start, not dynamically.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testOrnithopterAccess() {
  console.log('\n🧪 Testing: Ornithopter Access at Phase Start');

  // Setup: Atreides has forces in Arrakeen at phase start, Harkonnen does not
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Atreides has forces in Arrakeen (ornithopter access at phase start)
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
      // Harkonnen forces (not in Arrakeen/Carthag)
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 9,
        regular: 5,
      },
    ],
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Ship forces (doesn't matter where)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TerritoryId.BASIN,
    sector: 9,
    regularCount: 3,
  });

  // Atreides: Move with ornithopters (3 territories)
  // Path: Arrakeen → Imperial Basin → Shield Wall → Gara Kulon (3 territories)
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.GARA_KULON, // 3 territories away via: Arrakeen → Imperial Basin → Shield Wall → Gara Kulon
    toSector: 7,
    count: 5,
  });

  // Harkonnen: Ship into Arrakeen (should NOT grant ornithopters)
  responses.queueShipment(Faction.HARKONNEN, {
    territoryId: TerritoryId.ARRAKEEN,
    sector: 9,
    regularCount: 5,
  });

  // Harkonnen: Move without ornithopters (1 territory only)
  responses.queueMovement(Faction.HARKONNEN, {
    fromTerritoryId: TerritoryId.IMPERIAL_BASIN,
    fromSector: 9,
    toTerritoryId: TerritoryId.ARRAKEEN, // Adjacent only
    toSector: 9,
    count: 5,
  });

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Ornithopter Access at Phase Start',
    200
  );

  logScenarioResults('Ornithopter Access at Phase Start', result);
  return result;
}

