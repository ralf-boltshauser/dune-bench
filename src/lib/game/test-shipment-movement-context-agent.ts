/**
 * Shipment & Movement Context Agent Test
 *
 * Creates a small game state, runs ONLY the Shipment & Movement phase
 * with a logging agent provider, and prints out the agent requests so
 * you can verify that shipmentContext and movementContext are present
 * and populated as expected.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/test-shipment-movement-context-agent.ts
 */

import {
  Faction,
  Phase,
  type GameState,
  TerritoryId,
} from './types';
import {
  createGameState,
  shipForces,
  addSpiceToTerritory,
  getFactionState,
} from './state';
import {
  PhaseManager,
  type AgentProvider,
} from './phases/phase-manager';
import {
  ShipmentMovementPhaseHandler,
} from './phases/handlers/shipment-movement';
import type {
  AgentRequest,
  AgentResponse,
} from './phases/types';

// =============================================================================
// LOGGING AGENT PROVIDER
// =============================================================================

class LoggingAgentProvider implements AgentProvider {
  private latestState: GameState;

  constructor(initialState: GameState) {
    this.latestState = initialState;
  }

  updateState(state: GameState): void {
    this.latestState = state;
  }

  getState(): GameState {
    return this.latestState;
  }

  // We don't use ornithopter override here, but implement to satisfy interface
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setOrnithopterAccessOverride(_faction: Faction, _hasAccess: boolean | undefined): void {
    // no-op for this debug provider
  }

  async getResponses(
    requests: AgentRequest[],
    _simultaneous: boolean
  ): Promise<AgentResponse[]> {
    // Log all requests with their context
    for (const req of requests) {
      console.log('\n' + '='.repeat(80));
      console.log(`AGENT REQUEST for ${req.factionId} (${req.requestType})`);
      console.log('-'.repeat(80));
      console.log('Prompt:\n');
      console.log(req.prompt);
      console.log('\nContext keys:', Object.keys(req.context));

      if ('shipmentContext' in req.context) {
        console.log('\nshipmentContext (truncated):');
        const ctx = req.context.shipmentContext as Record<string, unknown>;
        console.log(
          JSON.stringify(
            {
              ownForcesCount: Array.isArray(ctx.ownForces) ? ctx.ownForces.length : undefined,
              strongholdsCount: Array.isArray(ctx.strongholds) ? ctx.strongholds.length : undefined,
              sampleOwnForce: Array.isArray(ctx.ownForces) ? ctx.ownForces[0] : undefined,
              sampleStronghold: Array.isArray(ctx.strongholds) ? ctx.strongholds[0] : undefined,
            },
            null,
            2
          )
        );
      }

      if ('movementContext' in req.context) {
        console.log('\nmovementContext (truncated):');
        const ctx = req.context.movementContext as Record<string, unknown>;
        console.log(
          JSON.stringify(
            {
              forceStacksCount: Array.isArray(ctx.forceStacks) ? ctx.forceStacks.length : undefined,
              movementRange: ctx.movementRange,
              hasOrnithopters: ctx.hasOrnithopters,
              sampleStack: Array.isArray(ctx.forceStacks) ? ctx.forceStacks[0] : undefined,
            },
            null,
            2
          )
        );
      }

      // Also print available actions to see what tools agent could use
      console.log('\nAvailable Actions:', req.availableActions.join(', '));
      console.log('='.repeat(80) + '\n');
    }

    // For this debug run, always return PASS responses
    const responses: AgentResponse[] = requests.map((req) => ({
      factionId: req.factionId,
      actionType: 'PASS',
      data: {},
      passed: true,
      reasoning: 'Debug provider: always PASS',
    }));

    return responses;
  }
}

// =============================================================================
// TEST SCENARIO SETUP
// =============================================================================

function createInterestingShipmentMovementState(): GameState {
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });

  // Add some extra forces and spice to create a non-trivial board
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.forces.reserves.regular += 5;

  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  harkonnenState.forces.reserves.regular += 5;

  const emperorState = getFactionState(state, Faction.EMPEROR);
  emperorState.forces.reserves.regular += 5;

  // Ship a few extra forces to interesting locations
  state = shipForces(state, Faction.ATREIDES, TerritoryId.IMPERIAL_BASIN, 9, 3, false);
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 10, 4, false);
  state = shipForces(state, Faction.EMPEROR, TerritoryId.TUEKS_SIETCH, 9, 4, false);

  // Add spice to some sand territories and strongholds
  state = addSpiceToTerritory(state, TerritoryId.HABBANYA_ERG, 7, 5);
  state = addSpiceToTerritory(state, TerritoryId.THE_GREAT_FLAT, 6, 6);
  state = addSpiceToTerritory(state, TerritoryId.IMPERIAL_BASIN, 9, 4);

  // Set phase to Shipment & Movement
  state.phase = Phase.SHIPMENT_MOVEMENT;

  return state;
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runShipmentMovementContextAgentTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('SHIPMENT & MOVEMENT CONTEXT AGENT TEST');
  console.log('='.repeat(80));

  const initialState = createInterestingShipmentMovementState();

  // Create logging agent provider and phase manager
  const agentProvider = new LoggingAgentProvider(initialState);
  const phaseManager = new PhaseManager(agentProvider);

  // Register only the Shipment & Movement phase handler
  phaseManager.registerHandler(new ShipmentMovementPhaseHandler());

  console.log('\nRunning Shipment & Movement phase with logging agent provider...\n');

  const finalState = await phaseManager.runPhase(initialState, Phase.SHIPMENT_MOVEMENT);

  console.log('\nShipment & Movement phase completed.');
  console.log('Final phase:', finalState.phase);
}

// Run if executed directly
if (require.main === module) {
  runShipmentMovementContextAgentTest().catch((error) => {
    console.error('Error running Shipment & Movement context agent test:', error);
    process.exit(1);
  });
}


