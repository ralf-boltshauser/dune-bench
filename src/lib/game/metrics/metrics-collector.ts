/**
 * Metrics Collector
 *
 * Subscribes to EventStreamer and collects metrics about game execution.
 * Tracks tool calls, game results, and performance data.
 */

import { eventStreamer, type StreamEvent, type Subscription } from '../stream/event-streamer';
import { AgentActivityEvent, GameLifecycleEvent, TurnPhaseEvent, type AgentToolCallData, type AgentToolResultData, type GameCompletedData, type PhaseStartedData } from '../stream/types';
import type { GameConfig, GameState, WinResult, Faction } from '../types';
import { Phase } from '../types';
import type { GameResult } from '../phases/phase-manager';
import type { GameMetrics, ToolCallMetric } from './types';

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

/**
 * Collects metrics by subscribing to game events.
 */
export class MetricsCollector {
  private gameId: string;
  private model: string;
  private config: GameConfig | null = null;
  private startTime: number = 0;
  private endTime: number = 0;
  private toolCalls: ToolCallMetric[] = [];
  private subscription: Subscription | null = null;
  private currentPhase: Phase | null = null;
  private pendingToolCalls: Map<string, { faction: Faction; toolName: string; phase: Phase; timestamp: number }> = new Map();
  private gameResult: GameResult | null = null;

  constructor(gameId: string, model: string) {
    this.gameId = gameId;
    this.model = model;
  }

