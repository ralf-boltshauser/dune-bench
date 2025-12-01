"use client";

import { useMemo } from "react";
import type { StreamEvent } from "@/lib/game/stream/types";
import {
  formatEventForHistory,
  formatTimestamp,
  type HistoryEvent,
} from "../../utils/eventHistoryFormatter";

// =============================================================================
// TYPES
// =============================================================================

interface EventHistoryProps {
  events: StreamEvent[];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Event History Component
 * 
 * Displays a scrollable history log of game events.
 * Most recent events appear at the top.
 */
export default function EventHistory({ events }: EventHistoryProps) {
  // Format events for display, most recent first
  const historyEvents = useMemo(() => {
    const formatted: HistoryEvent[] = [];
    
    // Process events in reverse order (newest first)
    for (let i = events.length - 1; i >= 0; i--) {
      const formattedEvent = formatEventForHistory(events[i]);
      if (formattedEvent) {
        formatted.push(formattedEvent);
      }
    }
    
    return formatted;
  }, [events]);

  if (historyEvents.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm">No events yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-slate-200 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Event History</h3>
        <p className="text-xs text-slate-500 font-medium">
          {historyEvents.length} event{historyEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0">
        {historyEvents.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EVENT ITEM COMPONENT
// =============================================================================

interface EventItemProps {
  event: HistoryEvent;
}

function EventItem({ event }: EventItemProps) {
  const categoryColors: Record<HistoryEvent['category'], { bg: string; border: string; text: string }> = {
    phase: { bg: 'bg-blue-50/80', border: 'border-blue-200/60', text: 'text-blue-900' },
    state: { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', text: 'text-emerald-900' },
    agent: { bg: 'bg-purple-50/80', border: 'border-purple-200/60', text: 'text-purple-900' },
    lifecycle: { bg: 'bg-amber-50/80', border: 'border-amber-200/60', text: 'text-amber-900' },
    other: { bg: 'bg-slate-50/80', border: 'border-slate-200/60', text: 'text-slate-900' },
  };

  const categoryColor = categoryColors[event.category] || categoryColors.other;

  return (
    <div
      className={`
        p-3.5 rounded-lg border text-sm shadow-sm
        ${categoryColor.bg} ${categoryColor.border}
        transition-all duration-200 hover:shadow-md hover:scale-[1.01]
      `}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        {event.icon && (
          <span className="text-base flex-shrink-0 mt-0.5">{event.icon}</span>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${categoryColor.text} font-medium break-words leading-relaxed`}>
            {event.message}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            {formatTimestamp(event.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

