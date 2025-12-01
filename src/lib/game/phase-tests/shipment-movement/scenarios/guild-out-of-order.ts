/**
 * Test Scenario: Spacing Guild Act Out of Order
 * 
 * Tests Guild's ability to act before/after any faction.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testGuildOutOfOrder() {
  console.log('\n🧪 Testing: Spacing Guild Act Out of Order');

  // Setup: Guild, Atreides, Harkonnen
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.SPACING_GUILD],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Atreides forces
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
      // Harkonnen forces
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.CARTHAG,
        sector: 9,
        regular: 5,
      },
      // Guild forces
      {
        faction: Faction.SPACING_GUILD,
        territory: TerritoryId.TUEKS_SIETCH,
        sector: 9,
        regular: 5,
      },
    ],
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW (before storm order)
  responses.queueGuildActNow(Faction.SPACING_GUILD);

  // Guild: Ship forces (half-price)
  responses.queueShipment(Faction.SPACING_GUILD, {
    territoryId: TerritoryId.IMPERIAL_BASIN,
    sector: 9,
    regularCount: 5,
  });

  // Guild: Move forces
  responses.queueMovement(Faction.SPACING_GUILD, {
    fromTerritoryId: TerritoryId.TUEKS_SIETCH,
    fromSector: 9,
    toTerritoryId: TerritoryId.IMPERIAL_BASIN,
    toSector: 9,
    count: 5,
  });

  // Atreides: Ship forces (Guild receives payment)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TerritoryId.BASIN,
    sector: 9,
    regularCount: 5,
  });

  // Atreides: Move forces
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.BASIN,
    toSector: 9,
    count: 5,
  });

  // Harkonnen: Pass shipment
  responses.queuePassShipment(Faction.HARKONNEN);

  // Harkonnen: Pass movement
  responses.queuePassMovement(Faction.HARKONNEN);

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Spacing Guild Act Out of Order',
    200
  );

  logScenarioResults('Spacing Guild Act Out of Order', result);
  return result;
}

