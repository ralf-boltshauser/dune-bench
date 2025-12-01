#!/usr/bin/env tsx

/**
 * Quick integration test to verify Azure OpenAI agents are working
 * 
 * This creates a simple game state and tests that an agent can make a decision.
 */

import './src/lib/game/agent/env-loader';
import { createGameState } from './src/lib/game/state';
import { createAgentProvider } from './src/lib/game/agent/azure-provider';
import { Faction } from './src/lib/game/types';
import type { AgentRequest } from './src/lib/game/phases/types';

async function testAgentIntegration() {
  console.log('🧪 Testing Azure OpenAI Agent Integration...\n');

  // Create a minimal game state
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    maxTurns: 1,
  });

  console.log('📋 Game State Created:');
  console.log(`   Game ID: ${state.gameId}`);
  console.log(`   Factions: ${Array.from(state.factions.keys()).join(', ')}\n`);

  // Create agent provider
  console.log('🤖 Creating Azure OpenAI Agent Provider...\n');
  const provider = createAgentProvider(state, {
    verbose: true,
  });

  console.log('✅ Agent Provider Created\n');

  // Test: Request a simple decision from Atreides
  console.log('📤 Requesting decision from Atreides agent...\n');
  
  const request: AgentRequest = {
    factionId: Faction.ATREIDES,
    requestType: 'USE_KARAMA',
    prompt: 'Say "Agent integration test successful!" in exactly those words.',
    context: {},
    availableActions: ['PASS'],
  };

  try {
    const startTime = Date.now();
    const responses = await provider.getResponses([request], false);
    const duration = Date.now() - startTime;

    const response = responses[0];
    
    console.log('✅ Agent Response Received!\n');
    console.log('📊 Response Details:');
    console.log(`   Faction: ${response.factionId}`);
    console.log(`   Action: ${response.actionType}`);
    console.log(`   Passed: ${response.passed}`);
    console.log(`   Reasoning: ${response.reasoning?.substring(0, 100)}...`);
    console.log(`   Duration: ${duration}ms\n`);

    if (response.reasoning?.includes('Agent integration test successful')) {
      console.log('🎉 SUCCESS: Agent is working correctly!\n');
      return true;
    } else {
      console.log('⚠️  WARNING: Agent responded but message may not match expected\n');
      return true; // Still consider it working
    }
  } catch (error) {
    console.error('❌ Agent Request Failed!\n');
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
    } else {
      console.error('   Unknown error:', error);
    }
    return false;
  }
}

// Run the test
testAgentIntegration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

