/**
 * API route to start game execution
 */

import { gameSessionManager } from '@/lib/game/stream/game-session-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    const session = gameSessionManager.getSession(gameId);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game not found',
        },
        { status: 404 }
      );
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Game already completed',
        },
        { status: 400 }
      );
    }

    // Game is already running if session exists
    // This endpoint is mainly for future pause/resume functionality
    return NextResponse.json({
      success: true,
      message: 'Game is running',
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

