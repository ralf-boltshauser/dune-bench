/**
 * Special Victory Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { createEndgameState } from '../helpers/test-helpers';
import { runMentatPauseScenario } from './base-scenario';

export async function testFremenSpecialVictory() {
  console.log('  Testing: Fremen Special Victory (Endgame)');
  
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.SPACING_GUILD, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 10, // Last turn
    forces: [
      // Fremen in required sietches (but NOT controlling 3+ strongholds for standard victory)
      // Sietch Tabr: Only Fremen (or no Forces) - OK
      { faction: Faction.FREMEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Habbanya Sietch: Only Fremen (or no Forces) - OK
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
      // Tuek's Sietch: Cannot have Harkonnen/Atreides/Emperor - OK (Fremen can be there)
      // But we need to ensure Fremen doesn't control 3+ strongholds total
      // So let's put other factions in other strongholds to prevent standard victory
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      // Guild has forces on Dune (required for Fremen special)
      { faction: Faction.SPACING_GUILD, territory: TerritoryId.THE_GREAT_FLAT, sector: 0, regular: 2 },
    ],
  });

  return await runMentatPauseScenario(
    createEndgameState(state, 10),
    'Fremen Special Victory (Endgame)'
  );
}

export async function testGuildSpecialVictory() {
  console.log('  Testing: Guild Special Victory (Endgame)');
  
  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 10, // Last turn
    forces: [
      // No faction has 3+ strongholds
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Guild has forces on Dune
      { faction: Faction.SPACING_GUILD, territory: TerritoryId.THE_GREAT_FLAT, sector: 0, regular: 3 },
    ],
  });

  return await runMentatPauseScenario(
    createEndgameState(state, 10),
    'Guild Special Victory (Endgame)'
  );
}

export async function testBeneGesseritPrediction() {
  console.log('  Testing: Bene Gesserit Prediction Victory');
  
  const state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    specialStates: {
      bg: {
        prediction: {
          faction: Faction.ATREIDES,
          turn: 2,
        },
      },
    },
    forces: [
      // Atreides controls 3 strongholds (would normally win)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Bene Gesserit Prediction Victory'
  );
}

