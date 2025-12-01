/**
 * State Change Toast Handlers
 * 
 * Handles toast notifications for state delta events
 */

import toast from 'react-hot-toast';
import type { StreamEvent } from '@/lib/game/stream/types';
import type {
  FactionSpiceChangedData,
  FactionForcesChangedData,
  FactionCardAddedData,
  FactionCardRemovedData,
  FactionLeaderStatusData,
  StormPositionChangedData,
  SpiceBoardChangedData,
  AllianceChangedData,
} from '@/lib/game/stream/types';
import {
  getFactionName,
  generateToastId,
  formatDelta,
  TOAST_DURATIONS,
  getFactionToastStyle,
} from './helpers';
import type { Faction } from '@/lib/game/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const LEADER_STATUS_MESSAGES: Record<string, string> = {
  killed: 'was killed',
  captured: 'was captured',
  revived: 'was revived',
  returned: 'was returned',
} as const;

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle faction spice changed event
 */
export function handleFactionSpiceChanged(
  event: StreamEvent<FactionSpiceChangedData>
): void {
  try {
    const { faction, oldValue, newValue } = event.data;
    const delta = newValue - oldValue;
    const deltaText = formatDelta(delta);
    
    toast(`${getFactionName(faction)}: ${deltaText} spice (${newValue} total)`, {
      id: generateToastId('spice', faction, event.id),
      icon: delta > 0 ? '💰' : '💸',
      duration: TOAST_DURATIONS.MEDIUM,
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling faction spice changed:', error);
  }
}

/**
 * Handle faction forces changed event
 */
export function handleFactionForcesChanged(
  event: StreamEvent<FactionForcesChangedData>
): void {
  try {
    const { faction, territory, regularDelta, eliteDelta } = event.data;
    const totalDelta = regularDelta + eliteDelta;
    
    // Skip if no net change
    if (totalDelta === 0) return;
    
    const deltaText = formatDelta(totalDelta);
    toast(`${getFactionName(faction)}: ${deltaText} forces in ${territory}`, {
      id: generateToastId('forces', `${faction}-${territory}`, event.id),
      icon: totalDelta > 0 ? '⚔️' : '💀',
      duration: TOAST_DURATIONS.MEDIUM,
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling faction forces changed:', error);
  }
}

/**
 * Handle faction card added event
 */
export function handleFactionCardAdded(
  event: StreamEvent<FactionCardAddedData>
): void {
  try {
    const { faction } = event.data;
    toast(`${getFactionName(faction)} gained a card`, {
      id: generateToastId('card-added', faction, event.id),
      icon: '🃏',
      duration: TOAST_DURATIONS.SHORT,
      ...getFactionToastStyle(faction as Faction),
    });
  } catch (error) {
    console.error('[Toast] Error handling faction card added:', error);
  }
}

/**
 * Handle faction card removed event
 * Only shows if it's an important removal (not just discarding)
 */
export function handleFactionCardRemoved(
  event: StreamEvent<FactionCardRemovedData>
): void {
  try {
    const { faction, reason } = event.data;
    // Only show if it's an important removal (not just discarding)
    if (reason && !reason.toLowerCase().includes('discard')) {
      toast(`${getFactionName(faction)} lost a card`, {
        id: generateToastId('card-removed', faction, event.id),
        icon: '🗑️',
        duration: TOAST_DURATIONS.SHORT,
        ...getFactionToastStyle(faction as Faction),
      });
    }
  } catch (error) {
    console.error('[Toast] Error handling faction card removed:', error);
  }
}

/**
 * Handle faction leader status event
 */
export function handleFactionLeaderStatus(
  event: StreamEvent<FactionLeaderStatusData>
): void {
  try {
    const { faction, leaderId, newStatus } = event.data;
    const statusKey = newStatus.toLowerCase();
    const message = LEADER_STATUS_MESSAGES[statusKey];
    
    if (message) {
      toast(`${getFactionName(faction)} leader ${message}`, {
        id: generateToastId('leader', `${faction}-${leaderId}`, event.id),
        icon: statusKey === 'killed' ? '💀' : '👤',
        duration: TOAST_DURATIONS.LONG,
        ...getFactionToastStyle(faction as Faction),
      });
    }
  } catch (error) {
    console.error('[Toast] Error handling faction leader status:', error);
  }
}

/**
 * Handle storm position changed event
 */
export function handleStormPositionChanged(
  event: StreamEvent<StormPositionChangedData>
): void {
  try {
    const { oldSector, newSector, movement } = event.data;
    toast(`Storm moved ${movement} sectors (${oldSector} → ${newSector})`, {
      id: generateToastId('storm', String(newSector), event.id),
      icon: '🌪️',
      duration: TOAST_DURATIONS.LONG,
    });
  } catch (error) {
    console.error('[Toast] Error handling storm position changed:', error);
  }
}

/**
 * Handle spice board changed event
 */
export function handleSpiceBoardChanged(
  event: StreamEvent<SpiceBoardChangedData>
): void {
  try {
    const { territory, amount, action } = event.data;
    
    if (action === 'added') {
      toast(`${amount} spice appeared in ${territory}`, {
        id: generateToastId('spice-board', territory, event.id),
        icon: '✨',
        duration: TOAST_DURATIONS.MEDIUM,
      });
    }
  } catch (error) {
    console.error('[Toast] Error handling spice board changed:', error);
  }
}

/**
 * Handle alliance changed event
 */
export function handleAllianceChanged(
  event: StreamEvent<AllianceChangedData>
): void {
  try {
    const { type, factions } = event.data;
    const factionNames = factions.map(getFactionName).join(' & ');
    
    // For alliances, use the first faction's color (or a gradient if multiple)
    // For simplicity, we'll use the first faction's color
    const primaryFaction = factions[0] as Faction;
    
    if (type === 'formed') {
      toast.success(`Alliance formed: ${factionNames}`, {
        id: generateToastId('alliance', type, event.id),
        duration: TOAST_DURATIONS.EXTRA_LONG,
        ...getFactionToastStyle(primaryFaction),
      });
    } else {
      toast.error(`Alliance broken: ${factionNames}`, {
        id: generateToastId('alliance', type, event.id),
        duration: TOAST_DURATIONS.EXTRA_LONG,
        ...getFactionToastStyle(primaryFaction),
      });
    }
  } catch (error) {
    console.error('[Toast] Error handling alliance changed:', error);
  }
}

