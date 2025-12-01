/**
 * SSE Endpoint - Game-specific event streaming
 *
 * Streams events for a specific game with reconnection support.
 *
 * Query params:
 * - lastEventId: Resume from this event ID (for reconnection)
 *
 * Features:
 * - Game-specific event filtering
 * - Reconnection with missed event replay
 * - Periodic heartbeat (30s)
 * - Proper cleanup on disconnect
 */

import { NextRequest } from 'next/server';
import { eventStreamer } from '@/lib/game/stream/event-streamer';
import { ConnectionEvent, type StreamEvent } from '@/lib/game/stream/types';
import { generateEventId } from '@/lib/game/stream/utils/id-generator';
import { fileStore } from '@/lib/game/stream/persistence';

// =============================================================================
// CONFIGURATION
// =============================================================================

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// =============================================================================
// SSE HELPERS
// =============================================================================

/**
 * Create SSE-formatted message
 */
function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create a connection event
 */
function createConnectionEvent(
  type: ConnectionEvent,
  gameId: string,
  data: Record<string, unknown>
): StreamEvent {
  return {
    id: generateEventId(),
    type,
    gameId,
    timestamp: Date.now(),
    data,
    seq: 0, // Connection events don't participate in game sequence
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const lastEventId = searchParams.get('lastEventId') || undefined;

  // Track if stream is still active
  let isActive = true;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      /**
       * Check if controller is still open
       */
      const isControllerOpen = (): boolean => {
        try {
          // Try to check controller state - if it's closed, accessing it will throw
          // We can't directly check state, but we can catch errors when enqueueing
          return isActive;
        } catch {
          return false;
        }
      };

      /**
       * Send data to the client (with error handling)
       */
      const send = (data: string): boolean => {
        if (!isActive) return false;

        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error: unknown) {
          // Controller is closed or in invalid state
          const err = error as { code?: string; message?: string };
          if (err?.code === 'ERR_INVALID_STATE' || err?.message?.includes('closed')) {
            // Silently ignore - controller was closed (client disconnected)
            isActive = false;
            return false;
          }
          console.error(`[SSE:${gameId}] Error sending data:`, error);
          isActive = false;
          return false;
        }
      };

      /**
       * Send an event to the client
       */
      const sendEvent = (event: StreamEvent): boolean => {
        return send(formatSSE(event));
      };

      // Send CONNECTED event
      const connectedEvent = createConnectionEvent(
        ConnectionEvent.CONNECTED,
        gameId,
        {
          message: 'Stream connected',
          gameId,
          reconnected: !!lastEventId,
        }
      );
      sendEvent(connectedEvent);

      // CRITICAL: Subscribe FIRST to catch live events immediately
      // This ensures we don't miss events emitted during replay
      try {
        const subscription = await eventStreamer.subscribeToGame(
          gameId,
          (event) => {
            if (isActive) {
              const sent = sendEvent(event);
              if (!sent) {
                // Failed to send, unsubscribe to prevent further attempts
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
              }
            }
          },
          lastEventId
        );
        unsubscribe = subscription.unsubscribe;
        console.log(`[SSE:${gameId}] Subscribed to live events${lastEventId ? ` (resuming from ${lastEventId})` : ''}`);
      } catch (error) {
        console.error(`[SSE:${gameId}] Failed to subscribe:`, error);
      }

      // If no lastEventId, replay all events from the beginning
      // This ensures setup phase events are visible even if the UI connects late
      // NOTE: We do this AFTER subscribing so live events aren't missed during replay
      if (!lastEventId) {
        try {
          const allEvents = await fileStore.getAllEvents(gameId);
          console.log(`[SSE:${gameId}] Replaying ${allEvents.length} past events for new connection`);
          
          // Send all past events in order
          // These are events that were persisted before we subscribed
          // Check isActive before each send to avoid sending after disconnect
          for (const event of allEvents) {
            if (!isActive) {
              // Client disconnected during replay, stop sending
              break;
            }
            const sent = sendEvent(event);
            if (!sent) {
              // Failed to send (controller closed), stop replay
              break;
            }
          }
        } catch (error) {
          console.error(`[SSE:${gameId}] Failed to replay events:`, error);
          // Continue anyway - subscription will still work for new events
        }
      }

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        if (!isActive) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        const heartbeatEvent = createConnectionEvent(
          ConnectionEvent.HEARTBEAT,
          gameId,
          { timestamp: Date.now() }
        );
        sendEvent(heartbeatEvent);
      }, HEARTBEAT_INTERVAL_MS);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE:${gameId}] Client disconnected`);
        isActive = false;

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        try {
          controller.close();
        } catch {
          // Stream might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
