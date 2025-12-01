/**
 * Test Scenario: Complex Multi-Faction Scenario
 * 
 * Tests complex scenario with multiple factions and abilities.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testComplexMultiFaction() {
  console.log('\n🧪 Testing: Complex Multi-Faction Scenario');

  // Setup: Multiple factions with various abilities
  const state = buildTestState({
    factions: [
      Faction.ATREIDES,
      Faction.FREMEN,
      Faction.SPACING_GUILD,
      Faction.BENE_GESSERIT,
    ],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Atreides in Arrakeen (ornithopter access)
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
      // Fremen in Sietch Tabr
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.SIETCH_TABR,
        sector: 9,
        regular: 5,
      },
      // Guild in Tuek's Sietch
      {
        faction: Faction.SPACING_GUILD,
        territory: TerritoryId.TUEKS_SIETCH,
        sector: 9,
        regular: 5,
      },
      // BG in Polar Sink
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.POLAR_SINK,
        sector: 9,
        regular: 3,
      },
    ],
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW (out of order)
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
    regularCount: 3,
  });

  // BG: Send advisor to same territory as Atreides shipment
  responses.queueBGSpiritualAdvisor(Faction.BENE_GESSERIT, {
    territoryId: TerritoryId.BASIN,
    sector: 9,
    sendToPolarSink: false,
  });

  // Atreides: Move with ornithopters (3 territories)
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.HOLE_IN_THE_ROCK, // 3 territories
    toSector: 9,
    count: 5,
  });

  // Fremen: Free shipment to Great Flat
  responses.queueFremenShipment(Faction.FREMEN, {
    territoryId: TerritoryId.THE_GREAT_FLAT,
    sector: 9,
    regularCount: 10,
  });

  // Fremen: 2-territory movement
  responses.queueMovement(Faction.FREMEN, {
    fromTerritoryId: TerritoryId.SIETCH_TABR,
    fromSector: 9,
    toTerritoryId: TerritoryId.FUNERAL_PLAIN, // 2 territories
    toSector: 9,
    count: 5,
  });

  // BG: Pass shipment
  responses.queuePassShipment(Faction.BENE_GESSERIT);

  // BG: Pass movement
  responses.queuePassMovement(Faction.BENE_GESSERIT);

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Complex Multi-Faction Scenario',
    200
  );

  logScenarioResults('Complex Multi-Faction Scenario', result);
  return result;
}

