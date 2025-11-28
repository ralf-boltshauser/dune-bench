/**
 * SSE Endpoint - Global event streaming
 *
 * Streams all game events (optionally filtered by gameId).
 *
 * DEPRECATED: Prefer using /api/game/[id]/stream for game-specific streaming.
 * This endpoint is kept for backward compatibility and monitoring purposes.
 *
 * Query params:
 * - gameId: Optional filter for specific game
 */

import { NextRequest } from 'next/server';
import { eventStreamer } from '@/lib/game/stream/event-streamer';
import { ConnectionEvent, type StreamEvent } from '@/lib/game/stream/types';
import { generateEventId } from '@/lib/game/stream/utils/id-generator';

// =============================================================================
// CONFIGURATION
// =============================================================================

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// =============================================================================
// SSE HELPERS
// =============================================================================

function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function createConnectionEvent(
  gameId: string,
  data: Record<string, unknown>
): StreamEvent {
  return {
    id: generateEventId(),
    type: ConnectionEvent.CONNECTED,
    gameId,
    timestamp: Date.now(),
    data,
    seq: 0,
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId') || '';

  let isActive = true;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string): boolean => {
        if (!isActive) return false;

        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          console.error('[SSE:global] Error sending data:', error);
          isActive = false;
          return false;
        }
      };

      const sendEvent = (event: StreamEvent): boolean => {
        return send(formatSSE(event));
      };

      // Send CONNECTED event
      const connectedEvent = createConnectionEvent(gameId, {
        message: 'Global stream connected',
        gameId: gameId || 'all',
        deprecated: true,
        note: 'Use /api/game/[id]/stream for game-specific streaming',
      });
      sendEvent(connectedEvent);

      // Subscribe to all events
      const subscription = eventStreamer.subscribe((event) => {
        if (!isActive) return;

        // Filter by gameId if specified
        if (gameId && event.gameId !== gameId) {
          return;
        }

        sendEvent(event);
      });

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        if (!isActive) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        const heartbeatEvent: StreamEvent = {
          id: generateEventId(),
          type: ConnectionEvent.HEARTBEAT,
          gameId: gameId || 'global',
          timestamp: Date.now(),
          data: { timestamp: Date.now() },
          seq: 0,
        };
        sendEvent(heartbeatEvent);
      }, HEARTBEAT_INTERVAL_MS);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SSE:global] Client disconnected');
        isActive = false;

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        subscription.unsubscribe();

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
      'X-Accel-Buffering': 'no',
    },
  });
}
