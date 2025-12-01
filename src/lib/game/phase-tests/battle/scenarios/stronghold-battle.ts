/**
 * Stronghold Battle Scenario
 * 
 * Atreides vs Bene Gesserit in a stronghold territory.
 * Tests:
 * - Prescience ability (Atreides)
 * - Voice ability (Bene Gesserit)
 * - Stronghold battle mechanics
 * - Winner card discard choice
 */

import { Faction, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice, getLeaderFromPool, addCardToHand } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBattleScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testStrongholdBattle(): Promise<ScenarioResult> {
  console.log('\n🏰 Setting up Stronghold Battle: Atreides vs Bene Gesserit');

  // Build test state
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    phase: undefined, // Will be set to BATTLE
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN, // Stronghold
        sector: 9,
        regular: 10,
        elite: 0,
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 8,
        elite: 0,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        amount: 20,
      },
    ],
    specialStates: {
      atreides: {
        kwisatzHaderachActive: true, // Atreides has KH active
      },
    },
  });

  // Get leaders
  const atreidesLeader = getLeaderFromPool(state, Faction.ATREIDES);
  const bgLeader = getLeaderFromPool(state, Faction.BENE_GESSERIT);

  if (!atreidesLeader || !bgLeader) {
    throw new Error('Could not find leaders for test');
  }

  // Add specific cards to hands for the test
  // Atreides: shield (defense)
  state = addCardToHand(state, Faction.ATREIDES, 'shield_1');
  
  // Bene Gesserit: snooper (defense) - needed for their battle plan
  state = addCardToHand(state, Faction.BENE_GESSERIT, 'snooper_1');

  // Build agent responses
  const responses = new AgentResponseBuilder();

  // Aggressor (Atreides) chooses battle
  responses.queueBattleChoice(
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    Faction.BENE_GESSERIT,
    9 // Sector
  );

  // Correct sequence: Voice -> Prescience -> Battle Plans
  // Step 1: BG uses Voice to command Atreides not to play poison weapon
  responses.queueVoice(Faction.BENE_GESSERIT, {
    type: 'not_play',
    cardType: 'poison_weapon',
  });

  // Step 2: Atreides uses Prescience to see BG's weapon
  responses.queuePrescience(Faction.ATREIDES, 'weapon');

  // BG reveals they're not playing a weapon
  responses.queuePrescienceReveal(Faction.BENE_GESSERIT, {
    weaponCardId: null,
  });

  // Step 3: Battle plans
  responses.queueBattlePlan(Faction.ATREIDES, {
    leaderId: atreidesLeader,
    forcesDialed: 5,
    weaponCardId: null,
    defenseCardId: 'shield_1',
    useKwisatzHaderach: true, // Using KH
    spiceDialed: 5,
  });

  responses.queueBattlePlan(Faction.BENE_GESSERIT, {
    leaderId: bgLeader,
    forcesDialed: 4,
    weaponCardId: null, // Not playing weapon (as revealed to Prescience)
    defenseCardId: 'snooper_1',
    spiceDialed: 4,
  });

  // Winner card discard choice (assuming Atreides wins)
  responses.queueCardDiscardChoice(Faction.ATREIDES, []); // Keep all cards


  // Run scenario
  const result = await runBattleScenario(
    state,
    responses,
    'Stronghold Battle (Atreides vs Bene Gesserit)'
  );
  logScenarioResults('Stronghold Battle (Atreides vs Bene Gesserit)', result);

  return result;
}

// Run if executed directly
if (require.main === module) {
  testStrongholdBattle().catch(console.error);
}

