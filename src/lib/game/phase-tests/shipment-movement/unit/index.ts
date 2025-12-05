/**
 * Unit Tests for Shipment-Movement Modules
 * 
 * Runs all unit tests for individual modules
 */

import { runAllStateMachineTests } from './state-machine.test';
import { runAllGuildHandlerTests } from './guild-handler.test';
import { runAllAllianceConstraintTests } from './alliance-constraints.test';
import { runAllBGAdvisorsTests } from './bg-advisors.test';

/**
 * Run all unit tests
 */
export async function runAllUnitTests(): Promise<boolean> {
  console.log('='.repeat(80));
  console.log('UNIT TESTS FOR SHIPMENT-MOVEMENT MODULES');
  console.log('='.repeat(80));

  const results = {
    stateMachine: runAllStateMachineTests(),
    guildHandler: runAllGuildHandlerTests(),
    allianceConstraints: runAllAllianceConstraintTests(),
    bgAdvisors: runAllBGAdvisorsTests(),
  };

  const allPassed = Object.values(results).every((result) => result);

  console.log('\n' + '='.repeat(80));
  console.log('UNIT TESTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`State Machine: ${results.stateMachine ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Guild Handler: ${results.guildHandler ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Alliance Constraints: ${results.allianceConstraints ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`BG Advisors: ${results.bgAdvisors ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\nOverall: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

  return allPassed;
}

