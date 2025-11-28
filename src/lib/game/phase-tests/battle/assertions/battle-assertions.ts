/**
 * Battle Assertions
 * 
 * Helper functions for asserting battle phase test results.
 */

import { getFactionState } from '../../../state';
import { Faction, TerritoryId } from '../../../types';
import type { GameState } from '../../../types';
import type { ScenarioResult } from '../scenarios/base-scenario';

export interface BattleAssertion {
  name: string;
  check: (result: ScenarioResult) => boolean;
  message: string;
}

/**
 * Assert that a faction has a specific amount of spice
 */
export function assertFactionSpice(
  faction: Faction,
  expectedSpice: number,
  tolerance: number = 0
): BattleAssertion {
  return {
    name: `${faction} spice`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const actual = factionState.spice;
      return Math.abs(actual - expectedSpice) <= tolerance;
    },
    message: `Expected ${faction} to have ${expectedSpice} spice (tolerance: ${tolerance})`,
  };
}

/**
 * Assert that a faction has forces in a territory
 */
export function assertForcesInTerritory(
  faction: Faction,
  territory: TerritoryId,
  minRegular: number = 0,
  minElite: number = 0
): BattleAssertion {
  return {
    name: `${faction} forces in ${territory}`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const forces = factionState.forces.onBoard.find(
        f => f.territoryId === territory
      );
      if (!forces) {
        return minRegular === 0 && minElite === 0;
      }
      return forces.forces.regular >= minRegular && forces.forces.elite >= minElite;
    },
    message: `Expected ${faction} to have at least ${minRegular} regular and ${minElite} elite forces in ${territory}`,
  };
}

/**
 * Assert that a specific event occurred
 */
export function assertEventOccurred(eventType: string): BattleAssertion {
  return {
    name: `Event: ${eventType}`,
    check: (result) => {
      return result.events.some(e => e.type === eventType);
    },
    message: `Expected event ${eventType} to occur`,
  };
}

/**
 * Assert that a leader was captured
 */
export function assertLeaderCaptured(
  captor: Faction,
  victim: Faction
): BattleAssertion {
  return {
    name: `Leader captured: ${captor} captured ${victim}'s leader`,
    check: (result) => {
      const captorState = getFactionState(result.state, captor);
      const capturedLeader = captorState.leaders.find(
        l => l.capturedBy === captor && l.originalFaction === victim
      );
      return capturedLeader !== undefined;
    },
    message: `Expected ${captor} to have captured a leader from ${victim}`,
  };
}

/**
 * Assert that a leader was killed
 */
export function assertLeaderKilled(
  faction: Faction,
  leaderId: string
): BattleAssertion {
  return {
    name: `Leader killed: ${faction}'s ${leaderId}`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const leader = factionState.leaders.find(l => l.definitionId === leaderId);
      return leader?.hasBeenKilled === true;
    },
    message: `Expected ${faction}'s leader ${leaderId} to be killed`,
  };
}

/**
 * Assert that a battle was resolved
 */
export function assertBattleResolved(): BattleAssertion {
  return {
    name: 'Battle resolved',
    check: (result) => {
      return assertEventOccurred('BATTLE_RESOLVED').check(result);
    },
    message: 'Expected battle to be resolved',
  };
}

/**
 * Assert that prescience was used
 */
export function assertPrescienceUsed(): BattleAssertion {
  return {
    name: 'Prescience used',
    check: (result) => {
      return assertEventOccurred('PRESCIENCE_USED').check(result);
    },
    message: 'Expected Prescience to be used',
  };
}

/**
 * Assert that voice was used
 */
export function assertVoiceUsed(): BattleAssertion {
  return {
    name: 'Voice used',
    check: (result) => {
      return assertEventOccurred('VOICE_USED').check(result);
    },
    message: 'Expected Voice to be used',
  };
}

/**
 * Assert that winner card discard choice occurred
 */
export function assertWinnerCardDiscardChoice(): BattleAssertion {
  return {
    name: 'Winner card discard choice',
    check: (result) => {
      return assertEventOccurred('CARD_DISCARD_CHOICE').check(result);
    },
    message: 'Expected winner card discard choice to occur',
  };
}

/**
 * Run all assertions and report results
 */
export function runAssertions(
  result: ScenarioResult,
  assertions: BattleAssertion[]
): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log('\n--- Assertions ---');
  for (const assertion of assertions) {
    const passedCheck = assertion.check(result);
    if (passedCheck) {
      console.log(`  ✓ ${assertion.name}`);
      passed++;
    } else {
      console.log(`  ✗ ${assertion.name}`);
      console.log(`    ${assertion.message}`);
      failed++;
      failures.push(assertion.message);
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return { passed, failed, failures };
}

