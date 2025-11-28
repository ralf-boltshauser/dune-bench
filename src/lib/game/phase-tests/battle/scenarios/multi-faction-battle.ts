/**
 * Multi-Faction Battle Scenario
 * 
 * Fremen (with elite Fedaykin) vs Harkonnen vs Emperor in a sand territory.
 * Expected: Harkonnen wins to test leader capture logic.
 * Tests:
 * - Elite forces (Fedaykin)
 * - Battle Hardened ability (Fremen)
 * - Leader capture (Harkonnen)
 * - Multiple battles in same territory
 * - Aggressor choosing which battle to fight
 */

import { Faction, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice, getLeaderFromPool } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBattleScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testMultiFactionBattle(): Promise<ScenarioResult> {
  console.log('\n🏜️  Setting up Multi-Faction Battle: Fremen vs Harkonnen vs Emperor');

  // Build test state
  let state = buildTestState({
    factions: [Faction.FREMEN, Faction.HARKONNEN, Faction.EMPEROR],
    phase: undefined,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Fremen: Mix of regular and elite Fedaykin
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.GREAT_FLAT, // Sand territory
        sector: 5,
        regular: 6,
        elite: 3, // 3 Fedaykin
      },
      // Harkonnen: Strong force to ensure victory
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.GREAT_FLAT,
        sector: 5,
        regular: 10,
        elite: 0,
      },
      // Emperor: Weak force (will lose)
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.GREAT_FLAT,
        sector: 5,
        regular: 4,
        elite: 0,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.GREAT_FLAT,
        sector: 5,
        amount: 15,
      },
    ],
  });

  // Get leaders
  const fremenLeader = getLeaderFromPool(state, Faction.FREMEN);
  const harkonnenLeader = getLeaderFromPool(state, Faction.HARKONNEN);
  const emperorLeader = getLeaderFromPool(state, Faction.EMPEROR);

  if (!fremenLeader || !harkonnenLeader || !emperorLeader) {
    throw new Error('Could not find leaders for test');
  }

  // Build agent responses
  const responses = new AgentResponseBuilder();

  // Aggressor (first in storm order) chooses to fight Harkonnen first
  // Assuming Fremen is aggressor (first in storm order)
  responses.queueBattleChoice(
    Faction.FREMEN,
    TerritoryId.GREAT_FLAT,
    Faction.HARKONNEN
  );

  // First battle: Fremen vs Harkonnen
  // Harkonnen should win this battle
  responses.queueBattlePlan(Faction.FREMEN, {
    leaderId: fremenLeader,
    forcesDialed: 5,
    weaponCardId: null,
    defenseCardId: null,
    spiceDialed: 0, // Fremen Battle Hardened - no spice needed!
  });

  responses.queueBattlePlan(Faction.HARKONNEN, {
    leaderId: harkonnenLeader,
    forcesDialed: 8,
    weaponCardId: 'lasgun',
    defenseCardId: null,
    spiceDialed: 8, // Harkonnen needs spice
  });

  // Harkonnen wins, chooses to keep all cards
  responses.queueCardDiscardChoice(Faction.HARKONNEN, []);

  // Harkonnen captures Fremen's leader
  responses.queueCaptureChoice(
    Faction.HARKONNEN,
    'capture', // Capture instead of kill
    fremenLeader,
    Faction.FREMEN
  );

  // After first battle, aggressor (Fremen) is eliminated, so Harkonnen becomes aggressor
  // Harkonnen chooses to fight Emperor
  responses.queueBattleChoice(
    Faction.HARKONNEN,
    TerritoryId.GREAT_FLAT,
    Faction.EMPEROR
  );

  // Second battle: Harkonnen vs Emperor
  // Harkonnen should win again
  responses.queueBattlePlan(Faction.HARKONNEN, {
    leaderId: harkonnenLeader, // Same leader (if not killed)
    forcesDialed: 2, // Remaining forces
    weaponCardId: null,
    defenseCardId: null,
    spiceDialed: 2,
  });

  responses.queueBattlePlan(Faction.EMPEROR, {
    leaderId: emperorLeader,
    forcesDialed: 4,
    weaponCardId: null,
    defenseCardId: null,
    spiceDialed: 4,
  });

  // Harkonnen wins again, keeps all cards
  responses.queueCardDiscardChoice(Faction.HARKONNEN, []);

  // Harkonnen captures Emperor's leader
  responses.queueCaptureChoice(
    Faction.HARKONNEN,
    'kill', // Kill for 2 spice
    emperorLeader,
    Faction.EMPEROR
  );

  // Run scenario
  const result = await runBattleScenario(
    state,
    responses,
    'Multi-Faction Battle (Fremen vs Harkonnen vs Emperor)',
    150 // More steps for multiple battles
  );
  logScenarioResults('Multi-Faction Battle (Fremen vs Harkonnen vs Emperor)', result);

  return result;
}

// Run if executed directly
if (require.main === module) {
  testMultiFactionBattle().catch(console.error);
}

