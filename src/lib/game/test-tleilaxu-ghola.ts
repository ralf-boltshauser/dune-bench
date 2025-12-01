/**
 * Test Tleilaxu Ghola card usage
 *
 * Verifies that:
 * 1. Tleilaxu Ghola can revive a leader for free
 * 2. Tleilaxu Ghola can revive up to 5 forces for free
 * 3. Card is discarded after use
 * 4. Proper validation occurs
 */

import { createGameState } from './state/factory';
import { Faction, Phase, LeaderLocation, CardLocation, TerritoryId, TreacheryCardType } from './types';
import { createAgentToolProvider } from './tools/registry';
import { killLeader, sendForcesToTanks } from './state/mutations';
import type { TreacheryCard } from './types';
import type { ToolResult } from './tools/types';

// Helper to unwrap tool result (handles both ToolResult and AsyncIterable)
async function unwrapToolResult<T>(
  result: ToolResult<T> | AsyncIterable<ToolResult<T>> | undefined
): Promise<ToolResult<T> | null> {
  if (!result) {
    return null;
  }
  // Check if it's an async iterable
  if (typeof result === 'object' && Symbol.asyncIterator in result) {
    // It's an async iterable, get the first (and usually only) value
    const iterator = (result as AsyncIterable<ToolResult<T>>)[Symbol.asyncIterator]();
    const { value } = await iterator.next();
    return value;
  }
  // It's already a ToolResult
  return result as ToolResult<T>;
}

