/**
 * Integration Tests: Guild Handling
 * 
 * Tests for Guild special handling (timing, shipment types, payment).
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { EnhancedAgentResponseBuilder } from '../helpers/agent-response-builder-enhanced';
import { runPhaseScenario } from '../scenarios/base-scenario';
import * as assertions from '../assertions';
import { TEST_FACTIONS, TEST_TERRITORIES, SPICE_PRESETS } from '../helpers/fixtures';

/**
 * Test Guild ACT_NOW
 */
export async function testGuildActNow() {
  console.log('\n=== Testing Guild ACT_NOW ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_GUILD,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .actNow()
      .shipTo(TEST_TERRITORIES.ARRAKEEN.id, 9, 5)
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      )
      .end()
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 3)
      .moveFromTo(
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        3
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild ACT_NOW',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildActed(result.events, 'ACT_NOW');
  
  // Verify Guild acted before Atreides
  const shipmentEvents = result.events.filter((e) => e.type === 'FORCES_SHIPPED');
  if ((shipmentEvents[0].data as any).faction !== Faction.SPACING_GUILD) {
    throw new Error('Expected first shipment event to be for Guild');
  }
  if ((shipmentEvents[1].data as any).faction !== Faction.ATREIDES) {
    throw new Error('Expected second shipment event to be for Atreides');
  }
  
  console.log('✅ Guild ACT_NOW test passed\n');
}

/**
 * Test Guild WAIT_LATER
 */
export async function testGuildWaitLater() {
  console.log('\n=== Testing Guild WAIT_LATER ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_GUILD,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .waitLater() // Choose LATER
      .waitLater() // Wait before first faction
      .end()
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 3)
      .moveFromTo(
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        3
      )
      .end()
    .forGuild()
      .actNow() // Act before second faction
      .shipTo(TEST_TERRITORIES.ARRAKEEN.id, 9, 5)
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild WAIT_LATER',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildActed(result.events, 'LATER');
  
  console.log('✅ Guild WAIT_LATER test passed\n');
}

/**
 * Test Guild DELAY_TO_END
 */
export async function testGuildDelayToEnd() {
  console.log('\n=== Testing Guild DELAY_TO_END ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_GUILD,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .delayToEnd()
      .end()
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 3)
      .moveFromTo(
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        3
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth()
      .end()
    .forGuild()
      .shipTo(TEST_TERRITORIES.ARRAKEEN.id, 9, 5)
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      );

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild DELAY_TO_END',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildActed(result.events, 'DELAY_TO_END');
  
  // Verify Guild acted last
  const shipmentEvents = result.events.filter((e) => e.type === 'FORCES_SHIPPED');
  const lastShipment = shipmentEvents[shipmentEvents.length - 1];
  if ((lastShipment.data as any).faction !== Faction.SPACING_GUILD) {
    throw new Error('Expected last shipment event to be for Guild');
  }
  
  console.log('✅ Guild DELAY_TO_END test passed\n');
}

/**
 * Test Guild normal shipment (half price)
 */
export async function testGuildNormalShipment() {
  console.log('\n=== Testing Guild Normal Shipment (Half Price) ===');
  
  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM + 5], // Add extra spice for cost
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .actNow()
      .shipTo(TEST_TERRITORIES.ARRAKEEN.id, 9, 3, 0, 2) // Stronghold: Math.ceil((1 * 3) / 2) = 2 (eliteCount=0, cost=2)
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        3
      )
      .end()
    .forFaction(Faction.ATREIDES)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Normal Shipment',
    200
  );

  assertions.assertPhaseCompleted(result);
  // Expected cost: Math.ceil((1 * 3) / 2) = Math.ceil(1.5) = 2
  // Check actual starting spice from initial state
  const initialGuildState = state.factions.get(Faction.SPACING_GUILD);
  const initialSpice = initialGuildState?.spice ?? 0;
  const guildState = result.state.factions.get(Faction.SPACING_GUILD);
  const actualSpice = guildState?.spice ?? 0;
  const cost = 2;
  const expectedSpice = initialSpice - cost; // Starting - cost
  if (actualSpice !== expectedSpice) {
    // Debug: check if cost was applied at all
    const costApplied = actualSpice < initialSpice;
    throw new Error(
      `Expected Guild to have ${expectedSpice} spice (starting ${initialSpice} - cost ${cost}), got ${actualSpice}. Cost applied: ${costApplied}, initialSpice=${initialSpice}`
    );
  }
  // Verify the shipment event has correct cost
  assertions.assertGuildHalfPrice(result.events, 'STRONGHOLD', 3);
  
  console.log('✅ Guild normal shipment test passed\n');
}

