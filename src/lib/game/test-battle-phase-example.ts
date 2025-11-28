/**
 * Example: Testing Battle Phase with All Factions
 * 
 * This demonstrates how to:
 * 1. Create a test state with specific setup
 * 2. Give factions specific cards, spice, forces
 * 3. Run isolated battle phase tests
 * 4. Mock agent responses
 */

import { createGameState } from './state/factory';
import {
  shipForces,
  addSpice,
  addSpiceToTerritory,
  getFactionState,
  formAlliance,
} from './state';
import { BattlePhaseHandler } from './phases/handlers/battle';
import { MockAgentProvider } from './phases/phase-manager';
import { Faction, Phase, TerritoryId } from './types';
import type { AgentResponse } from './phases/types';
import { getLeaderDefinition } from './data';

async function testBattlePhaseExample() {
  console.log('='.repeat(80));
  console.log('BATTLE PHASE TEST EXAMPLE');
  console.log('='.repeat(80));

  // ============================================================================
  // STEP 1: Create Game State
  // ============================================================================
  console.log('\n--- Step 1: Creating Game State ---');
  
  let state = createGameState({
    factions: [
      Faction.ATREIDES,
      Faction.BENE_GESSERIT,
      Faction.FREMEN,
      Faction.HARKONNEN,
    ],
    advancedRules: true, // Enable spice dialing
  });

  // Skip setup phase
  state.phase = Phase.BATTLE;
  state.turn = 1;
  state.setupComplete = true;

  console.log('✓ Game state created with 4 factions');
  console.log(`✓ Phase set to: ${state.phase}`);
  console.log(`✓ Turn: ${state.turn}`);

  // ============================================================================
  // STEP 2: Set Up Spice
  // ============================================================================
  console.log('\n--- Step 2: Setting Up Spice ---');
  
  state = addSpice(state, Faction.ATREIDES, 20);
  state = addSpice(state, Faction.BENE_GESSERIT, 15);
  state = addSpice(state, Faction.FREMEN, 10);
  state = addSpice(state, Faction.HARKONNEN, 25);

  console.log(`✓ Atreides spice: ${getFactionState(state, Faction.ATREIDES).spice}`);
  console.log(`✓ Bene Gesserit spice: ${getFactionState(state, Faction.BENE_GESSERIT).spice}`);
  console.log(`✓ Fremen spice: ${getFactionState(state, Faction.FREMEN).spice}`);
  console.log(`✓ Harkonnen spice: ${getFactionState(state, Faction.HARKONNEN).spice}`);

  // ============================================================================
  // STEP 3: Place Forces in Territories
  // ============================================================================
  console.log('\n--- Step 3: Placing Forces ---');
  
  // Battle 1: Atreides vs Harkonnen in Arrakeen
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 10, false);
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, 8, true); // 2 elite
  
  // Battle 2: Bene Gesserit vs Fremen in Arrakeen (different sector)
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 10, 5, false);
  state = shipForces(state, Faction.FREMEN, TerritoryId.ARRAKEEN, 10, 6, true); // 3 Fedaykin

  console.log('✓ Forces placed:');
  console.log(`  - Atreides: 10 regular in Arrakeen sector 9`);
  console.log(`  - Harkonnen: 8 regular + 2 elite in Arrakeen sector 9`);
  console.log(`  - Bene Gesserit: 5 regular in Arrakeen sector 10`);
  console.log(`  - Fremen: 6 regular + 3 Fedaykin in Arrakeen sector 10`);

  // ============================================================================
  // STEP 4: Add Spice to Territories
  // ============================================================================
  console.log('\n--- Step 4: Adding Spice to Territories ---');
  
  state = addSpiceToTerritory(state, TerritoryId.ARRAKEEN, 9, 15);
  state = addSpiceToTerritory(state, TerritoryId.ARRAKEEN, 10, 10);

  console.log('✓ Spice added to territories');

  // ============================================================================
  // STEP 5: Set Up Special Faction States
  // ============================================================================
  console.log('\n--- Step 5: Setting Up Special States ---');
  
  // Activate Kwisatz Haderach (Atreides)
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  if (atreidesState.kwisatzHaderach) {
    atreidesState.kwisatzHaderach.isActive = true;
    console.log('✓ Kwisatz Haderach activated for Atreides');
  }

  // Give Bene Gesserit a traitor card
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const paulLeader = getLeaderDefinition('paul-atreides');
  if (paulLeader) {
    bgState.traitors.push({
      leaderId: 'paul-atreides',
      leaderName: paulLeader.name,
      leaderFaction: Faction.ATREIDES,
      heldBy: Faction.BENE_GESSERIT,
    });
    console.log('✓ Bene Gesserit has traitor card for Paul Atreides');
  }

  // Form alliance (optional)
  // state = formAlliance(state, Faction.ATREIDES, Faction.FREMEN);
  // console.log('✓ Alliance formed between Atreides and Fremen');

  // ============================================================================
  // STEP 6: Set Up Cards (Manual Manipulation)
  // ============================================================================
  console.log('\n--- Step 6: Setting Up Cards ---');
  
  // Note: For specific cards, you'd need to manipulate the hand directly
  // For this example, we'll let them draw from deck (random)
  // In a real test, you'd do:
  // const atreidesState = getFactionState(state, Faction.ATREIDES);
  // atreidesState.hand.push({
  //   definitionId: 'crysknife',
  //   type: TreacheryCardType.WEAPON_PROJECTILE,
  // });
  
  console.log('✓ Cards will be drawn from deck (random)');
  console.log('  (For specific cards, manipulate factionState.hand directly)');

  // ============================================================================
  // STEP 7: Create Mock Agent Provider
  // ============================================================================
  console.log('\n--- Step 7: Creating Mock Agent Provider ---');
  
  const provider = new MockAgentProvider('pass'); // Default: pass on everything

  // Queue specific responses for battle plans
  provider.queueResponse('CREATE_BATTLE_PLAN', {
    factionId: Faction.ATREIDES,
    actionType: 'CREATE_BATTLE_PLAN',
    data: {
      leaderId: 'paul-atreides',
      forcesDialed: 5,
      weaponCardId: null,
      defenseCardId: 'shield',
      useKwisatzHaderach: true,
      spiceDialed: 5,
    },
    passed: false,
  } as AgentResponse);

  provider.queueResponse('CREATE_BATTLE_PLAN', {
    factionId: Faction.HARKONNEN,
    actionType: 'CREATE_BATTLE_PLAN',
    data: {
      leaderId: 'rabban-harkonnen',
      forcesDialed: 4,
      weaponCardId: 'lasgun',
      defenseCardId: null,
      spiceDialed: 4,
    },
    passed: false,
  } as AgentResponse);

  // Queue prescience response
  provider.queueResponse('USE_PRESCIENCE', {
    factionId: Faction.ATREIDES,
    actionType: 'USE_PRESCIENCE',
    data: {
      target: 'weapon',
    },
    passed: false,
  } as AgentResponse);

  // Queue voice response
  provider.queueResponse('USE_VOICE', {
    factionId: Faction.BENE_GESSERIT,
    actionType: 'USE_VOICE',
    data: {
      command: {
        type: 'not_play',
        cardType: 'poison_weapon',
      },
    },
    passed: false,
  } as AgentResponse);

  // Queue winner card discard choice
  provider.queueResponse('CHOOSE_CARDS_TO_DISCARD', {
    factionId: Faction.ATREIDES, // Assuming Atreides wins
    actionType: 'CHOOSE_CARDS_TO_DISCARD',
    data: {
      cardsToDiscard: [], // Keep all cards
    },
    passed: false,
  } as AgentResponse);

  console.log('✓ Mock agent provider created with queued responses');

  // ============================================================================
  // STEP 8: Create Battle Phase Handler
  // ============================================================================
  console.log('\n--- Step 8: Creating Battle Phase Handler ---');
  
  const handler = new BattlePhaseHandler();
  console.log('✓ Battle phase handler created');

  // ============================================================================
  // STEP 9: Initialize Phase
  // ============================================================================
  console.log('\n--- Step 9: Initializing Battle Phase ---');
  
  const initResult = handler.initialize(state);
  
  const battlesEvent = initResult.events.find(e => e.type === 'BATTLE_STARTED');
  if (battlesEvent) {
    console.log(`✓ ${battlesEvent.message}`);
  }

  console.log(`Phase complete: ${initResult.phaseComplete}`);
  console.log(`Pending requests: ${initResult.pendingRequests.length}`);

  // ============================================================================
  // STEP 10: Process Phase Steps
  // ============================================================================
  console.log('\n--- Step 10: Processing Battle Phase ---');
  
  let currentState = initResult.state;
  let responses: AgentResponse[] = [];
  let stepCount = 0;
  const maxSteps = 100; // Safety limit

  while (!initResult.phaseComplete && stepCount < maxSteps) {
    stepCount++;
    
    const stepResult = handler.processStep(currentState, responses);
    currentState = stepResult.state;

    // Log important events
    stepResult.events.forEach(event => {
      if (
        event.type.includes('BATTLE') ||
        event.type.includes('PRESCIENCE') ||
        event.type.includes('VOICE') ||
        event.type.includes('TRAITOR') ||
        event.type.includes('CARD') ||
        event.type.includes('LEADER')
      ) {
        console.log(`  [Step ${stepCount}] ${event.type}: ${event.message}`);
      }
    });

    if (stepResult.phaseComplete) {
      console.log(`\n✓ Phase complete after ${stepCount} steps`);
      break;
    }

    if (stepResult.pendingRequests.length > 0) {
      console.log(`  [Step ${stepCount}] Pending requests:`);
      stepResult.pendingRequests.forEach(req => {
        console.log(`    - ${req.factionId}: ${req.requestType}`);
      });

      // Get agent responses
      responses = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
    } else {
      responses = [];
    }
  }

  if (stepCount >= maxSteps) {
    console.log('\n⚠️  WARNING: Reached max steps limit');
  }

  // ============================================================================
  // STEP 11: Verify Results
  // ============================================================================
  console.log('\n--- Step 11: Verifying Results ---');
  
  const finalAtreides = getFactionState(currentState, Faction.ATREIDES);
  const finalHarkonnen = getFactionState(currentState, Faction.HARKONNEN);
  const finalBG = getFactionState(currentState, Faction.BENE_GESSERIT);
  const finalFremen = getFactionState(currentState, Faction.FREMEN);

  console.log('\nFinal State:');
  console.log(`  Atreides spice: ${finalAtreides.spice}`);
  console.log(`  Harkonnen spice: ${finalHarkonnen.spice}`);
  console.log(`  Bene Gesserit spice: ${finalBG.spice}`);
  console.log(`  Fremen spice: ${finalFremen.spice}`);

  const atreidesForces = finalAtreides.forces.onBoard.find(
    f => f.territoryId === TerritoryId.ARRAKEEN
  );
  const harkonnenForces = finalHarkonnen.forces.onBoard.find(
    f => f.territoryId === TerritoryId.ARRAKEEN
  );

  if (atreidesForces) {
    console.log(`  Atreides forces in Arrakeen: ${atreidesForces.forces.regular} regular, ${atreidesForces.forces.elite} elite`);
  }
  if (harkonnenForces) {
    console.log(`  Harkonnen forces in Arrakeen: ${harkonnenForces.forces.regular} regular, ${harkonnenForces.forces.elite} elite`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run test
if (require.main === module) {
  testBattlePhaseExample().catch(console.error);
}

export { testBattlePhaseExample };

