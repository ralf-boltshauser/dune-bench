/**
 * Integration Tests for Auction Cycle
 * 
 * Tests complete auction cycle: start → bid → resolve.
 */

import { Faction } from '../../../types';
import { BiddingPhaseHandler } from '../../../phases/handlers/bidding';
import { 
  assertSpice,
  assertHandSize,
  assertEventEmitted,
  assertPhaseComplete,
} from '../helpers/assertions';
import { 
  BiddingTestStateBuilder,
} from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all auction cycle integration tests
 */
export function runAuctionCycleTests(): number {
  console.log('\n' + '='.repeat(80));
  console.log('AUCTION CYCLE INTEGRATION TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test: Complete auction cycle - single bidder wins
  console.log('\n📋 Testing complete auction cycle - single bidder...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 15)
      .withSpice(Faction.HARKONNEN, 15)
      .build();
    
    const originalSpice = state.factions.get(Faction.ATREIDES)!.spice;
    const originalHandSize = state.factions.get(Faction.ATREIDES)!.hand.length;
    
    const handler = new BiddingPhaseHandler();
    const initResult = handler.initialize(state);
    
    const responses = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 1)
      .queuePass(Faction.HARKONNEN)
      .getResponses();
    
    let currentState = initResult.state;
    let currentResult = initResult;
    let allEvents: any[] = [...initResult.events];
    let responseIndex = 0;
    let maxIterations = 20;
    let iterations = 0;
    
    // Process until auction resolves or phase completes
    while (!currentResult.phaseComplete && iterations < maxIterations) {
      iterations++;
      
      // Handle pending requests (e.g., Atreides peek)
      if (currentResult.pendingRequests.length > 0) {
        const request = currentResult.pendingRequests[0];
        const matchingResponse = responses.find(
          (r, idx) => idx >= responseIndex && 
          (r.factionId === request.factionId || 
           (request.requestType === 'PEEK_CARD' && r.actionType === 'PEEK_CARD') ||
           (request.requestType === 'BID_OR_PASS' && (r.actionType === 'BID' || r.actionType === 'PASS')))
        );
        if (matchingResponse) {
          responseIndex = responses.indexOf(matchingResponse) + 1;
          currentResult = handler.processStep(currentState, [matchingResponse]);
        } else {
          break;
        }
      } else if (responseIndex < responses.length) {
        const response = responses[responseIndex];
        responseIndex++;
        currentResult = handler.processStep(currentState, [response]);
      } else {
        break;
      }
      
      currentState = currentResult.state;
      allEvents.push(...currentResult.events);
      
      if (currentResult.phaseComplete) break;
    }
    
    // Assertions - check all accumulated events
    const wonEvent = allEvents.find(e => e.type === 'CARD_WON');
    assert(wonEvent !== undefined, 'Should have CARD_WON event');
    
    // If phase is complete, check spice and hand size
    if (currentResult.phaseComplete) {
      assertSpice(currentState, Faction.ATREIDES, originalSpice - 1);
      assertHandSize(currentState, Faction.ATREIDES, originalHandSize + 1);
    }
    
    console.log('  ✅ Complete auction cycle - single bidder correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Complete auction cycle test failed:', error);
    failed++;
  }

  // Test: Complete auction cycle - bidding war
  console.log('\n📋 Testing complete auction cycle - bidding war...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 15)
      .withSpice(Faction.HARKONNEN, 15)
      .build();
    
    const originalSpice = state.factions.get(Faction.HARKONNEN)!.spice;
    const originalHandSize = state.factions.get(Faction.HARKONNEN)!.hand.length;
    
    const handler = new BiddingPhaseHandler();
    const initResult = handler.initialize(state);
    
    const responses = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 1)
      .queueBid(Faction.HARKONNEN, 2)
      .queueBid(Faction.ATREIDES, 3)
      .queueBid(Faction.HARKONNEN, 4)
      .queuePass(Faction.ATREIDES)
      .getResponses();
    
    let currentState = initResult.state;
    let currentResult = initResult;
    let allEvents: any[] = [...initResult.events];
    let responseIndex = 0;
    let maxIterations = 20;
    let iterations = 0;
    
    // Process until auction resolves or phase completes
    while (!currentResult.phaseComplete && iterations < maxIterations) {
      iterations++;
      
      if (currentResult.pendingRequests.length > 0) {
        const request = currentResult.pendingRequests[0];
        const matchingResponse = responses.find(
          (r, idx) => idx >= responseIndex && 
          (r.factionId === request.factionId || 
           (request.requestType === 'PEEK_CARD' && r.actionType === 'PEEK_CARD') ||
           (request.requestType === 'BID_OR_PASS' && (r.actionType === 'BID' || r.actionType === 'PASS')))
        );
        if (matchingResponse) {
          responseIndex = responses.indexOf(matchingResponse) + 1;
          currentResult = handler.processStep(currentState, [matchingResponse]);
        } else {
          break;
        }
      } else if (responseIndex < responses.length) {
        const response = responses[responseIndex];
        responseIndex++;
        currentResult = handler.processStep(currentState, [response]);
      } else {
        break;
      }
      
      currentState = currentResult.state;
      allEvents.push(...currentResult.events);
      
      if (currentResult.phaseComplete) break;
    }
    
    // Assertions - check all accumulated events
    const wonEvent = allEvents.find(e => e.type === 'CARD_WON');
    assert(wonEvent !== undefined, 'Should have CARD_WON event');
    
    // If phase is complete, check spice and hand size
    if (currentResult.phaseComplete) {
      assertSpice(currentState, Faction.HARKONNEN, originalSpice - 4);
      assertHandSize(currentState, Faction.HARKONNEN, originalHandSize + 1);
    }
    
    console.log('  ✅ Complete auction cycle - bidding war correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Complete auction cycle - bidding war test failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Auction Cycle Tests: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(80));

  return passed;
}

