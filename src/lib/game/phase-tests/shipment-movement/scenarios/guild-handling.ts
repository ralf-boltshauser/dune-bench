/**
 * Guild Special Handling Tests
 * 
 * Tests 2.1-2.12: Guild timing, special shipments, ally abilities
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';
import {
  TEST_FACTIONS,
  TEST_TERRITORIES,
  FORCE_PRESETS,
  SPICE_PRESETS,
} from '../helpers/fixtures';
import * as assertions from '../helpers/assertions';

/**
 * Test 2.1: Guild Timing - NOW
 * Guild acts immediately (before first faction)
 */
export async function testGuildTimingNow() {
  console.log('\n🧪 Testing: Guild Timing - NOW');

  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_GUILD,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.TUEKS_SIETCH.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW, then ship and move
  responses
    .forGuild()
    .timing('NOW')
    .normalShipment({
      territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      sector: 9,
      regularCount: 5,
    })
    .movement({
      fromTerritoryId: TEST_TERRITORIES.TUEKS_SIETCH.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // Atreides: Ship and move
  responses
    .forFaction(Faction.ATREIDES)
    .shipment({
      territoryId: TEST_TERRITORIES.BASIN.id,
      sector: 9,
      regularCount: 5,
    })
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.BASIN.id,
      toSector: 9,
      count: 5,
    });

  // Atreides: Pass both (needed for game to have 2+ factions)
  responses.queuePassBoth(Faction.ATREIDES);
  
  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Timing - NOW',
    200
  );

  // Assertions
  assertions.assertPhaseComplete({ phaseComplete: result.completed } as any);
  // Guild events should come before Atreides events
  const guildShipmentIndex = result.events.findIndex(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any).faction === Faction.SPACING_GUILD
  );
  const atreidesShipmentIndex = result.events.findIndex(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any).faction === Faction.ATREIDES
  );
  if (guildShipmentIndex >= atreidesShipmentIndex) {
    throw new Error('Guild should act before Atreides');
  }

  logScenarioResults('Guild Timing - NOW', result);
  return result;
}

/**
 * Test 2.5: Guild Half-Price Shipping
 * Guild pays half price (rounded up) for shipments
 */
export async function testGuildHalfPriceShipping() {
  console.log('\n🧪 Testing: Guild Half-Price Shipping');

  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES], // Need at least 2 factions
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Guild: Ship 5 forces to stronghold (normally 5 spice, half = 3 rounded up)
  responses
    .forGuild()
    .timing('NOW')
    .normalShipment({
      territoryId: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
      sector: 9,
      regularCount: 5,
    });
  
  // Guild passes on movement
  responses.queuePassMovement(Faction.SPACING_GUILD);

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Half-Price Shipping',
    200
  );

  // Assertions
  assertions.assertPhaseComplete({ phaseComplete: result.completed } as any);
  // Guild should have paid 3 spice (5 * 1 / 2 = 2.5, rounded up = 3)
  // Starting with 15 spice (SPICE_PRESETS.MEDIUM), should have 12 left
  assertions.assertSpiceAmount(result.state, Faction.SPACING_GUILD, 12);

  logScenarioResults('Guild Half-Price Shipping', result);
  return result;
}

/**
 * Test 2.7: Guild Cross-Ship
 * Guild cross-ships forces between territories
 */
export async function testGuildCrossShip() {
  console.log('\n🧪 Testing: Guild Cross-Ship');

  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES], // Need at least 2 factions
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.TUEKS_SIETCH.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Guild: Cross-ship from Tuek's Sietch to Imperial Basin
  responses
    .forGuild()
    .timing('NOW')
    .crossShip({
      fromTerritoryId: TEST_TERRITORIES.TUEKS_SIETCH.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });
  
  // Guild passes on movement
  responses.queuePassMovement(Faction.SPACING_GUILD);

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Cross-Ship',
    200
  );

  // Assertions
  assertions.assertPhaseComplete({ phaseComplete: result.completed } as any);
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertForcesInTerritory(
    result.state,
    Faction.SPACING_GUILD,
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    9,
    5
  );
  // Forces should be removed from source
  const sourceStack = getFactionState(result.state, Faction.SPACING_GUILD).forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.TUEKS_SIETCH.id && s.sector === 9
  );
  if (sourceStack && (sourceStack.forces.regular || 0) + (sourceStack.forces.elite || 0) > 0) {
    throw new Error('Forces should be removed from source territory');
  }

  logScenarioResults('Guild Cross-Ship', result);
  return result;
}

/**
 * Run all Guild handling tests
 */
export async function runAllGuildHandlingTests() {
  console.log('='.repeat(80));
  console.log('GUILD HANDLING TESTS');
  console.log('='.repeat(80));

  try {
    await testGuildTimingNow();
  } catch (error) {
    console.error('Guild Timing - NOW test failed:', error);
  }

  try {
    await testGuildHalfPriceShipping();
  } catch (error) {
    console.error('Guild Half-Price Shipping test failed:', error);
  }

  try {
    await testGuildCrossShip();
  } catch (error) {
    console.error('Guild Cross-Ship test failed:', error);
  }

  console.log('\n✅ All Guild handling tests completed.');
}

// Helper function
import { getFactionState } from '../../../state';

