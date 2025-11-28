/**
 * API route to get full game state
 */

import { gameStore } from '@/lib/game/stream/game-store';
import { gameSessionManager } from '@/lib/game/stream/game-session-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Get game state from store
    const state = await gameStore.loadState(gameId);
    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game not found',
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

    return NextResponse.json({
      success: true,
      gameId,
      status,
      state,
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

