/**
 * API route to create a new game session
 */

import { gameSessionManager } from '@/lib/game/stream/game-session-manager';
import { Faction } from '@/lib/game/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Convert string faction names to Faction enum values
 */
function parseFactions(input: unknown): Faction[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [Faction.ATREIDES, Faction.HARKONNEN];
  }

  const factionNameMap: Record<string, Faction> = {
    atreides: Faction.ATREIDES,
    harkonnen: Faction.HARKONNEN,
    emperor: Faction.EMPEROR,
    fremen: Faction.FREMEN,
    guild: Faction.SPACING_GUILD,
    spacing_guild: Faction.SPACING_GUILD,
    bg: Faction.BENE_GESSERIT,
    bene_gesserit: Faction.BENE_GESSERIT,
  };

  const validFactions = new Set(Object.values(Faction));

  const parsed: Faction[] = [];

  for (const item of input) {
    if (validFactions.has(item as Faction)) {
      parsed.push(item as Faction);
      continue;
    }

    const key = String(item).toLowerCase();
    const faction = factionNameMap[key];

    if (faction) {
      parsed.push(faction);
    } else {
      console.warn(`Unknown faction: ${item}, skipping`);
    }
  }

  if (parsed.length < 2) {
    console.warn('Less than 2 valid factions, using defaults');
    return [Faction.ATREIDES, Faction.HARKONNEN];
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const factions = parseFactions(body.factions);
    const maxTurns = body.maxTurns ?? 10;

    console.log('[API] Creating game session with factions:', factions);

    const gameId = gameSessionManager.createSession({
      factions,
      maxTurns,
      agentConfig: {
        verbose: false,
      },
    });

    console.log('[API] Game session created:', gameId);

    return NextResponse.json({
      success: true,
      gameId,
      message: 'Game created successfully',
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

