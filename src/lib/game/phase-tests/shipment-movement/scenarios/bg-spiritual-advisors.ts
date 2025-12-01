/**
 * Test Scenario: Bene Gesserit Spiritual Advisors
 * 
 * Tests BG advisor placement when other factions ship.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testBGSpiritualAdvisors() {
  console.log('\n🧪 Testing: Bene Gesserit Spiritual Advisors');

  // Setup: Atreides and BG
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
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
      // BG forces
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.POLAR_SINK,
        sector: 9,
        regular: 3,
      },
    ],
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Ship forces to territory X
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TerritoryId.IMPERIAL_BASIN,
    sector: 9,
    regularCount: 5,
  });

  // BG: Send advisor to same territory (not Polar Sink)
  responses.queueBGSpiritualAdvisor(Faction.BENE_GESSERIT, {
    territoryId: TerritoryId.IMPERIAL_BASIN,
    sector: 9,
    sendToPolarSink: false,
  });

  // Atreides: Move forces
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.IMPERIAL_BASIN,
    toSector: 9,
    count: 5,
  });

  // BG: Pass shipment (BG doesn't ship)
  responses.queuePassShipment(Faction.BENE_GESSERIT);

  // BG: Pass movement
  responses.queuePassMovement(Faction.BENE_GESSERIT);

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Bene Gesserit Spiritual Advisors',
    200
  );

  logScenarioResults('Bene Gesserit Spiritual Advisors', result);
  return result;
}

