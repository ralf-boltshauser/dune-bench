/**
 * API route to start a new game session
 */

import { gameSessionManager } from "@/lib/game/stream/game-session-manager";
import { Faction, Phase } from "@/lib/game/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * Convert string faction names to Faction enum values
 * Handles both enum values and string names (like CLI)
 */
function parseFactions(input: unknown): Faction[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [Faction.ATREIDES, Faction.HARKONNEN];
  }

  // Map of lowercase string names to Faction enum values
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

  // Valid Faction enum values for validation
  const validFactions = new Set(Object.values(Faction));

  const parsed: Faction[] = [];

  for (const item of input) {
    // If it's already a valid Faction enum value, use it directly
    if (validFactions.has(item as Faction)) {
      parsed.push(item as Faction);
      continue;
    }

    // Otherwise, try to map from string name
    const key = String(item).toLowerCase();
    const faction = factionNameMap[key];

    if (faction) {
      parsed.push(faction);
    } else {
      console.warn(`Unknown faction: ${item}, skipping`);
    }
  }

  // Ensure we have at least 2 factions
  if (parsed.length < 2) {
    console.warn("Less than 2 valid factions, using defaults");
    return [Faction.ATREIDES, Faction.HARKONNEN];
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const factions = parseFactions(body.factions);

    console.log("[API] Parsed factions:", factions);

    // Create a new game session
    console.log("[API] Creating game session...");
    const gameId = gameSessionManager.createSession({
      factions,
      maxTurns: 1, // Just 1 turn for demo
      onlyPhases: [Phase.SETUP], // Only run setup phase for demo
      agentConfig: {
        verbose: false, // Reduce console noise
      },
    });
    console.log("[API] Game session created:", gameId);

    return NextResponse.json({
      success: true,
      gameId,
      message: "Game started",
    });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
