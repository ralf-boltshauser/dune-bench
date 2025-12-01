/**
 * Event History Formatter
 * 
 * Formats events for display in the history log.
 * Reuses logic from toast handlers but returns formatted text instead of showing toasts.
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
import {
  getFactionName,
  formatPhaseName,
  formatDelta,
  IMPORTANT_PHASE_EVENTS,
} from './toast/helpers';

// =============================================================================
// TYPES
// =============================================================================

export interface HistoryEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  icon?: string;
  category: 'phase' | 'state' | 'agent' | 'lifecycle' | 'other';
}

// =============================================================================
// FORMATTERS
// =============================================================================

const LEADER_STATUS_MESSAGES: Record<string, string> = {
  killed: 'was killed',
  captured: 'was captured',
  revived: 'was revived',
  returned: 'was returned',
} as const;

/**
 * Format an event for history display
 */
export function formatEventForHistory(event: StreamEvent): HistoryEvent | null {
  // Skip connection events
  if (isConnectionEvent(event.type)) {
    return null;
  }

  const timestamp = event.timestamp || Date.now();
  const category = getEventCategory(event.type);

  try {
    switch (event.type) {
      // Agent activity events
      case AgentActivityEvent.AGENT_THINKING: {
        const { faction } = event.data as AgentThinkingData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)} is thinking...`,
          icon: '🤔',
          category,
        };
      }
      case AgentActivityEvent.AGENT_TOOL_CALL: {
        const { faction, toolName } = event.data as AgentToolCallData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)} used ${toolName}`,
          icon: '🔧',
          category,
        };
      }
      case AgentActivityEvent.AGENT_DECISION: {
        const { faction, actionType } = event.data as AgentDecisionData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)}: ${actionType}`,
          icon: '✅',
          category,
        };
      }

      // Phase events
      case TurnPhaseEvent.PHASE_STARTED: {
        const { phase, turn } = event.data as PhaseStartedData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `Turn ${turn}: ${formatPhaseName(phase)} Phase Started`,
          icon: '🎯',
          category,
        };
      }
      case TurnPhaseEvent.PHASE_ENDED: {
        const { phase } = event.data as PhaseEndedData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${formatPhaseName(phase)} Phase Ended`,
          icon: '✅',
          category,
        };
      }
      case TurnPhaseEvent.TURN_STARTED: {
        const { turn, maxTurns, stormOrder } = event.data as TurnStartedData;
        const orderText = stormOrder.map(getFactionName).join(' → ');
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `Turn ${turn}/${maxTurns} Started - Order: ${orderText}`,
          icon: '🔄',
          category,
        };
      }

      // Wrapped phase events
      case WrapperEvent.PHASE_EVENT: {
        const { event: phaseEvent } = event.data as PhaseEventData;
        const { type, message } = phaseEvent;
        
        if (IMPORTANT_PHASE_EVENTS.includes(type as typeof IMPORTANT_PHASE_EVENTS[number])) {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: message || type,
            icon: '📢',
            category,
          };
        }
        return null; // Skip unimportant phase events
      }

      // State change events
      case StateDeltaEvent.FACTION_SPICE_CHANGED: {
        const { faction, oldValue, newValue } = event.data as FactionSpiceChangedData;
        const delta = newValue - oldValue;
        const deltaText = formatDelta(delta);
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)}: ${deltaText} spice (${newValue} total)`,
          icon: delta > 0 ? '💰' : '💸',
          category,
        };
      }
      case StateDeltaEvent.FACTION_FORCES_CHANGED: {
        const { faction, territory, regularDelta, eliteDelta } = event.data as FactionForcesChangedData;
        const totalDelta = regularDelta + eliteDelta;
        
        // Skip if no net change
        if (totalDelta === 0) return null;
        
        const deltaText = formatDelta(totalDelta);
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)}: ${deltaText} forces in ${territory}`,
          icon: totalDelta > 0 ? '⚔️' : '💀',
          category,
        };
      }
      case StateDeltaEvent.FACTION_CARD_ADDED: {
        const { faction } = event.data as FactionCardAddedData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `${getFactionName(faction)} gained a card`,
          icon: '🃏',
          category,
        };
      }
      case StateDeltaEvent.FACTION_CARD_REMOVED: {
        const { faction, reason } = event.data as FactionCardRemovedData;
        // Only show if it's an important removal
        if (reason && !reason.toLowerCase().includes('discard')) {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: `${getFactionName(faction)} lost a card`,
            icon: '🗑️',
            category,
          };
        }
        return null;
      }
      case StateDeltaEvent.FACTION_LEADER_STATUS: {
        const { faction, newStatus } = event.data as FactionLeaderStatusData;
        const statusKey = newStatus.toLowerCase();
        const message = LEADER_STATUS_MESSAGES[statusKey];
        
        if (message) {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: `${getFactionName(faction)} leader ${message}`,
            icon: statusKey === 'killed' ? '💀' : '👤',
            category,
          };
        }
        return null;
      }
      case StateDeltaEvent.STORM_POSITION_CHANGED: {
        const { oldSector, newSector, movement } = event.data as StormPositionChangedData;
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: `Storm moved ${movement} sectors (${oldSector} → ${newSector})`,
          icon: '🌪️',
          category,
        };
      }
      case StateDeltaEvent.SPICE_BOARD_CHANGED: {
        const { territory, amount, action } = event.data as SpiceBoardChangedData;
        
        if (action === 'added') {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: `${amount} spice appeared in ${territory}`,
            icon: '✨',
            category,
          };
        }
        return null;
      }
      case StateDeltaEvent.ALLIANCE_CHANGED: {
        const { type, factions } = event.data as AllianceChangedData;
        const factionNames = factions.map(getFactionName).join(' & ');
        
        if (type === 'formed') {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: `Alliance formed: ${factionNames}`,
            icon: '🤝',
            category,
          };
        } else {
          return {
            id: event.id,
            timestamp,
            type: event.type,
            message: `Alliance broken: ${factionNames}`,
            icon: '💔',
            category,
          };
        }
      }

      // Game lifecycle events
      case GameLifecycleEvent.GAME_STARTED:
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: 'Game Started!',
          icon: '🎮',
          category,
        };
      case GameLifecycleEvent.GAME_COMPLETED: {
        const data = event.data as {
          result?: { winner?: { winners?: string[] } };
        };
        const winners = data?.result?.winner?.winners || [];
        const winnerText =
          winners.length > 0
            ? `Game Completed - Winner: ${winners.map(getFactionName).join(', ')}`
            : 'Game Completed';
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: winnerText,
          icon: '🏆',
          category,
        };
      }

      default:
        // For unknown events, show a basic message
        return {
          id: event.id,
          timestamp,
          type: event.type,
          message: event.type,
          icon: '📌',
          category,
        };
    }
  } catch (error) {
    console.error('[EventHistory] Error formatting event:', error, event);
    return {
      id: event.id,
      timestamp,
      type: event.type,
      message: `Event: ${event.type}`,
      icon: '❓',
      category,
    };
  }
}

/**
 * Get event category for styling
 */
function getEventCategory(eventType: string): HistoryEvent['category'] {
  if (eventType.startsWith('AGENT_')) {
    return 'agent';
  }
  if (eventType.includes('PHASE') || eventType.includes('TURN')) {
    return 'phase';
  }
  if (eventType.startsWith('FACTION_') || eventType.includes('STORM') || eventType.includes('SPICE') || eventType.includes('ALLIANCE')) {
    return 'state';
  }
  if (eventType.startsWith('GAME_')) {
    return 'lifecycle';
  }
  return 'other';
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

