/**
 * Test Scenario: Fremen Free Shipment and 2-Territory Movement
 * 
 * Tests Fremen special shipment and movement abilities.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testFremenAbilities() {
  console.log('\n🧪 Testing: Fremen Free Shipment and 2-Territory Movement');

  // Setup: Fremen with reserves (on-planet, not off-planet)
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Fremen has some forces on board
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.SIETCH_TABR,
        sector: 9,
        regular: 5,
      },
      // Atreides forces
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
    ],
  });

  // Ensure Fremen has reserves (they start with 10 in reserves)
  const responses = new AgentResponseBuilder();

  // Fremen: Free shipment to Great Flat (or within 2 territories)
  responses.queueFremenShipment(Faction.FREMEN, {
    territoryId: TerritoryId.THE_GREAT_FLAT,
    sector: 9,
    count: 10, // Ship all reserves
  });

  // Fremen: 2-territory movement (not 1)
  responses.queueMovement(Faction.FREMEN, {
    fromTerritoryId: TerritoryId.SIETCH_TABR,
    fromSector: 9,
    toTerritoryId: TerritoryId.FUNERAL_PLAIN, // 2 territories away
    toSector: 9,
    count: 5,
  });

  // Atreides: Pass shipment
  responses.queuePassShipment(Faction.ATREIDES);

  // Atreides: Pass movement
  responses.queuePassMovement(Faction.ATREIDES);

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Fremen Free Shipment and 2-Territory Movement',
    200
  );

  logScenarioResults('Fremen Free Shipment and 2-Territory Movement', result);
  return result;
}

