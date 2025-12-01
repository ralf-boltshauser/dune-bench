/**
 * Agent Activity Toast Handlers
 * 
 * Handles toast notifications for agent activity events
 */

import toast from 'react-hot-toast';
import type { StreamEvent } from '@/lib/game/stream/types';
import type {
  AgentThinkingData,
  AgentToolCallData,
  AgentToolResultData,
  AgentDecisionData,
} from '@/lib/game/stream/types';
import { getFactionName, generateToastId, TOAST_DURATIONS, getFactionToastStyle } from './helpers';
import type { Faction } from '@/lib/game/types';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle agent thinking event - shows loading toast
 */
export function handleAgentThinking(event: StreamEvent<AgentThinkingData>): void {
  try {
    const { faction } = event.data;
    toast.loading(`${getFactionName(faction)} is thinking...`, {
      id: generateToastId('agent-thinking', faction, event.id),
      duration: Infinity, // Will be dismissed by decision toast
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling agent thinking:', error);
  }
}

/**
 * Handle agent tool call event
 */
export function handleAgentToolCall(event: StreamEvent<AgentToolCallData>): void {
  try {
    const { faction, toolName } = event.data;
    toast(`${getFactionName(faction)} used ${toolName}`, {
      id: generateToastId('agent-tool', faction, event.id),
      icon: '🔧',
      duration: TOAST_DURATIONS.MEDIUM,
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling agent tool call:', error);
  }
}

/**
 * Handle agent tool result event - dismisses thinking toast
 */
export function handleAgentToolResult(event: StreamEvent<AgentToolResultData>): void {
  try {
    const { faction } = event.data;
    // Dismiss the thinking toast if it exists
    toast.dismiss(generateToastId('agent-thinking', faction, event.id));
  } catch (error) {
    console.error('[Toast] Error handling agent tool result:', error);
  }
}

/**
 * Handle agent decision event - dismisses thinking and shows success
 */
export function handleAgentDecision(event: StreamEvent<AgentDecisionData>): void {
  try {
    const { faction, actionType } = event.data;
    
    // Dismiss any loading toast for this faction
    const thinkingToastId = generateToastId('agent-thinking', faction, event.id);
    toast.dismiss(thinkingToastId);
    
    toast.success(`${getFactionName(faction)}: ${actionType}`, {
      id: generateToastId('agent-decision', faction, event.id),
      duration: TOAST_DURATIONS.LONG,
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling agent decision:', error);
  }
}

