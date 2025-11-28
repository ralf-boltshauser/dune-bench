/**
 * API route to list all games
 */

import { gameStore } from '@/lib/game/stream/game-store';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const games = await gameStore.listGames();

    return NextResponse.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error('Error listing games:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