/**
 * Test Guild cross-ship
 */
export async function testGuildCrossShip() {
  console.log('\n=== Testing Guild Cross-Ship ===');
  
  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 5,
      },
    ],
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .actNow()
      .crossShip(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.CARTHAG.id,
        9,
        3,
        undefined,
        2 // Cost for cross-ship
      )
      .moveFromTo(
        TEST_TERRITORIES.CARTHAG.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        3
      )
      .end()
    .forFaction(Faction.ATREIDES)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Cross-Ship',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildCrossShip(
    result.events,
    TEST_TERRITORIES.ARRAKEEN.id,
    TEST_TERRITORIES.CARTHAG.id,
    3,
    2 // Expected cost
  );
  
  console.log('✅ Guild cross-ship test passed\n');
}

/**
 * Test Guild off-planet shipment
 */
export async function testGuildOffPlanet() {
  console.log('\n=== Testing Guild Off-Planet Shipment ===');
  
  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 5,
      },
    ],
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .actNow()
      .shipOffPlanet(TEST_TERRITORIES.ARRAKEEN.id, 9, 4, undefined, 2) // 1 spice per 2 forces = 2 spice
      .passMovement()
      .end()
    .forFaction(Faction.ATREIDES)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Off-Planet',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildOffPlanet(
    result.events,
    TEST_TERRITORIES.ARRAKEEN.id,
    4,
    2 // Cost: 1 spice per 2 forces
  );
  // After shipping 4 off-planet, they go to reserves
  // buildTestState moves initial forces to reserves, so we check that at least 4 are in reserves
  const guildState = result.state.factions.get(Faction.SPACING_GUILD);
  const reservesCount = (guildState?.forces.reserves.regular || 0) + (guildState?.forces.reserves.elite || 0);
  if (reservesCount < 4) {
    throw new Error(`Expected at least 4 forces in reserves for spacing_guild after off-planet shipment, got ${reservesCount}`);
  }
  
  console.log('✅ Guild off-planet shipment test passed\n');
}

/**
 * Test Guild payment
 */
export async function testGuildPayment() {
  console.log('\n=== Testing Guild Payment ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_GUILD,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forGuild()
      .delayToEnd()
      .end()
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.ARRAKEEN.id, 9, 3, undefined, 3) // Cost: 3 spice (stronghold)
      .passMovement()
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth()
      .end()
    .forGuild()
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild Payment',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertGuildPaymentReceived(result.state, result.events, 3);
  
  // Get actual initial spice from state (buildTestState may not apply override correctly)
  const initialAtreidesState = state.factions.get(Faction.ATREIDES);
  const initialAtreidesSpice = initialAtreidesState?.spice ?? 0;
  const initialGuildState = state.factions.get(Faction.SPACING_GUILD);
  const initialGuildSpice = initialGuildState?.spice ?? 0;
  
  assertions.assertSpiceAmount(result.state, Faction.ATREIDES, initialAtreidesSpice - 3);
  assertions.assertSpiceAmount(result.state, Faction.SPACING_GUILD, initialGuildSpice + 3);
  
  console.log('✅ Guild payment test passed\n');
}

/**
 * Run all Guild handling tests
 */
export async function runGuildHandlingTests() {
  console.log('='.repeat(80));
  console.log('GUILD HANDLING INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testGuildActNow();
    await testGuildWaitLater();
    await testGuildDelayToEnd();
    await testGuildNormalShipment();
    await testGuildCrossShip();
    await testGuildOffPlanet();
    await testGuildPayment();
    console.log('✅ All Guild handling tests passed!');
  } catch (error) {
    console.error('❌ Guild handling tests failed:', error);
    throw error;
  }
}
