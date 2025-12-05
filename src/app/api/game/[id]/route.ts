/**
 * API route to get full game state
 */

import { gameStore } from '@/lib/game/stream/game-store';
import { gameSessionManager } from '@/lib/game/stream/game-session-manager';
import { NextRequest, NextResponse } from 'next/server';
import { serializeGameState } from '@/lib/game/state/serialize';
import { deserializeGameState } from '@/lib/game/state/serialize';
import { WrapperEvent } from '@/lib/game/stream/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Try to get game state from store first (persisted)
    let state = await gameStore.loadState(gameId);
    
    // If not in store, try to get from active session
    if (!state) {
      const session = gameSessionManager.getSession(gameId);
      if (session?.gameRunner) {
        state = session.gameRunner.getState();
      }
    }
    
    // If still not found, try to extract from last GAME_STATE_UPDATE event
    if (!state) {
      try {
        const allEvents = await gameStore.getAllEvents(gameId);
        // Find the last GAME_STATE_UPDATE event (search backwards for efficiency)
        for (let i = allEvents.length - 1; i >= 0; i--) {
          const event = allEvents[i];
          if (event.type === WrapperEvent.GAME_STATE_UPDATE) {
            const eventData = event.data as { gameId: string; state: unknown };
            if (eventData?.state) {
              // Deserialize the state from the event
              // eventData.state is already a serialized object (Maps as {__type: 'Map', entries: [...]})
              // We need to stringify it first, then deserialize
              const serialized = JSON.stringify(eventData.state);
              state = deserializeGameState(serialized);
              
              // Save it for future use
              if (state) {
                await gameStore.saveState(gameId, state).catch((error) => {
                  console.warn(`[API] Failed to save recovered state:`, error);
                });
                console.log(`[API] Recovered game state from last GAME_STATE_UPDATE event for ${gameId}`);
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error(`[API] Error trying to recover state from events:`, error);
      }
    }
    
    // If still not found, return 404
    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game not found or state not available yet',
        },
        { status: 404 }
      );
    }

    // Get metadata
    const metadata = await gameStore.getGameMetadata(gameId);
    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game metadata not found',
        },
        { status: 404 }
      );
    }

    // Get last event ID
    const lastEventId = (await gameStore.getLastEventId(gameId)) ?? '';

    // Get session status
    const session = gameSessionManager.getSession(gameId);
    const status = session
      ? session.status
      : state.winner
        ? 'completed'
        : 'paused';

    // Serialize state to JSON-compatible format (Maps become {__type: 'Map', entries: [...]})
    // This ensures Maps are properly serialized for JSON response
    const serializedState = JSON.parse(serializeGameState(state));

    return NextResponse.json({
      success: true,
      gameId,
      status,
      state: serializedState,
      lastEventId,
      metadata: {
        factions: metadata.factions,
        createdAt: metadata.createdAt,
        turn: metadata.turn,
        phase: metadata.phase,
        winner: metadata.winner,
      },
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

