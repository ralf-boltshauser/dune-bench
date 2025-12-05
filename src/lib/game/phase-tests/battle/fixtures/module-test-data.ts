/**
 * Module-Specific Test Data
 *
 * Test data for refactored battle modules.
 * Single source of truth for all module test scenarios.
 */

import { Faction, TerritoryId, BattleSubPhase } from '../../../types';
import { DEFAULT_SECTOR } from './test-data';

// ============================================================================
// Battle Utilities Test Data
// ============================================================================

export interface ForceCountTestCase {
  name: string;
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  setup: {
    regular?: number;
    elite?: number;
    advisors?: number; // For BG only
    fighters?: number; // For BG only
  };
  expected: number;
}

export interface BattleCapableTestCase {
  name: string;
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  setup: {
    regular?: number;
    elite?: number;
    advisors?: number; // For BG only
    fighters?: number; // For BG only
  };
  expected: boolean;
}

export interface BattleContextTestCase {
  name: string;
  territory: TerritoryId;
  sector: number;
  aggressor: Faction;
  defender: Faction;
  expected: {
    territoryId: TerritoryId;
    sector: number;
    aggressor: Faction;
    defender: Faction;
    aggressorPlan: null;
    defenderPlan: null;
  };
}

export const BattleUtilsTestData = {
  forceCountScenarios: [
    {
      name: 'Regular faction with forces',
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { regular: 10, elite: 2 },
      expected: 12,
    },
    {
      name: 'Regular faction with no forces',
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { regular: 0, elite: 0 },
      expected: 0,
    },
    {
      name: 'BG with fighters (should count fighters only)',
      faction: Faction.BENE_GESSERIT,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { advisors: 5, fighters: 3 },
      expected: 3,
    },
    {
      name: 'BG with only advisors (should return 0)',
      faction: Faction.BENE_GESSERIT,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { advisors: 5, fighters: 0 },
      expected: 0,
    },
    {
      name: 'Elite forces counted correctly',
      faction: Faction.EMPEROR,
      territory: TerritoryId.CARTHAG,
      sector: DEFAULT_SECTOR,
      setup: { regular: 5, elite: 10 },
      expected: 15,
    },
  ] as ForceCountTestCase[],

  battleCapableScenarios: [
    {
      name: 'Faction with forces is battle-capable',
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { regular: 10 },
      expected: true,
    },
    {
      name: 'Faction with no forces is not battle-capable',
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { regular: 0 },
      expected: false,
    },
    {
      name: 'BG with fighters is battle-capable',
      faction: Faction.BENE_GESSERIT,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { advisors: 5, fighters: 3 },
      expected: true,
    },
    {
      name: 'BG with only advisors is not battle-capable',
      faction: Faction.BENE_GESSERIT,
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      setup: { advisors: 5, fighters: 0 },
      expected: false,
    },
  ] as BattleCapableTestCase[],

  contextCreationScenarios: [
    {
      name: 'Basic battle context',
      territory: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      expected: {
        territoryId: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        aggressorPlan: null,
        defenderPlan: null,
      },
    },
    {
      name: 'Battle in different territory',
      territory: TerritoryId.CARTHAG,
      sector: DEFAULT_SECTOR,
      aggressor: Faction.HARKONNEN,
      defender: Faction.FREMEN,
      expected: {
        territoryId: TerritoryId.CARTHAG,
        sector: DEFAULT_SECTOR,
        aggressor: Faction.HARKONNEN,
        defender: Faction.FREMEN,
        aggressorPlan: null,
        defenderPlan: null,
      },
    },
  ] as BattleContextTestCase[],
};

// ============================================================================
// Faction Helpers Test Data
// ============================================================================

export interface OpponentTestCase {
  name: string;
  battle: {
    aggressor: Faction;
    defender: Faction;
    territory: TerritoryId;
    sector: number;
  };
  faction: Faction;
  expectedOpponent: Faction;
}

export interface AllyInBattleTestCase {
  name: string;
  battle: {
    aggressor: Faction;
    defender: Faction;
    territory: TerritoryId;
    sector: number;
  };
  faction: Faction;
  ally: Faction | null;
  expectedAllyInBattle: boolean;
}

export interface ParticipantTestCase {
  name: string;
  battle: {
    aggressor: Faction;
    defender: Faction;
    territory: TerritoryId;
    sector: number;
  };
  faction: Faction;
  expectedIsParticipant: boolean;
}

