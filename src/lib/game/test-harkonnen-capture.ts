/**
 * Test script for Harkonnen Captured Leaders system
 * Tests the basic flow of capturing and killing leaders
 */

import { Faction, LeaderLocation } from './types';
import { createGameState } from './state';
import {
  captureLeader,
  killCapturedLeader,
  returnCapturedLeader,
  returnAllCapturedLeaders,
  getFactionState,
  getAvailableLeadersForCapture,
  shouldTriggerPrisonBreak,
} from './state';
import { getLeaderDefinition } from './data';

async function testHarkonnenCapture() {
  console.log('='.repeat(80));
  console.log('HARKONNEN CAPTURED LEADERS SYSTEM TEST');
  console.log('='.repeat(80));

  // Create a 2-player game: Harkonnen vs Atreides
  let state = createGameState({
    factions: [Faction.HARKONNEN, Faction.ATREIDES],
    maxTurns: 10,
  });

  console.log('\n1. Initial state');
  console.log('-'.repeat(80));
  const harkonnenInitial = getFactionState(state, Faction.HARKONNEN);
  const atreidesInitial = getFactionState(state, Faction.ATREIDES);
  console.log(`Harkonnen leaders: ${harkonnenInitial.leaders.length}`);
  console.log(`Atreides leaders: ${atreidesInitial.leaders.length}`);
  console.log(`Harkonnen spice: ${harkonnenInitial.spice}`);

  // Get an Atreides leader
  const atreidesLeaders = atreidesInitial.leaders.filter(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );
  if (atreidesLeaders.length === 0) {
    console.error('ERROR: No Atreides leaders available');
    return;
  }

  const targetLeader = atreidesLeaders[0];
  const leaderDef = getLeaderDefinition(targetLeader.definitionId);
  console.log(`\nTarget for capture: ${leaderDef?.name} (${targetLeader.definitionId})`);

  // Test 1: Capture a leader
  console.log('\n2. Capturing Atreides leader');
  console.log('-'.repeat(80));
  state = captureLeader(state, Faction.HARKONNEN, Faction.ATREIDES, targetLeader.definitionId);

  const harkonnenAfterCapture = getFactionState(state, Faction.HARKONNEN);
  const atreidesAfterCapture = getFactionState(state, Faction.ATREIDES);

  console.log(`Harkonnen leaders: ${harkonnenAfterCapture.leaders.length}`);
  console.log(`Atreides leaders: ${atreidesAfterCapture.leaders.length}`);

  const capturedLeader = harkonnenAfterCapture.leaders.find(
    (l) => l.definitionId === targetLeader.definitionId
  );
  if (capturedLeader) {
    console.log(`Captured leader faction: ${capturedLeader.faction}`);
    console.log(`Captured leader originalFaction: ${capturedLeader.originalFaction}`);
    console.log(`Captured leader capturedBy: ${capturedLeader.capturedBy}`);
    console.log('✓ Leader successfully captured');
  } else {
    console.error('✗ ERROR: Leader not found in Harkonnen pool');
  }

  // Test 2: Kill captured leader for 2 spice
  console.log('\n3. Killing captured leader for 2 spice');
  console.log('-'.repeat(80));
  const spiceBefore = harkonnenAfterCapture.spice;
  state = killCapturedLeader(state, Faction.HARKONNEN, targetLeader.definitionId);

  const harkonnenAfterKill = getFactionState(state, Faction.HARKONNEN);
  const atreidesAfterKill = getFactionState(state, Faction.ATREIDES);

  console.log(`Harkonnen spice: ${spiceBefore} -> ${harkonnenAfterKill.spice}`);
  console.log(`Harkonnen leaders: ${harkonnenAfterKill.leaders.length}`);
  console.log(`Atreides leaders: ${atreidesAfterKill.leaders.length}`);

  // Check if leader is in Atreides tanks face-down
  const killedLeader = atreidesAfterKill.leaders.find(
    (l) => l.definitionId === targetLeader.definitionId
  );
  if (killedLeader) {
    console.log(`Killed leader location: ${killedLeader.location}`);
    console.log(`Killed leader hasBeenKilled: ${killedLeader.hasBeenKilled}`);
    if (
      killedLeader.location === LeaderLocation.TANKS_FACE_DOWN &&
      harkonnenAfterKill.spice === spiceBefore + 2
    ) {
      console.log('✓ Leader killed and Harkonnen gained 2 spice');
    } else {
      console.error('✗ ERROR: Leader kill did not work correctly');
    }
  } else {
    console.error('✗ ERROR: Killed leader not found');
  }

  // Test 3: Capture another leader and return it
  console.log('\n4. Capture and return a leader');
  console.log('-'.repeat(80));
  const secondLeader = atreidesAfterKill.leaders.find(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );
  if (secondLeader) {
    const secondLeaderDef = getLeaderDefinition(secondLeader.definitionId);
    console.log(`Capturing: ${secondLeaderDef?.name}`);
    state = captureLeader(
      state,
      Faction.HARKONNEN,
      Faction.ATREIDES,
      secondLeader.definitionId
    );

    console.log('Returning captured leader...');
    state = returnCapturedLeader(state, secondLeader.definitionId);

    const harkonnenAfterReturn = getFactionState(state, Faction.HARKONNEN);
    const atreidesAfterReturn = getFactionState(state, Faction.ATREIDES);

    console.log(`Harkonnen leaders: ${harkonnenAfterReturn.leaders.length}`);
    console.log(`Atreides leaders: ${atreidesAfterReturn.leaders.length}`);

    const returnedLeader = atreidesAfterReturn.leaders.find(
      (l) => l.definitionId === secondLeader.definitionId
    );
    if (
      returnedLeader &&
      returnedLeader.location === LeaderLocation.LEADER_POOL &&
      returnedLeader.capturedBy === null
    ) {
      console.log('✓ Leader successfully returned to original owner');
    } else {
      console.error('✗ ERROR: Leader return did not work correctly');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run test
testHarkonnenCapture().catch(console.error);
