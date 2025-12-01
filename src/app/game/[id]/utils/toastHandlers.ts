/**
 * Toast Handlers for Game Events
 * 
 * Main router that dispatches events to appropriate toast handlers.
 * This module orchestrates all toast notifications for:
 * - Agent activity events
 * - Phase events  
 * - State changes
 * - Game lifecycle events
 * 
 * @example
 * ```ts
 * import { handleEventToast } from './utils/toastHandlers';
 * 
 * events.forEach(event => {
 *   handleEventToast(event);
 * });
 * ```
 */

import type { StreamEvent } from '@/lib/game/stream/types';
import {
  AgentActivityEvent,
  TurnPhaseEvent,
  StateDeltaEvent,
  GameLifecycleEvent,
  WrapperEvent,
  isConnectionEvent,
} from '@/lib/game/stream/types';
import type {
  AgentThinkingData,
  AgentToolCallData,
  AgentToolResultData,
  AgentDecisionData,
  PhaseStartedData,
  PhaseEndedData,
  TurnStartedData,
  FactionSpiceChangedData,
  FactionForcesChangedData,
  FactionCardAddedData,
  FactionCardRemovedData,
  FactionLeaderStatusData,
  StormPositionChangedData,
  SpiceBoardChangedData,
  AllianceChangedData,
  PhaseEventData,
} from '@/lib/game/stream/types';

// Import handlers
import {
  handleAgentThinking,
  handleAgentToolCall,
  handleAgentToolResult,
  handleAgentDecision,
} from './toast/agent-handlers';
import {
  handlePhaseStarted,
  handlePhaseEnded,
  handleTurnStarted,
  handlePhaseEvent,
} from './toast/phase-handlers';
import {
  handleFactionSpiceChanged,
  handleFactionForcesChanged,
  handleFactionCardAdded,
  handleFactionCardRemoved,
  handleFactionLeaderStatus,
  handleStormPositionChanged,
  handleSpiceBoardChanged,
  handleAllianceChanged,
} from './toast/state-handlers';
import {
  handleGameStarted,
  handleGameCompleted,
} from './toast/lifecycle-handlers';

// =============================================================================
// MAIN ROUTER
// =============================================================================

/**
 * Route event to appropriate toast handler
 * 
 * Skips connection events and heartbeats. Uses type-safe routing
 * to dispatch to the correct handler based on event type.
 * 
 * @param event - Stream event to process
 * @returns void
 * 
 * @example
 * ```ts
 * handleEventToast({
 *   type: 'PHASE_STARTED',
 *   data: { phase: 'STORM_PHASE', turn: 1 },
 *   // ... other fields
 * });
 * ```
 */
export function handleEventToast(event: StreamEvent): void {
  // Skip connection events and heartbeats - these are not user-facing
  if (isConnectionEvent(event.type)) {
    return;
  }
  
  // Route by event type with type-safe handlers
  switch (event.type) {
    // Agent activity events
    case AgentActivityEvent.AGENT_THINKING:
      handleAgentThinking(event as StreamEvent<AgentThinkingData>);
      break;
    case AgentActivityEvent.AGENT_TOOL_CALL:
      handleAgentToolCall(event as StreamEvent<AgentToolCallData>);
      break;
    case AgentActivityEvent.AGENT_TOOL_RESULT:
      handleAgentToolResult(event as StreamEvent<AgentToolResultData>);
      break;
    case AgentActivityEvent.AGENT_DECISION:
      handleAgentDecision(event as StreamEvent<AgentDecisionData>);
      break;
    
    // Phase events
    case TurnPhaseEvent.PHASE_STARTED:
      handlePhaseStarted(event as StreamEvent<PhaseStartedData>);
      break;
    case TurnPhaseEvent.PHASE_ENDED:
      handlePhaseEnded(event as StreamEvent<PhaseEndedData>);
      break;
    case TurnPhaseEvent.TURN_STARTED:
      handleTurnStarted(event as StreamEvent<TurnStartedData>);
      break;
    
    // Wrapped phase events
    case WrapperEvent.PHASE_EVENT:
      handlePhaseEvent(event as StreamEvent<PhaseEventData>);
      break;
    
    // State change events
    case StateDeltaEvent.FACTION_SPICE_CHANGED:
      handleFactionSpiceChanged(event as StreamEvent<FactionSpiceChangedData>);
      break;
    case StateDeltaEvent.FACTION_FORCES_CHANGED:
      handleFactionForcesChanged(event as StreamEvent<FactionForcesChangedData>);
      break;
    case StateDeltaEvent.FACTION_CARD_ADDED:
      handleFactionCardAdded(event as StreamEvent<FactionCardAddedData>);
      break;
    case StateDeltaEvent.FACTION_CARD_REMOVED:
      handleFactionCardRemoved(event as StreamEvent<FactionCardRemovedData>);
      break;
    case StateDeltaEvent.FACTION_LEADER_STATUS:
      handleFactionLeaderStatus(event as StreamEvent<FactionLeaderStatusData>);
      break;
    case StateDeltaEvent.STORM_POSITION_CHANGED:
      handleStormPositionChanged(event as StreamEvent<StormPositionChangedData>);
      break;
    case StateDeltaEvent.SPICE_BOARD_CHANGED:
      handleSpiceBoardChanged(event as StreamEvent<SpiceBoardChangedData>);
      break;
    case StateDeltaEvent.ALLIANCE_CHANGED:
      handleAllianceChanged(event as StreamEvent<AllianceChangedData>);
      break;
    
    // Game lifecycle events
    case GameLifecycleEvent.GAME_STARTED:
      handleGameStarted(event);
      break;
    case GameLifecycleEvent.GAME_COMPLETED:
      handleGameCompleted(event);
      break;
    
    default:
      // Silently ignore unknown events - this is expected for new event types
      // that don't need toast notifications
      break;
  }
}
