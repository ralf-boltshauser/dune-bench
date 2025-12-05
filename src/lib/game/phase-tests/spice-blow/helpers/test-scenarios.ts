/**
 * Pre-built Test Scenarios
 * 
 * Common test patterns ready to use - write once, use everywhere
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { buildTestState } from './test-state-builder';
import { AgentResponseBuilder } from './agent-response-builder';
import { TEST_CARDS, DECK_COMBINATIONS, DISCARD_PRESETS } from './fixtures';

export class TestScenarios {
  /**
   * Create state for Turn 1 multiple worms test
   */
  static createTurn1MultipleWormsState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
      turn: 1,
      spiceDeckA: [
        TEST_CARDS.SHAI_HULUD_1,
        TEST_CARDS.SHAI_HULUD_2,
        TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
      ],
      spiceDeckB: [],
    });
  }
  
  /**
   * Create state for two-pile system test
   */
  static createTwoPileSystemState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      spiceDeckA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
      spiceDeckB: [TEST_CARDS.SHAI_HULUD_1],
      spiceDiscardA: [TEST_CARDS.TERRITORY_SOUTH_MESA],
      spiceDiscardB: [],
    });
  }
  
  /**
   * Create state for topmost Territory Card test
   */
  static createTopmostTerritoryCardState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
      spiceDiscardA: DISCARD_PRESETS.MIXED_WORMS_AND_TERRITORIES,
    });
  }
  
  /**
   * Create state for Fremen protection test
   */
  static createFremenProtectionState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.FREMEN],
      turn: 2,
      alliances: [[Faction.ATREIDES, Faction.FREMEN]],
      forces: [
        {
          faction: Faction.ATREIDES,
          territory: TerritoryId.CIELAGO_SOUTH,
          sector: 1,
          regular: 3,
        },
      ],
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
      spiceDiscardA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    });
  }
  
  /**
   * Create state for worm devouring test
   */
  static createWormDevouringState(
    territory: TerritoryId = TerritoryId.CIELAGO_SOUTH,
    sector: number = 1
  ): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      forces: [
        {
          faction: Faction.ATREIDES,
          territory,
          sector,
          regular: 3,
        },
        {
          faction: Faction.HARKONNEN,
          territory,
          sector,
          regular: 2,
        },
      ],
      territorySpice: [
        {
          territory,
          sector,
          amount: 5,
        },
      ],
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
      spiceDiscardA: [getTerritoryCardForTerritory(territory, sector)],
    });
  }
  
  /**
   * Create state for Nexus test
   */
  static createNexusState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
      turn: 2,
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
      spiceDiscardA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    });
  }
  
  /**
   * Create state for spice placement test
   */
  static createSpicePlacementState(
    territory: TerritoryId = TerritoryId.CIELAGO_SOUTH,
    sector: number = 1,
    stormSector: number = 5
  ): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      stormSector,
      spiceDeckA: [getTerritoryCardForTerritory(territory, sector)],
    });
  }
  
  /**
   * Create state for advanced rules (Double Spice Blow) test
   */
  static createAdvancedRulesState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      advancedRules: true,
      spiceDeckA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
      spiceDeckB: [TEST_CARDS.TERRITORY_SOUTH_MESA],
    });
  }
  
  /**
   * Create state for deck independence test
   */
  static createDeckIndependenceState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      ...DECK_COMBINATIONS.DECK_A_TERRITORY_DECK_B_WORM,
    });
  }
  
  /**
   * Create response builder for worm → Territory Card → Nexus
   */
  static createWormToNexusResponses(
    wormRide: boolean = false,
    allianceActions: Array<{ faction: Faction; action: 'FORM_ALLIANCE' | 'BREAK_ALLIANCE' | 'PASS'; target?: Faction }> = []
  ): AgentResponseBuilder {
    const builder = new AgentResponseBuilder();
    
    if (wormRide) {
      builder.queueWormRide(Faction.FREMEN, true);
    } else {
      builder.queueWormRide(Faction.FREMEN, false);
    }
    
    for (const alliance of allianceActions) {
      builder.queueAllianceDecision(alliance.faction, alliance.action, alliance.target);
    }
    
    return builder;
  }
  
  /**
   * Create response builder for Fremen protection
   */
  static createFremenProtectionResponses(protect: boolean): AgentResponseBuilder {
    const builder = new AgentResponseBuilder();
    builder.queueFremenProtection(Faction.FREMEN, protect);
    return builder;
  }
  
  /**
   * Create response builder for multiple worms
   */
  static createMultipleWormsResponses(
    wormCount: number,
    rideLast: boolean = false
  ): AgentResponseBuilder {
    const builder = new AgentResponseBuilder();
    
    for (let i = 0; i < wormCount - 1; i++) {
      builder.queueWormRide(Faction.FREMEN, false); // Devour
    }
    builder.queueWormRide(Faction.FREMEN, rideLast); // Last worm
    
    return builder;
  }
}

/**
 * Helper to get territory card for a territory
 */
function getTerritoryCardForTerritory(territory: TerritoryId, sector: number): string {
  // Simple mapping - can be enhanced
  const mapping: Record<TerritoryId, string> = {
    [TerritoryId.CIELAGO_SOUTH]: TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    [TerritoryId.SOUTH_MESA]: TEST_CARDS.TERRITORY_SOUTH_MESA,
    [TerritoryId.RED_CHASM]: TEST_CARDS.TERRITORY_RED_CHASM,
    [TerritoryId.CIELAGO_NORTH]: TEST_CARDS.TERRITORY_CIELAGO_NORTH,
  };
  
  return mapping[territory] || TEST_CARDS.TERRITORY_CIELAGO_SOUTH;
}

