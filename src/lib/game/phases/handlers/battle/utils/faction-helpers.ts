/**
 * Faction Helpers
 *
 * Common faction-related queries and operations.
 * Eliminates repeated patterns for opponent detection, ally checks, etc.
 */

import { Faction, type GameState } from "../../../../types";
import { getAlly } from "../../../../state";
import type { CurrentBattle } from "../../../types";

/**
 * Get the opponent of a faction in a battle.
 */
export function getOpponentInBattle(
  faction: Faction,
  battle: CurrentBattle
): Faction {
  return faction === battle.aggressor ? battle.defender : battle.aggressor;
}

/**
 * Check if a faction is a participant in a battle (aggressor or defender).
 */
export function isParticipantInBattle(
  faction: Faction,
  battle: CurrentBattle
): boolean {
  return faction === battle.aggressor || faction === battle.defender;
}

/**
 * Check if a faction's ally is in the battle.
 */
export function isAllyInBattle(
  state: GameState,
  faction: Faction,
  battle: CurrentBattle
): boolean {
  const ally = getAlly(state, faction);
  if (!ally) return false;

  return (
    battle.aggressor === ally || battle.defender === ally
  );
}

/**
 * Get the ally if they are in the battle.
 */
export function getAllyInBattle(
  state: GameState,
  faction: Faction,
  battle: CurrentBattle
): Faction | null {
  const ally = getAlly(state, faction);
  if (!ally) return null;

  return battle.aggressor === ally || battle.defender === ally ? ally : null;
}

/**
 * Get the opponent of a faction's ally in a battle.
 * Returns null if faction or ally is not in battle.
 */
export function getAllyOpponent(
  state: GameState,
  faction: Faction,
  battle: CurrentBattle
): Faction | null {
  const ally = getAllyInBattle(state, faction, battle);
  if (!ally) return null;

  return getOpponentInBattle(ally, battle);
}

/**
 * Check if a faction has an ally in the battle.
 */
export function hasAllyInBattle(
  state: GameState,
  faction: Faction,
  battle: CurrentBattle
): boolean {
  return isAllyInBattle(state, faction, battle);
}

/**
 * Determine if a faction is the aggressor in a battle.
 */
export function isAggressor(
  faction: Faction,
  battle: CurrentBattle
): boolean {
  return faction === battle.aggressor;
}

/**
 * Determine if a faction is the defender in a battle.
 */
export function isDefender(
  faction: Faction,
  battle: CurrentBattle
): boolean {
  return faction === battle.defender;
}