  /**
   * Start collecting metrics for a game.
   * Sets up event listeners and initializes tracking.
   * 
   * @throws Error if subscription fails
   */
  async startGame(config: GameConfig): Promise<void> {
    this.config = config;
    this.startTime = Date.now();
    this.toolCalls = [];
    this.pendingToolCalls.clear();
    this.currentPhase = null;

    // Subscribe to game-specific events
    try {
      const subscription = await eventStreamer.subscribeToGame(
        this.gameId,
        (event) => this.handleEvent(event)
      );
      this.subscription = subscription;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[MetricsCollector] Failed to subscribe to game ${this.gameId}:`, err);
      throw new Error(
        `Failed to start metrics collection for game ${this.gameId}: ${err.message}`,
        { cause: err }
      );
    }
  }

  /**
   * Handle incoming events from EventStreamer.
   */
  private handleEvent(event: StreamEvent): void {
    try {
      // Track current phase from phase events
      if (event.type === TurnPhaseEvent.PHASE_STARTED) {
        const data = event.data as PhaseStartedData;
        if (data && typeof data === 'object' && 'phase' in data) {
          this.currentPhase = data.phase;
        }
      }

      // Handle tool call events
      if (event.type === AgentActivityEvent.AGENT_TOOL_CALL) {
        this.handleToolCall(event as StreamEvent<AgentToolCallData>);
      } else if (event.type === AgentActivityEvent.AGENT_TOOL_RESULT) {
        this.handleToolResult(event as StreamEvent<AgentToolResultData>);
      } else if (event.type === GameLifecycleEvent.GAME_COMPLETED) {
        this.handleGameCompleted(event as StreamEvent<GameCompletedData>);
      } else if (event.type === 'GAME_ENDED') {
        // Handle PhaseEvent 'GAME_ENDED' (also part of StreamEventType)
        this.handleGameEnded(event as StreamEvent<{ winner?: WinResult; turn?: number; stoppedEarly?: boolean }>);
      }
    } catch (error) {
      console.warn(`[MetricsCollector] Error handling event ${event.type}:`, error);
    }
  }

  /**
   * Handle AGENT_TOOL_CALL event.
   */
  private handleToolCall(event: StreamEvent<AgentToolCallData>): void {
    const data = event.data;
    if (!data || typeof data !== 'object') {
      console.warn('[MetricsCollector] Invalid AGENT_TOOL_CALL event data');
      return;
    }

    const { faction, toolName } = data;
    if (!faction || !toolName) {
      console.warn('[MetricsCollector] Missing faction or toolName in AGENT_TOOL_CALL');
      return;
    }

    // Store pending tool call info
    const callId = `${faction}-${toolName}-${event.timestamp}`;
    this.pendingToolCalls.set(callId, {
      faction,
      toolName,
      phase: this.currentPhase || Phase.SETUP,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle AGENT_TOOL_RESULT event.
   */
  private handleToolResult(event: StreamEvent<AgentToolResultData>): void {
    const data = event.data;
    if (!data || typeof data !== 'object') {
      console.warn('[MetricsCollector] Invalid AGENT_TOOL_RESULT event data');
      return;
    }

    const { faction, toolName, result } = data;
    if (!faction || !toolName) {
      console.warn('[MetricsCollector] Missing faction or toolName in AGENT_TOOL_RESULT');
      return;
    }

    // Find matching pending tool call
    // We'll match by faction and toolName, taking the most recent one
    let matchedCall: { faction: Faction; toolName: string; phase: Phase; timestamp: number } | null = null;
    let matchedCallId: string | null = null;

    for (const [callId, call] of this.pendingToolCalls.entries()) {
      if (call.faction === faction && call.toolName === toolName) {
        if (!matchedCall || call.timestamp > matchedCall.timestamp) {
          matchedCall = call;
          matchedCallId = callId;
        }
      }
    }

    // If no match found, use current phase or default
    const phase = matchedCall?.phase || this.currentPhase || Phase.SETUP;
    const timestamp = matchedCall?.timestamp || event.timestamp;

    // Determine success/failure from result
    let success = false;
    let error: { code: string; message: string } | undefined;

    if (result && typeof result === 'object') {
      // Check if it's a ToolResult structure
      if ('success' in result && typeof result.success === 'boolean') {
        success = result.success;
        if (!success && 'error' in result && result.error && typeof result.error === 'object') {
          const errorObj = result.error as { code?: string; message?: string };
          error = {
            code: errorObj.code || 'UNKNOWN_ERROR',
            message: errorObj.message || 'Unknown error',
          };
        }
      } else {
        // Assume success if result exists and has no error field
        success = true;
      }
    } else {
      // No result or unexpected format - assume failure
      success = false;
      error = {
        code: 'NO_RESULT',
        message: 'Tool result was missing or invalid',
      };
    }

    // Create tool call metric
    const metric: ToolCallMetric = {
      toolName,
      success,
      error,
      faction,
      phase,
      timestamp,
      gameId: this.gameId,
    };

    this.toolCalls.push(metric);

    // Remove matched pending call
    if (matchedCallId) {
      this.pendingToolCalls.delete(matchedCallId);
    }
  }

  /**
   * Handle GAME_COMPLETED event.
   */
  private handleGameCompleted(event: StreamEvent<GameCompletedData>): void {
    const data = event.data;
    if (!data || typeof data !== 'object') {
      console.warn('[MetricsCollector] Invalid GAME_COMPLETED event data');
      return;
    }

    const { result } = data;
    if (result) {
      this.gameResult = {
        finalState: null as unknown as GameState, // We don't need the full state
        winner: result.winner || null,
        totalTurns: result.totalTurns || 0,
      };
      this.recordGameEnd(this.gameResult);
    }
  }

  /**
   * Handle GAME_ENDED PhaseEvent (from PhaseManager).
   */
  private handleGameEnded(event: StreamEvent<{ winner?: WinResult; turn?: number; stoppedEarly?: boolean }>): void {
    // Only process if we haven't already handled GAME_COMPLETED
    if (this.gameResult) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') {
      console.warn('[MetricsCollector] Invalid GAME_ENDED event data');
      return;
    }

    const { winner, turn } = data;
    this.gameResult = {
      finalState: null as unknown as GameState, // We don't need the full state
      winner: winner || null,
      totalTurns: turn || 0,
    };
    this.recordGameEnd(this.gameResult);
  }

  /**
   * Record a tool call metric directly (for manual tracking if needed).
   */
  recordToolCall(metric: ToolCallMetric): void {
    this.toolCalls.push(metric);
  }

  /**
   * Record game end manually (if not using events).
   */
  recordGameEnd(_result: GameResult): void {
    this.endTime = Date.now();

    // Unsubscribe from events
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    // Clear pending tool calls
    this.pendingToolCalls.clear();
  }

  /**
   * Get collected metrics.
   */
  getMetrics(): GameMetrics {
    const duration = this.endTime > 0 ? this.endTime - this.startTime : Date.now() - this.startTime;
    const factions = this.config?.factions || [];
    const turns = this.gameResult?.totalTurns || 0;
    const winner = this.gameResult?.winner || null;

    return {
      gameId: this.gameId,
      model: this.model,
      factions,
      winner,
      turns,
      duration,
      toolCalls: [...this.toolCalls],
      startTime: this.startTime,
      endTime: this.endTime > 0 ? this.endTime : Date.now(),
    };
  }

  /**
   * Reset collector for reuse.
   */
  reset(): void {
    this.config = null;
    this.startTime = 0;
    this.endTime = 0;
    this.toolCalls = [];
    this.currentPhase = null;
    this.pendingToolCalls.clear();
    this.gameResult = null;

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.reset();
  }
}