async function testTleilaxuGhola() {
  console.log('=== Testing Tleilaxu Ghola Card ===\n');

  // Create initial state with 2 factions
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });
  state = { ...state, phase: Phase.REVIVAL, turn: 2 };

  const atreides = state.factions.get(Faction.ATREIDES)!;

  // Setup: Kill a leader and send forces to tanks
  console.log('Setup: Killing Paul Atreides and sending 10 forces to tanks...');
  state = killLeader(state, Faction.ATREIDES, 'paul_atreides');
  state = sendForcesToTanks(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 10, false);

  // Give Atreides the Tleilaxu Ghola card
  const gholaCard: TreacheryCard = {
    definitionId: 'tleilaxu_ghola',
    type: TreacheryCardType.SPECIAL,
    location: CardLocation.HAND,
    ownerId: Faction.ATREIDES,
  };

  const atreidesState = state.factions.get(Faction.ATREIDES)!;
  const updatedAtreides = {
    ...atreidesState,
    hand: [...atreidesState.hand, gholaCard],
  };
  state.factions.set(Faction.ATREIDES, updatedAtreides);

  console.log(`Atreides has ${updatedAtreides.hand.length} cards in hand`);
  console.log(`Atreides has ${atreidesState.forces.tanks.regular} forces in tanks`);
  console.log(`Paul Atreides location: ${atreidesState.leaders.find(l => l.definitionId === 'paul_atreides')?.location}\n`);

  // Test 1: Revive a leader using Tleilaxu Ghola
  console.log('Test 1: Reviving Paul Atreides using Tleilaxu Ghola...');
  const provider = createAgentToolProvider(state, Faction.ATREIDES);
  const tools = provider.getToolsForPhase(Phase.REVIVAL);
  const gholaTool = tools['use_tleilaxu_ghola'];

  if (!gholaTool) {
    console.error('ERROR: use_tleilaxu_ghola tool not found!');
    return;
  }

  const rawLeaderRevivalResult = await gholaTool.execute?.({
    reviveType: 'leader',
    leaderId: 'paul_atreides',
  }, {
    toolCallId: 'test-1',
    messages: [],
  });

  const leaderRevivalResult = await unwrapToolResult(rawLeaderRevivalResult);

  if (!leaderRevivalResult) {
    console.error('ERROR: Unexpected result type');
    return;
  }

  console.log(`Result: ${leaderRevivalResult.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Message: ${leaderRevivalResult.message}`);

  if (leaderRevivalResult.success) {
    const newState = provider.getState();
    const newAtreides = newState.factions.get(Faction.ATREIDES)!;
    const paulLocation = newAtreides.leaders.find(l => l.definitionId === 'paul_atreides')?.location;
    console.log(`Paul Atreides location after revival: ${paulLocation}`);
    console.log(`Cards in hand after: ${newAtreides.hand.length}`);
    console.log(`Ghola card still in hand: ${newAtreides.hand.some(c => c.definitionId === 'tleilaxu_ghola')}`);

    if (paulLocation === LeaderLocation.LEADER_POOL && !newAtreides.hand.some(c => c.definitionId === 'tleilaxu_ghola')) {
      console.log('✓ Leader revival successful and card discarded\n');
    } else {
      console.log('✗ Leader revival or discard failed\n');
    }
  } else {
    console.log('✗ Leader revival failed\n');
  }

  // Test 2: Revive forces using Tleilaxu Ghola (fresh state)
  console.log('Test 2: Reviving 5 forces using Tleilaxu Ghola...');

  // Reset state for second test
  state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });
  state = { ...state, phase: Phase.REVIVAL, turn: 2 };
  state = sendForcesToTanks(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 10, false);

  const atreidesState2 = state.factions.get(Faction.ATREIDES)!;
  const updatedAtreides2 = {
    ...atreidesState2,
    hand: [...atreidesState2.hand, gholaCard],
  };
  state.factions.set(Faction.ATREIDES, updatedAtreides2);

  const provider2 = createAgentToolProvider(state, Faction.ATREIDES);
  const tools2 = provider2.getToolsForPhase(Phase.REVIVAL);
  const gholaTool2 = tools2['use_tleilaxu_ghola'];

  const rawForceRevivalResult = await gholaTool2.execute?.({
    reviveType: 'forces',
    forceCount: 5,
  }, {
    toolCallId: 'test-2',
    messages: [],
  });

  const forceRevivalResult = await unwrapToolResult(rawForceRevivalResult);

  if (!forceRevivalResult) {
    console.error('ERROR: Unexpected result type');
    return;
  }

  console.log(`Result: ${forceRevivalResult.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Message: ${forceRevivalResult.message}`);

  if (forceRevivalResult.success) {
    const newState2 = provider2.getState();
    const newAtreides2 = newState2.factions.get(Faction.ATREIDES)!;
    const initialReserves = updatedAtreides2.forces.reserves.regular;
    const expectedReserves = initialReserves + 5; // Initial + 5 revived
    const expectedTanks = 5; // 10 - 5 revived

    console.log(`Initial forces in reserves: ${initialReserves}`);
    console.log(`Forces in reserves after revival: ${newAtreides2.forces.reserves.regular}`);
    console.log(`Forces in tanks after revival: ${newAtreides2.forces.tanks.regular}`);
    console.log(`Cards in hand after: ${newAtreides2.hand.length}`);
    console.log(`Ghola card still in hand: ${newAtreides2.hand.some(c => c.definitionId === 'tleilaxu_ghola')}`);

    if (newAtreides2.forces.reserves.regular === expectedReserves &&
        newAtreides2.forces.tanks.regular === expectedTanks &&
        !newAtreides2.hand.some(c => c.definitionId === 'tleilaxu_ghola')) {
      console.log('✓ Force revival successful and card discarded\n');
    } else {
      console.log('✗ Force revival or discard failed\n');
    }
  } else {
    console.log('✗ Force revival failed\n');
  }

  // Test 3: Verify validation (no card)
  console.log('Test 3: Attempting to use Ghola without having the card...');
  state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });
  state = { ...state, phase: Phase.REVIVAL, turn: 2 };
  state = sendForcesToTanks(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 10, false);

  const provider3 = createAgentToolProvider(state, Faction.ATREIDES);
  const tools3 = provider3.getToolsForPhase(Phase.REVIVAL);
  const gholaTool3 = tools3['use_tleilaxu_ghola'];

  const rawNoCardResult = await gholaTool3.execute?.({
    reviveType: 'forces',
    forceCount: 5,
  }, {
    toolCallId: 'test-3',
    messages: [],
  });

  const noCardResult = await unwrapToolResult(rawNoCardResult);

  if (!noCardResult) {
    console.error('ERROR: Unexpected result type');
    return;
  }

  console.log(`Result: ${noCardResult.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Message: ${noCardResult.message}`);

  if (!noCardResult.success && noCardResult.message.includes('do not have')) {
    console.log('✓ Validation correctly prevents usage without card\n');
  } else {
    console.log('✗ Validation failed\n');
  }

  console.log('=== Tleilaxu Ghola Tests Complete ===');
}

// Run tests
testTleilaxuGhola().catch(console.error);
