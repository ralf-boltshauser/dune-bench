/**
 * Tests for alliance mutations
 */

import { Faction } from '../../../types';
import {
  formAlliance,
  breakAlliance,
} from '../../mutations/alliances';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import {
  expectAlliance,
  expectAllianceFormed,
  expectAllianceBroken,
  expectAllianceInHistory,
} from '../helpers/assertion-helpers';

/**
 * Test formAlliance
 */
function testFormAlliance() {
  console.log('\n=== Testing formAlliance ===');

  // Test: Form alliance between two factions
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTurn(1)
    .build();

  const result1 = formAlliance(state1, Faction.ATREIDES, Faction.HARKONNEN);
  expectAllianceFormed(result1, Faction.ATREIDES, Faction.HARKONNEN);
  expectAllianceInHistory(result1, Faction.ATREIDES, Faction.HARKONNEN, 1);
  console.log('✓ Form alliance between two factions');

  // Test: Both factions' allianceStatus set to ALLIED
  const atreidesState = result1.factions.get(Faction.ATREIDES)!;
  const harkonnenState = result1.factions.get(Faction.HARKONNEN)!;
  if (atreidesState.allianceStatus !== 'allied' || harkonnenState.allianceStatus !== 'allied') {
    throw new Error('Both factions should have allianceStatus allied');
  }
  console.log('✓ Both factions\' allianceStatus set to ALLIED');

  // Test: Both factions' allyId set correctly
  if (atreidesState.allyId !== Faction.HARKONNEN || harkonnenState.allyId !== Faction.ATREIDES) {
    throw new Error('Both factions\' allyId should be set correctly');
  }
  console.log('✓ Both factions\' allyId set correctly');

  // Test: Alliance added to state.alliances array
  const alliance = result1.alliances.find(
    (a) => a.factions.includes(Faction.ATREIDES) && a.factions.includes(Faction.HARKONNEN)
  );
  if (!alliance) {
    throw new Error('Alliance should be added to state.alliances array');
  }
  console.log('✓ Alliance added to state.alliances array');

  // Test: Alliance records turn when formed
  if (alliance.formedOnTurn !== 1) {
    throw new Error(`Expected alliance to be formed on turn 1, but got ${alliance.formedOnTurn}`);
  }
  console.log('✓ Alliance records turn when formed');

  // Test: Immutability
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  const original2 = cloneStateForTesting(state2);
  const result2 = formAlliance(state2, Faction.ATREIDES, Faction.HARKONNEN);
  verifyStateNotSame(original2, result2);
  expectAlliance(original2, Faction.ATREIDES, Faction.HARKONNEN, false);
  console.log('✓ Immutability verified');

  console.log('✅ All formAlliance tests passed\n');
}

/**
 * Test breakAlliance
 */
function testBreakAlliance() {
  console.log('\n=== Testing breakAlliance ===');

  // Test: Break alliance
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withAlliance(Faction.ATREIDES, Faction.HARKONNEN)
    .build();

  const result1 = breakAlliance(state1, Faction.ATREIDES);
  expectAllianceBroken(result1, Faction.ATREIDES, Faction.HARKONNEN);
  console.log('✓ Break alliance');

  // Test: Both factions' allianceStatus set to UNALLIED
  const atreidesState = result1.factions.get(Faction.ATREIDES)!;
  const harkonnenState = result1.factions.get(Faction.HARKONNEN)!;
  if (atreidesState.allianceStatus !== 'unallied' || harkonnenState.allianceStatus !== 'unallied') {
    throw new Error('Both factions should have allianceStatus unallied');
  }
  console.log('✓ Both factions\' allianceStatus set to UNALLIED');

  // Test: Both factions' allyId set to null
  if (atreidesState.allyId !== null || harkonnenState.allyId !== null) {
    throw new Error('Both factions\' allyId should be set to null');
  }
  console.log('✓ Both factions\' allyId set to null');

  // Test: Alliance removed from state.alliances array
  const alliance = result1.alliances.find(
    (a) => a.factions.includes(Faction.ATREIDES) && a.factions.includes(Faction.HARKONNEN)
  );
  if (alliance) {
    throw new Error('Alliance should be removed from state.alliances array');
  }
  console.log('✓ Alliance removed from state.alliances array');

  // Test: Break alliance when not allied (should return state unchanged)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const result2 = breakAlliance(state2, Faction.ATREIDES);
  expectAllianceBroken(result2, Faction.ATREIDES, Faction.HARKONNEN);
  console.log('✓ Break alliance when not allied (should return state unchanged)');

  // Test: Immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withAlliance(Faction.ATREIDES, Faction.HARKONNEN)
    .build();
  const original3 = cloneStateForTesting(state3);
  const result3 = breakAlliance(state3, Faction.ATREIDES);
  verifyStateNotSame(original3, result3);
  expectAlliance(original3, Faction.ATREIDES, Faction.HARKONNEN, true);
  console.log('✓ Immutability verified');

  console.log('✅ All breakAlliance tests passed\n');
}

/**
 * Run all alliance mutation tests
 */
export function runAlliancesTests() {
  console.log('='.repeat(80));
  console.log('ALLIANCE MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testFormAlliance();
    testBreakAlliance();
    console.log('✅ All alliance mutation tests passed!');
  } catch (error) {
    console.error('❌ Alliance mutation tests failed:', error);
    throw error;
  }
}

