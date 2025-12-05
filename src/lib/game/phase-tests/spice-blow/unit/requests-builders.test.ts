/**
 * Unit Tests for Request Builders
 * 
 * Tests for request builder functions in requests/builders.ts
 */

import { Faction, TerritoryId } from '../../../types';
import { SpiceBlowRequests } from '../../../phases/handlers/spice-blow/requests/builders';
import { buildTestState } from '../helpers/test-state-builder';
import { FACTION_PRESETS } from '../helpers/fixtures';

/**
 * Test fremenProtection request
 */
export function testFremenProtectionRequest() {
  console.log('\n=== Testing fremenProtection Request ===');
  
  const location = { territoryId: TerritoryId.CIELAGO_SOUTH, sector: 1 };
  const request = SpiceBlowRequests.fremenProtection(location, Faction.ATREIDES, 3);
  
  if (request.factionId !== Faction.FREMEN) {
    throw new Error(`Expected factionId to be ${Faction.FREMEN}, but got ${request.factionId}`);
  }
  
  if (request.requestType !== 'PROTECT_ALLY_FROM_WORM') {
    throw new Error(`Expected requestType to be PROTECT_ALLY_FROM_WORM, but got ${request.requestType}`);
  }
  
  if (request.context.territory !== TerritoryId.CIELAGO_SOUTH) {
    throw new Error(`Expected context.territory to be ${TerritoryId.CIELAGO_SOUTH}, but got ${request.context.territory}`);
  }
  
  if (request.context.ally !== Faction.ATREIDES) {
    throw new Error(`Expected context.ally to be ${Faction.ATREIDES}, but got ${request.context.ally}`);
  }
  
  if (request.context.allyForces !== 3) {
    throw new Error(`Expected context.allyForces to be 3, but got ${request.context.allyForces}`);
  }
  
  if (!request.availableActions.includes('PROTECT_ALLY')) {
    throw new Error('Expected availableActions to include PROTECT_ALLY');
  }
  
  if (!request.availableActions.includes('ALLOW_DEVOURING')) {
    throw new Error('Expected availableActions to include ALLOW_DEVOURING');
  }
  
  console.log('✓ fremenProtection request created correctly');
}

/**
 * Test wormRide request
 */
export function testWormRideRequest() {
  console.log('\n=== Testing wormRide Request ===');
  
  const location = { territoryId: TerritoryId.CIELAGO_SOUTH, sector: 1 };
  const request = SpiceBlowRequests.wormRide(location, [Faction.ATREIDES, Faction.HARKONNEN]);
  
  if (request.factionId !== Faction.FREMEN) {
    throw new Error(`Expected factionId to be ${Faction.FREMEN}, but got ${request.factionId}`);
  }
  
  if (request.requestType !== 'WORM_RIDE') {
    throw new Error(`Expected requestType to be WORM_RIDE, but got ${request.requestType}`);
  }
  
  if (!request.availableActions.includes('WORM_RIDE')) {
    throw new Error('Expected availableActions to include WORM_RIDE');
  }
  
  if (!request.availableActions.includes('WORM_DEVOUR')) {
    throw new Error('Expected availableActions to include WORM_DEVOUR');
  }
  
  console.log('✓ wormRide request created correctly');
}

/**
 * Test allianceDecision request
 */
export function testAllianceDecisionRequest() {
  console.log('\n=== Testing allianceDecision Request ===');
  
  const state = buildTestState({
    factions: FACTION_PRESETS.THREE_FACTIONS,
    turn: 2,
  });
  
  const request = SpiceBlowRequests.allianceDecision(Faction.ATREIDES, state);
  
  if (request.factionId !== Faction.ATREIDES) {
    throw new Error(`Expected factionId to be ${Faction.ATREIDES}, but got ${request.factionId}`);
  }
  
  if (request.requestType !== 'ALLIANCE_DECISION') {
    throw new Error(`Expected requestType to be ALLIANCE_DECISION, but got ${request.requestType}`);
  }
  
  if (!request.availableActions.includes('FORM_ALLIANCE')) {
    throw new Error('Expected availableActions to include FORM_ALLIANCE');
  }
  
  if (!request.availableActions.includes('BREAK_ALLIANCE')) {
    throw new Error('Expected availableActions to include BREAK_ALLIANCE');
  }
  
  if (!request.availableActions.includes('PASS')) {
    throw new Error('Expected availableActions to include PASS');
  }
  
  // Test error case - faction not in state
  try {
    const invalidState = buildTestState({
      factions: [Faction.ATREIDES, Faction.FREMEN], // Need at least 2 factions
      turn: 2,
    });
    SpiceBlowRequests.allianceDecision(Faction.HARKONNEN, invalidState);
    throw new Error('Expected error when faction not in state');
  } catch (error: any) {
    if (!error.message.includes('not found')) {
      throw error;
    }
    // Expected error
  }
  
  console.log('✓ allianceDecision request created correctly');
}

/**
 * Run all request builder tests
 */
export function runRequestBuilderTests() {
  console.log('='.repeat(80));
  console.log('REQUEST BUILDER UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testFremenProtectionRequest();
    testWormRideRequest();
    testAllianceDecisionRequest();
    
    console.log('\n✅ All request builder tests passed!');
  } catch (error) {
    console.error('❌ Request builder tests failed:', error);
    throw error;
  }
}

