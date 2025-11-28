/**
 * Test to verify Cheap Hero must be played when no leaders available.
 *
 * Rule from battle.md line 190:
 * "The Cheap Hero may be played in place of a leader, it must be played
 * when you have no leaders available."
 */

import { validateBattlePlan } from './rules/combat';
import { createGameState } from './state/factory';
import {
  Faction,
  TerritoryId,
  BattlePlan,
  LeaderLocation,
  CardLocation,
  TreacheryCardType,
} from './types';

// Create test state
const state = createGameState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
  advancedRules: false,
});

// Add Cheap Hero card to Atreides hand manually
const atreidesFaction = state.factions.get(Faction.ATREIDES)!;
const cheapHeroCard = {
  definitionId: 'cheap_hero_1',
  type: TreacheryCardType.SPECIAL,
  location: CardLocation.HAND,
  ownerId: Faction.ATREIDES,
};
atreidesFaction.hand.push(cheapHeroCard);

// Put all Atreides leaders in tanks (make them unavailable) - modify state directly
for (const leader of atreidesFaction.leaders) {
  leader.location = LeaderLocation.TANKS_FACE_UP;
}

console.log('=== TEST: Cheap Hero Enforcement ===\n');

// Test 1: Battle plan without leader or Cheap Hero when no leaders available
// (should fail with MUST_PLAY_CHEAP_HERO)
console.log('Test 1: No leaders available, Cheap Hero not used (should fail)');
const invalidPlan: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 1,
  leaderId: null,
  cheapHeroUsed: false,
  weaponCardId: null,
  defenseCardId: null,
  spiceDialed: 0,
  kwisatzHaderachUsed: false,
  announcedNoLeader: false,
};

const result1 = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, invalidPlan);
console.log('Valid:', result1.valid);
console.log('Expected error code: MUST_PLAY_CHEAP_HERO');
console.log('Actual error code:', result1.errors[0]?.code);
console.log('Message:', result1.errors[0]?.message);
console.log('Match:', result1.errors[0]?.code === 'MUST_PLAY_CHEAP_HERO' ? '✓ PASS' : '✗ FAIL');
console.log();

// Test 2: Battle plan with Cheap Hero when no leaders available (should succeed)
console.log('Test 2: No leaders available, Cheap Hero used (should pass)');
const validPlan: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 1,
  leaderId: null,
  cheapHeroUsed: true,
  weaponCardId: null,
  defenseCardId: null,
  spiceDialed: 0,
  kwisatzHaderachUsed: false,
  announcedNoLeader: false,
};

const result2 = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, validPlan);
console.log('Valid:', result2.valid);
console.log('Errors:', result2.errors);
console.log('Match:', result2.valid ? '✓ PASS' : '✗ FAIL');
console.log();

// Test 3: Verify that having available leaders requires playing a leader (not Cheap Hero)
console.log('Test 3: Leader available, neither leader nor Cheap Hero used (should fail with MUST_PLAY_LEADER)');
// Make one leader available
atreidesFaction.leaders[0].location = LeaderLocation.LEADER_POOL;

const planWithoutLeader: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 1,
  leaderId: null,
  cheapHeroUsed: false,
  weaponCardId: null,
  defenseCardId: null,
  spiceDialed: 0,
  kwisatzHaderachUsed: false,
  announcedNoLeader: false,
};

const result3 = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, planWithoutLeader);
console.log('Valid:', result3.valid);
console.log('Expected error code: MUST_PLAY_LEADER (not MUST_PLAY_CHEAP_HERO)');
console.log('Actual error code:', result3.errors[0]?.code);
console.log('Message:', result3.errors[0]?.message);
console.log('Match:', result3.errors[0]?.code === 'MUST_PLAY_LEADER' ? '✓ PASS' : '✗ FAIL');
console.log();

console.log('=== SUMMARY ===');
const allPassed =
  result1.errors[0]?.code === 'MUST_PLAY_CHEAP_HERO' &&
  result2.valid &&
  result3.errors[0]?.code === 'MUST_PLAY_LEADER';
console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
