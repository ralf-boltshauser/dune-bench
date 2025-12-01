/**
 * Phase Manager - Orchestrates the game flow through all phases.
 * This is the main controller that runs the game turn by turn.
 */

import { advancePhase, advanceTurn } from "../state";
import { SynchronizedStateManager } from "../state/synchronized-state-manager";
import {
  Faction,
  Phase,
  PHASE_ORDER,
  type GameState,
  type WinResult,
} from "../types";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "./types";

// =============================================================================
// AGENT PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for providing agent responses.
 * Implemented by the AI orchestrator or test harness.
 */
export interface AgentProvider {
  /**
   * Get responses for one or more agent requests.
   * @param requests - The requests to process
   * @param simultaneous - Whether all requests should be processed at once
   * @returns Responses from agents
   */
  getResponses(
    requests: AgentRequest[],
    simultaneous: boolean
  ): Promise<AgentResponse[]>;

  /**
   * Update the agent provider with new game state.
   * This is called before getResponses so agents have the latest state.
   */
  updateState?(state: GameState): void;

  /**
   * Get the current game state from the agent provider.
   * Tools may update state internally, so this returns the latest state.
   */
  getState?(): GameState;

  /**
   * Set ornithopter access override for a specific faction.
   * Used during shipment-movement phase to lock ornithopter access at phase start.
   */
  setOrnithopterAccessOverride?(
    faction: Faction,
    hasAccess: boolean | undefined
  ): void;
}

/**
 * Event listener for phase events.
 */
export type PhaseEventListener = (event: PhaseEvent) => void;

/**
 * Options for running the game with phase filtering (useful for debugging).
 */
export interface GameRunOptions {
  /** Run only specific phases (for debugging) */
  onlyPhases?: Phase[];
  /** Stop after this phase completes (for debugging) */
  stopAfter?: Phase;
  /** Skip setup phase, use default values */
  skipSetup?: boolean;
}

// =============================================================================
// PHASE MANAGER
// =============================================================================

export class PhaseManager {
  private handlers: Map<Phase, PhaseHandler> = new Map();
  private agentProvider: AgentProvider;
  private eventListeners: PhaseEventListener[] = [];
  private isRunning: boolean = false;

  constructor(agentProvider: AgentProvider) {
    this.agentProvider = agentProvider;
  }

  /**
   * Register a phase handler.
   */
  registerHandler(handler: PhaseHandler): void {
    this.handlers.set(handler.phase, handler);
  }

  /**
   * Register all phase handlers at once.
   */
  registerHandlers(handlers: PhaseHandler[]): void {
    for (const handler of handlers) {
      this.registerHandler(handler);
    }
  }

  /**
   * Add an event listener.
   */
  addEventListener(listener: PhaseEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: PhaseEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emitEvent(event: PhaseEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    }
  }

  /**
   * Emit multiple events.
   */
  private emitEvents(events: PhaseEvent[]): void {
    for (const event of events) {
      this.emitEvent(event);
    }
  }

