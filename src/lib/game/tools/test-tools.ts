/**
 * Tool Integration Tests
 *
 * Tests for the AI agent tool system.
 */

import { Faction, Phase, TerritoryId, type GameState } from '../types';
import { createGameState, type CreateGameOptions } from '../state';
import {
  createAgentToolProvider,
  INFORMATION_TOOL_NAMES,
  ALL_ACTION_TOOL_NAMES,
  PHASE_TOOLS,
  ALL_TOOL_NAMES,
} from './index';
import type { ModelMessage, ToolCallOptions } from 'ai';
import type { ToolResult } from './types';

// =============================================================================
// TEST HELPERS
// =============================================================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): void {
  const result = fn();
  if (result instanceof Promise) {
    // Handle async tests - will be run after sync tests
    asyncTests.push({ name, promise: result });
  } else {
    if (result) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  }
}

const asyncTests: Array<{ name: string; promise: Promise<boolean> }> = [];

async function runAsyncTests(): Promise<void> {
  for (const { name, promise } of asyncTests) {
    try {
      const result = await promise;
      if (result) {
        console.log(`  ✓ ${name}`);
        passed++;
      } else {
        console.log(`  ✗ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ ${name}: ${error}`);
      failed++;
    }
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

function createTestState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  const options: CreateGameOptions = {
    factions,
    maxTurns: 10,
    advancedRules: false,
  };
  return createGameState(options);
}

// =============================================================================
// TESTS
// =============================================================================

console.log('🔧 DUNE GF9 - Tool System Tests\n');

// --- Tool Registration Tests ---
section('Tool Registration');

test('Information tools are defined', () => {
  return INFORMATION_TOOL_NAMES.length === 7;
});

test('All action tools are defined', () => {
  return ALL_ACTION_TOOL_NAMES.length > 10;
});

test('ALL_TOOL_NAMES includes info and action tools', () => {
  return ALL_TOOL_NAMES.length === INFORMATION_TOOL_NAMES.length + ALL_ACTION_TOOL_NAMES.length;
});

test('Phase tools mapping is complete', () => {
  // Should have mapping for all phases
  const phaseCount = Object.keys(Phase).length;
  const mappedPhases = Object.keys(PHASE_TOOLS).length;
  return mappedPhases === phaseCount;
});

// --- Tool Provider Tests ---
section('Tool Provider');

const testState = createTestState();
const provider = createAgentToolProvider(testState, Faction.ATREIDES);

test('Provider creates successfully', () => {
  return provider !== null;
});

test('Provider has correct faction', () => {
  return provider.faction === Faction.ATREIDES;
});

test('Provider has game state', () => {
  return provider.state.turn === 1;
});

test('Provider returns all tools', () => {
  const tools = provider.getAllTools();
  return Object.keys(tools).length > 0;
});

test('Provider returns phase-specific tools', () => {
  const stormTools = provider.getToolsForPhase(Phase.STORM);
  // Should have information tools + storm tools
  return Object.keys(stormTools).length >= INFORMATION_TOOL_NAMES.length;
});

// --- Context Manager Tests ---
section('Context Manager');

const ctx = provider.context;

test('Context provides game state summary', () => {
  const summary = ctx.getGameStateSummary();
  return summary.turn === 1 && summary.phase === Phase.STORM;
});

test('Context provides faction info', () => {
  const info = ctx.getFactionInfo();
  return info.faction === Faction.ATREIDES && info.spice >= 0;
});

test('Context provides valid actions', () => {
  const actions = ctx.getValidActions();
  return actions.phase === Phase.STORM && actions.availableActions.includes('dial_storm');
});

test('Context provides territory info', () => {
  const info = ctx.getTerritoryInfo(TerritoryId.ARRAKEEN);
  return info !== null && info.isStronghold;
});

test('Context provides hand info', () => {
  const hand = ctx.getMyHand();
  return Array.isArray(hand);
});

test('Context provides traitor info', () => {
  const traitors = ctx.getMyTraitors();
  return Array.isArray(traitors);
});

// --- Tool Availability Tests ---
section('Tool Availability by Phase');

test('Storm phase has dial_storm tool', () => {
  const tools = PHASE_TOOLS[Phase.STORM];
  return tools.includes('dial_storm');
});

test('Bidding phase has bid tools', () => {
  const tools = PHASE_TOOLS[Phase.BIDDING];
  return tools.includes('place_bid') && tools.includes('pass_bid');
});

test('Revival phase has revival tools', () => {
  const tools = PHASE_TOOLS[Phase.REVIVAL];
  return tools.includes('revive_forces') && tools.includes('revive_leader');
});

test('Shipment & Movement phase has both tool types', () => {
  const tools = PHASE_TOOLS[Phase.SHIPMENT_MOVEMENT];
  return tools.includes('ship_forces') && tools.includes('move_forces');
});

test('Battle phase has battle tools', () => {
  const tools = PHASE_TOOLS[Phase.BATTLE];
  return tools.includes('submit_battle_plan') && tools.includes('call_traitor');
});

test('Mentat Pause has nexus tools', () => {
  const tools = PHASE_TOOLS[Phase.MENTAT_PAUSE];
  return tools.includes('propose_alliance');
});

// --- Tool Execution Tests ---
section('Tool Execution');

// Create a mock ToolCallOptions for testing
const mockToolOptions: ToolCallOptions = {
  toolCallId: 'test',
  messages: [] as ModelMessage[], // Empty messages array for testing
  abortSignal: undefined,
};

test('Information tool executes successfully', async () => {
  const tools = provider.getAllTools();
  const viewState = tools['view_game_state'];
  if (!viewState || !viewState.execute) return false;

  const result = (await viewState.execute({}, mockToolOptions)) as ToolResult;
  return result.success === true;
});

test('Storm tool validates dial value', async () => {
  const tools = provider.getAllTools();
  const dialStorm = tools['dial_storm'];
  if (!dialStorm || !dialStorm.execute) return false;

  // Valid dial for turn 1
  const result = (await dialStorm.execute({ dial: 10 }, mockToolOptions)) as ToolResult;
  return result.success === true;
});

test('Storm tool rejects invalid dial', async () => {
  const tools = provider.getAllTools();
  const dialStorm = tools['dial_storm'];
  if (!dialStorm || !dialStorm.execute) return false;

  // Invalid dial for turn 1 (max is 20)
  const result = (await dialStorm.execute({ dial: 25 }, mockToolOptions)) as ToolResult;
  return result.success === false && result.error?.code === 'INVALID_DIAL';
});

// --- prepareStep Tests ---
section('Dynamic Tool Control');

test('prepareStep function works', () => {
  const prepareStep = provider.createPrepareStep();
  const result = prepareStep({ toolCallsCount: 0 });
  return result.tools !== undefined && Object.keys(result.tools).length > 0;
});

test('Available tool summary includes phase info', () => {
  const summary = provider.getAvailableToolSummary();
  return summary.includes('storm') || summary.includes('dial_storm');
});

// =============================================================================
// RESULTS
// =============================================================================

// Run async tests and print results
runAsyncTests().then(() => {
  console.log('\n========================================');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
});