export const FactionHelpersTestData = {
  opponentScenarios: [
    {
      name: 'Aggressor gets defender as opponent',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.ATREIDES,
      expectedOpponent: Faction.HARKONNEN,
    },
    {
      name: 'Defender gets aggressor as opponent',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.HARKONNEN,
      expectedOpponent: Faction.ATREIDES,
    },
  ] as OpponentTestCase[],

  allyInBattleScenarios: [
    {
      name: 'Ally is aggressor',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.BENE_GESSERIT,
      ally: Faction.ATREIDES,
      expectedAllyInBattle: true,
    },
    {
      name: 'Ally is defender',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.BENE_GESSERIT,
      ally: Faction.HARKONNEN,
      expectedAllyInBattle: true,
    },
    {
      name: 'No ally',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.ATREIDES,
      ally: null,
      expectedAllyInBattle: false,
    },
    {
      name: 'Ally not in battle',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.BENE_GESSERIT,
      ally: Faction.FREMEN,
      expectedAllyInBattle: false,
    },
  ] as AllyInBattleTestCase[],

  participantScenarios: [
    {
      name: 'Faction is aggressor',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.ATREIDES,
      expectedIsParticipant: true,
    },
    {
      name: 'Faction is defender',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.HARKONNEN,
      expectedIsParticipant: true,
    },
    {
      name: 'Faction not in battle',
      battle: {
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
        territory: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
      },
      faction: Faction.FREMEN,
      expectedIsParticipant: false,
    },
  ] as ParticipantTestCase[],
};

// ============================================================================
// Router Test Data
// ============================================================================

export const RouterTestData = {
  allSubPhases: [
    BattleSubPhase.AGGRESSOR_CHOOSING,
    BattleSubPhase.PRESCIENCE_OPPORTUNITY,
    BattleSubPhase.PRESCIENCE_REVEAL,
    BattleSubPhase.CREATING_BATTLE_PLANS,
    BattleSubPhase.VOICE_OPPORTUNITY,
    BattleSubPhase.REVEALING_PLANS,
    BattleSubPhase.TRAITOR_CALL,
    BattleSubPhase.BATTLE_RESOLUTION,
    BattleSubPhase.WINNER_CARD_DISCARD_CHOICE,
    BattleSubPhase.HARKONNEN_CAPTURE,
  ] as BattleSubPhase[],
};

// ============================================================================
// Context Manager Test Data
// ============================================================================

export interface ContextTransitionTestCase {
  name: string;
  from: BattleSubPhase;
  to: BattleSubPhase;
  valid: boolean;
}

export const ContextManagerTestData = {
  validTransitions: [
    {
      name: 'AGGRESSOR_CHOOSING → VOICE_OPPORTUNITY',
      from: BattleSubPhase.AGGRESSOR_CHOOSING,
      to: BattleSubPhase.VOICE_OPPORTUNITY,
      valid: true,
    },
    {
      name: 'VOICE_OPPORTUNITY → PRESCIENCE_OPPORTUNITY',
      from: BattleSubPhase.VOICE_OPPORTUNITY,
      to: BattleSubPhase.PRESCIENCE_OPPORTUNITY,
      valid: true,
    },
    {
      name: 'PRESCIENCE_OPPORTUNITY → CREATING_BATTLE_PLANS',
      from: BattleSubPhase.PRESCIENCE_OPPORTUNITY,
      to: BattleSubPhase.CREATING_BATTLE_PLANS,
      valid: true,
    },
    {
      name: 'CREATING_BATTLE_PLANS → REVEALING_PLANS',
      from: BattleSubPhase.CREATING_BATTLE_PLANS,
      to: BattleSubPhase.REVEALING_PLANS,
      valid: true,
    },
    {
      name: 'REVEALING_PLANS → TRAITOR_CALL',
      from: BattleSubPhase.REVEALING_PLANS,
      to: BattleSubPhase.TRAITOR_CALL,
      valid: true,
    },
    {
      name: 'TRAITOR_CALL → BATTLE_RESOLUTION',
      from: BattleSubPhase.TRAITOR_CALL,
      to: BattleSubPhase.BATTLE_RESOLUTION,
      valid: true,
    },
    {
      name: 'BATTLE_RESOLUTION → WINNER_CARD_DISCARD_CHOICE',
      from: BattleSubPhase.BATTLE_RESOLUTION,
      to: BattleSubPhase.WINNER_CARD_DISCARD_CHOICE,
      valid: true,
    },
    {
      name: 'BATTLE_RESOLUTION → HARKONNEN_CAPTURE',
      from: BattleSubPhase.BATTLE_RESOLUTION,
      to: BattleSubPhase.HARKONNEN_CAPTURE,
      valid: true,
    },
  ] as ContextTransitionTestCase[],
};

