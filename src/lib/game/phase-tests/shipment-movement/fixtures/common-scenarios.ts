/**
 * Common Test Scenarios
 * 
 * Reusable test scenarios that can be used across multiple tests.
 * Single source of truth for common test setups.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { TEST_FACTIONS, TEST_TERRITORIES, FORCE_PRESETS, SPICE_PRESETS } from '../helpers/fixtures';

/**
 * Basic sequential flow scenario
 */
export function createBasicSequentialScenario() {
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      sector: 9,
      regularCount: 5,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    })
    .queuePassBoth(Faction.HARKONNEN);

  return { state, responses };
}

/**
 * Guild ACT_NOW scenario
 */
export function createGuildActNowScenario() {
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

  const responses = new AgentResponseBuilder();
  responses
    .queueGuildActNow(Faction.SPACING_GUILD)
    .queueShipment(Faction.SPACING_GUILD, {
      territoryId: TEST_TERRITORIES.ARRAKEEN.id,
      sector: 9,
      regularCount: 5,
    })
    .queueMovement(Faction.SPACING_GUILD, {
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    })
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.BASIN.id,
      sector: 9,
      regularCount: 3,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 3,
    })
    .queuePassBoth(Faction.HARKONNEN);

  return { state, responses };
}

/**
 * Guild WAIT_LATER scenario
 */
export function createGuildWaitLaterScenario() {
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

  const responses = new AgentResponseBuilder();
  responses
    .queueGuildWait(Faction.SPACING_GUILD) // Choose LATER
    .queueGuildWait(Faction.SPACING_GUILD) // Wait before first faction
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.BASIN.id,
      sector: 9,
      regularCount: 3,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 3,
    })
    .queueGuildActNow(Faction.SPACING_GUILD) // Act before second faction
    .queueShipment(Faction.SPACING_GUILD, {
      territoryId: TEST_TERRITORIES.ARRAKEEN.id,
      sector: 9,
      regularCount: 5,
    })
    .queueMovement(Faction.SPACING_GUILD, {
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    })
    .queuePassBoth(Faction.HARKONNEN);

  return { state, responses };
}

/**
 * BG Spiritual Advisor scenario
 */
export function createBGSpiritualAdvisorScenario() {
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_BG,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.BASIN.id,
      sector: 9,
      regularCount: 5,
    })
    .queueBGSpiritualAdvisor(Faction.BENE_GESSERIT, {
      destination: 'POLAR_SINK',
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    })
    .queuePassBoth(Faction.BENE_GESSERIT);

  return { state, responses };
}

/**
 * Alliance constraint scenario
 */
export function createAllianceConstraintScenario() {
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]],
    forces: [
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.BASIN.id, // Same territory as ally
      sector: 9,
      regularCount: 5,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    })
    .queuePassBoth(Faction.HARKONNEN);

  return { state, responses };
}

/**
 * Ornithopter access scenario
 */
export function createOrnithopterAccessScenario() {
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Has forces in Arrakeen
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.SMALL,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();
  responses
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      sector: 9,
      regularCount: 3,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.HABANNYA_SIETCH.id, // 3 territories away (using ornithopters)
      toSector: 9,
      count: 3,
    })
    .queuePassBoth(Faction.HARKONNEN);

  return { state, responses };
}

