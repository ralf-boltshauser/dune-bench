/**
 * API route to resume a game from saved state
 */

import { gameSessionManager } from '@/lib/game/stream/game-session-manager';
import { gameStore } from '@/lib/game/stream/game-store';
import { WrapperEvent } from '@/lib/game/stream/types';
import { deserializeGameState } from '@/lib/game/state/serialize';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Check if game already has an active session
    const existingSession = gameSessionManager.getSession(gameId);
    if (existingSession) {
      const status = existingSession.status;
      if (status === 'running' || status === 'created') {
        return NextResponse.json(
          {
            success: false,
            error: 'Game is already running',
            status,
          },
          { status: 400 }
        );
      }
    }

    // Try to load state (will use fallback to recover from events if needed)
    let state = await gameStore.loadState(gameId);
    
    // If not in store, try to recover from events (same logic as GET route)
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
              const serialized = JSON.stringify(eventData.state);
              state = deserializeGameState(serialized);
              
              // Save it for future use
              if (state) {
                await gameStore.saveState(gameId, state).catch((error) => {
                  console.warn(`[Resume API] Failed to save recovered state:`, error);
                });
                console.log(`[Resume API] Recovered game state from last GAME_STATE_UPDATE event for ${gameId}`);
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error(`[Resume API] Error trying to recover state from events:`, error);
      }
    }
    
    // If still no state, return error
    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: 'No saved game state found and could not recover from events',
        },
        { status: 404 }
      );
    }

    // Check if game is completed
    if (state.winner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game is already completed',
        },
        { status: 400 }
      );
    }

    // Resume the game
    const resumed = await gameSessionManager.resumeGameFromState(gameId);
    if (!resumed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to resume game',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gameId,
      message: 'Game resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