  /**
   * Run the game until completion or max turns.
   * @param initialState - The initial game state
   * @param options - Optional phase filtering for debugging
   */
  async runGame(
    initialState: GameState,
    options: GameRunOptions = {}
  ): Promise<GameResult> {
    if (this.isRunning) {
      throw new Error("Game is already running");
    }

    this.isRunning = true;
    // Create state manager for the entire game - automatically syncs on every update
    const stateManager = new SynchronizedStateManager(
      initialState,
      this.agentProvider
    );
    let shouldStop = false;

    try {
      // Handle setup phase
      const shouldRunSetup =
        !options.skipSetup &&
        (stateManager.state.phase === Phase.SETUP ||
          !stateManager.state.setupComplete) &&
        (!options.onlyPhases || options.onlyPhases.includes(Phase.SETUP));

      if (shouldRunSetup) {
        const setupState = await this.runPhase(stateManager.state, Phase.SETUP);
        // CRITICAL: Update stateManager with the state returned from runPhase
        // This ensures the authoritative state (with Fremen forces) is preserved
        stateManager.updateState({
          ...setupState,
          setupComplete: true,
          phase: Phase.STORM,
        });

        // Stop if stopAfter is setup OR if onlyPhases only contains setup
        if (
          options.stopAfter === Phase.SETUP ||
          (options.onlyPhases &&
            options.onlyPhases.length === 1 &&
            options.onlyPhases[0] === Phase.SETUP)
        ) {
          shouldStop = true;
        }
      } else if (options.skipSetup) {
        // Mark setup as complete even if skipped - auto syncs
        stateManager.mutate((s) => ({
          ...s,
          setupComplete: true,
          phase: Phase.STORM,
        }));

        this.emitEvent({
          type: "PHASE_SKIPPED",
          data: { phase: Phase.SETUP },
          message: "Setup phase skipped (using defaults)",
        });
      }

      if (!shouldStop) {
        this.emitEvent({
          type: "TURN_STARTED",
          data: { turn: stateManager.state.turn },
          message: `Turn ${stateManager.state.turn} started`,
        });

        while (
          !stateManager.state.winner &&
          stateManager.state.turn <= stateManager.state.config.maxTurns &&
          !shouldStop
        ) {
          const turnResult = await this.runTurn(stateManager.state, options);
          stateManager.updateState(turnResult.state);
          shouldStop = turnResult.shouldStop;

          if (!stateManager.state.winner && !shouldStop) {
            // Advance turn - auto syncs
            stateManager.mutate((s) => advanceTurn(s));

            this.emitEvent({
              type: "TURN_STARTED",
              data: { turn: stateManager.state.turn },
              message: `Turn ${stateManager.state.turn} started`,
            });
          }
        }
      }

      this.emitEvent({
        type: "GAME_ENDED",
        data: {
          winner: stateManager.state.winner,
          turn: stateManager.state.turn,
          stoppedEarly: shouldStop,
        },
        message: shouldStop
          ? `Game stopped after ${options.stopAfter} phase`
          : stateManager.state.winner
          ? `Game ended: ${stateManager.state.winner.winners.join(" & ")} win!`
          : `Game ended after ${stateManager.state.turn} turns`,
      });

      return {
        finalState: stateManager.state,
        winner: stateManager.state.winner,
        totalTurns: stateManager.state.turn,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single turn (all 9 phases).
   * @param state - Current game state
   * @param options - Optional phase filtering for debugging
   */
  async runTurn(
    state: GameState,
    options: GameRunOptions = {}
  ): Promise<{ state: GameState; shouldStop: boolean }> {
    // Create state manager for the turn - automatically syncs on every update
    const stateManager = new SynchronizedStateManager(
      state,
      this.agentProvider
    );
    let shouldStop = false;

    for (const phase of PHASE_ORDER) {
      // Skip phases not in onlyPhases filter (if specified)
      if (options.onlyPhases && !options.onlyPhases.includes(phase)) {
        continue;
      }

      // Run phase - returns updated state, update state manager
      const phaseState = await this.runPhase(stateManager.state, phase);
      stateManager.updateState(phaseState);

      // Check for stopAfter
      if (options.stopAfter === phase) {
        shouldStop = true;
        break;
      }

      // Check for victory after Mentat Pause
      if (stateManager.state.winner) {
        break;
      }
    }

    return { state: stateManager.state, shouldStop };
  }

  /**
   * Run a single phase.
   */
  async runPhase(state: GameState, phase: Phase): Promise<GameState> {
    const handler = this.handlers.get(phase);
    if (!handler) {
      console.warn(`No handler registered for phase ${phase}, skipping`);
      return advancePhase(state, this.getNextPhase(phase));
    }

    // Create state manager - automatically syncs on every update
    const stateManager = new SynchronizedStateManager(
      state,
      this.agentProvider
    );

    // Update state to current phase - auto syncs
    stateManager.mutate((s) => ({ ...s, phase }));

    this.emitEvent({
      type: "PHASE_STARTED",
      data: { phase },
      message: `${phase} phase started`,
    });

    // Initialize the phase - auto syncs
    let result = handler.initialize(stateManager.state);
    stateManager.applyStepResult(result);

    this.emitEvents(result.events);

    // Process phase steps until complete
    // Add retry limit to prevent infinite loops (e.g., from schema serialization errors)
    let stepCount = 0;
    const MAX_STEPS = 100; // Safety limit to prevent infinite loops
    let lastAuthoritativeState: GameState = result.state; // Track authoritative state across loop

    while (!result.phaseComplete) {
      stepCount++;
      if (stepCount > MAX_STEPS) {
        console.error(
          `\n⚠️  Phase ${phase} exceeded maximum step limit (${MAX_STEPS}). This may indicate an infinite loop.`
        );
        console.error(
          "Last pending requests:",
          result.pendingRequests.map((r) => ({
            faction: r.factionId,
            type: r.requestType,
          }))
        );
        throw new Error(
          `Phase ${phase} exceeded maximum step limit (${MAX_STEPS}). Possible infinite loop detected.`
        );
      }

      // Get agent responses if needed
      let responses: AgentResponse[] = [];
      if (result.pendingRequests.length > 0) {
        // State manager already has latest state synced, so tools will have current state

        // Set ornithopter access override if specified in request context
        // This is used during shipment-movement phase to lock ornithopter access at phase start
        if (this.agentProvider.setOrnithopterAccessOverride) {
          for (const request of result.pendingRequests) {
            if (request.context?.hasOrnithoptersFromPhaseStart !== undefined) {
              this.agentProvider.setOrnithopterAccessOverride(
                request.factionId,
                request.context.hasOrnithoptersFromPhaseStart as boolean
              );
            }
          }
        }

        try {
          responses = await this.agentProvider.getResponses(
            result.pendingRequests,
            result.simultaneousRequests ?? false
          );
        } catch (error) {
          // If getResponses throws (e.g., schema serialization error), log and rethrow
          // The retry limit will catch infinite loops
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `\n❌ Error getting agent responses at step ${stepCount}:`,
            errorMsg
          );
          if (
            errorMsg.includes("SchemaSerializationError") ||
            errorMsg.includes("Transforms cannot be represented")
          ) {
            throw new Error(
              `Schema serialization error detected. This usually means a tool schema has transforms/refinements. ` +
                `Check tool schemas and remove any .refine() or .transform() calls. ` +
                `Original error: ${errorMsg}`
            );
          }
          throw error; // Re-throw other errors
        }

        // Clear ornithopter access override after responses
        if (this.agentProvider.setOrnithopterAccessOverride) {
          for (const request of result.pendingRequests) {
            if (request.context?.hasOrnithoptersFromPhaseStart !== undefined) {
              this.agentProvider.setOrnithopterAccessOverride(
                request.factionId,
                undefined
              );
            }
          }
        }

        // Sync state back from agent provider (tools may have updated it)
        stateManager.syncFromAgent();
      }

      // Process next step - auto syncs
      result = handler.processStep(stateManager.state, responses);

      // Store the state from processStep before any syncing
      // This is the authoritative state from the phase handler
      const authoritativeState = result.state;
      lastAuthoritativeState = authoritativeState; // Track the most recent authoritative state
      stateManager.applyStepResult(result);

      // Sync state from agent provider AFTER updating it
      // Tools may have updated state internally, so get latest state
      // BUT: Only sync if we actually got responses (tools were called)
      // If no tools were called, the state from processStep is authoritative
      if (responses.length > 0) {
        stateManager.syncFromAgent();
        const agentState = stateManager.state;

        // Check if agent state lost important data or has incorrect force locations
        // This happens when tools don't modify state but we sync from agent anyway
        // Compare key state: if authoritative state has forces that agent state doesn't, keep authoritative
        // Also check if force locations differ (indicates state corruption)
        let shouldKeepAuthoritative = false;
        for (const [faction, factionState] of authoritativeState.factions) {
          const agentFactionState = agentState.factions.get(faction);
          if (agentFactionState) {
            const authForces = factionState.forces.onBoard.length;
            const agentForces = agentFactionState.forces.onBoard.length;
            // If authoritative has more forces on board, it's likely more correct
            if (authForces > agentForces) {
              shouldKeepAuthoritative = true;
              break;
            }

            // Check if force locations match - if they don't, authoritative is more correct
            // This prevents state corruption where forces appear in wrong territories
            if (authForces === agentForces && authForces > 0) {
              // Compare force locations
              const authLocations = new Set(
                factionState.forces.onBoard.map(
                  (s) => `${s.territoryId}-${s.sector}`
                )
              );
              const agentLocations = new Set(
                agentFactionState.forces.onBoard.map(
                  (s) => `${s.territoryId}-${s.sector}`
                )
              );

              // If locations don't match, authoritative state is more correct
              if (
                authLocations.size !== agentLocations.size ||
                !Array.from(authLocations).every((loc) =>
                  agentLocations.has(loc)
                )
              ) {
                shouldKeepAuthoritative = true;
                console.warn(
                  `[PhaseManager] State mismatch for ${faction}: ` +
                    `Authoritative locations: ${Array.from(authLocations).join(
                      ", "
                    )}, ` +
                    `Agent locations: ${Array.from(agentLocations).join(
                      ", "
                    )}. ` +
                    `Keeping authoritative state.`
                );
                break;
              }
            }
          } else {
            // Agent doesn't have this faction's state - check if authoritative has forces
            // This can happen if agent state is missing a faction entirely
            if (factionState.forces.onBoard.length > 0) {
              shouldKeepAuthoritative = true;
              console.warn(
                `[PhaseManager] Agent state missing ${faction} faction state, but authoritative has ${factionState.forces.onBoard.length} force stacks. Keeping authoritative state.`
              );
              break;
            }
          }
        }

        if (shouldKeepAuthoritative) {
          // Restore authoritative state - agent state was stale or corrupted
          stateManager.updateState(authoritativeState);
        } else {
          // Agent state is fine or better - ensure it's synced back
          stateManager.updateState(agentState);
        }
      } else {
        // No tools were called - authoritative state is correct
        // CRITICAL: Sync authoritative state TO agent so agent has latest state
        // This prevents stale agent state from overwriting correct state in future steps
        // The updateState call already syncs, but we need to ensure agent gets the authoritative state
        stateManager.updateState(authoritativeState);
      }

      this.emitEvents(result.events);
    }

    // Cleanup - auto syncs
    // CRITICAL: Use the authoritative state from the last step, not stateManager.state
    // which might have been corrupted by agent sync. The lastAuthoritativeState
    // from the loop is the most correct state.
    const cleanupState = handler.cleanup(lastAuthoritativeState);
    stateManager.updateState(cleanupState);

    this.emitEvent({
      type: "PHASE_ENDED",
      data: { phase },
      message: `${phase} phase ended`,
    });

    // CRITICAL: Return the cleanup state, not stateManager.state, to ensure
    // we return the authoritative state from the phase handler, not potentially
    // corrupted agent state
    return cleanupState;
  }

  /**
   * Run a single phase step (for testing/debugging).
   */
  async runPhaseStep(
    state: GameState,
    responses: AgentResponse[] = []
  ): Promise<PhaseStepResult> {
    const handler = this.handlers.get(state.phase);
    if (!handler) {
      throw new Error(`No handler for phase ${state.phase}`);
    }

    return handler.processStep(state, responses);
  }

  /**
   * Get the next phase in order.
   */
  private getNextPhase(currentPhase: Phase): Phase {
    const index = PHASE_ORDER.indexOf(currentPhase);
    if (index === -1 || index === PHASE_ORDER.length - 1) {
      return Phase.STORM; // Wrap around to start
    }
    return PHASE_ORDER[index + 1];
  }

  /**
   * Stop a running game.
   */
  stop(): void {
    this.isRunning = false;
  }
}

// =============================================================================
// GAME RESULT
// =============================================================================

export interface GameResult {
  finalState: GameState;
  winner: WinResult | null;
  totalTurns: number;
}

// =============================================================================
// MOCK AGENT PROVIDER (for testing)
// =============================================================================

/**
 * A mock agent provider that uses predefined responses or random valid actions.
 * Useful for testing phase logic without real AI.
 */
export class MockAgentProvider implements AgentProvider {
  private responseQueue: Map<string, AgentResponse[]> = new Map();
  private defaultBehavior: "pass" | "random" | "first_valid" = "pass";

  constructor(defaultBehavior: "pass" | "random" | "first_valid" = "pass") {
    this.defaultBehavior = defaultBehavior;
  }

  /**
   * Queue responses for a specific request type.
   */
  queueResponse(requestType: string, response: AgentResponse): void {
    const queue = this.responseQueue.get(requestType) ?? [];
    queue.push(response);
    this.responseQueue.set(requestType, queue);
  }

  async getResponses(
    requests: AgentRequest[],
    _simultaneous: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<AgentResponse[]> {
    return requests.map((request) => {
      // Check for queued response
      const queue = this.responseQueue.get(request.requestType);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }

      // Default behavior
      return this.generateDefaultResponse(request);
    });
  }

  private generateDefaultResponse(request: AgentRequest): AgentResponse {
    switch (this.defaultBehavior) {
      case "pass":
        return {
          factionId: request.factionId,
          actionType: "PASS",
          data: {},
          passed: true,
        };

      case "random":
      case "first_valid":
        // For now, just pass - real implementation would pick valid action
        return {
          factionId: request.factionId,
          actionType: "PASS",
          data: {},
          passed: true,
        };

      default:
        return {
          factionId: request.factionId,
          actionType: "PASS",
          data: {},
          passed: true,
        };
    }
  }
}
