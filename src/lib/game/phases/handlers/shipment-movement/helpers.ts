/**
 * Utility Functions for Shipment & Movement Phase
 *
 * Shared helper functions used across modules.
 */

import { Faction, type GameState } from "@/lib/game/types";
import { checkOrnithopterAccess } from "@/lib/game/rules";
import { normalizeTerritoryIdsInResponse } from "../../../utils/normalize-agent-response";

/**
 * Get storm order without Guild (Guild handled separately)
 */
export function getNonGuildStormOrder(stormOrder: Faction[]): Faction[] {
  return stormOrder.filter((f) => f !== Faction.SPACING_GUILD);
}

/**
 * Check ornithopter access for all factions at phase start
 * Rule: Ornithopter access requires forces in Arrakeen/Carthag at phase START
 */
export function checkOrnithopterAccessAtPhaseStart(
  state: GameState
): Set<Faction> {
  const access = new Set<Faction>();
  for (const faction of state.factions.keys()) {
    if (checkOrnithopterAccess(state, faction)) {
      access.add(faction);
    }
  }
  return access;
}

/**
 * Normalize territory IDs from agent response data
 * Wrapper around normalizeTerritoryIdsInResponse for convenience
 */
export function normalizeTerritoryIds(data: any): ReturnType<typeof normalizeTerritoryIdsInResponse> {
  return normalizeTerritoryIdsInResponse(data);
}

