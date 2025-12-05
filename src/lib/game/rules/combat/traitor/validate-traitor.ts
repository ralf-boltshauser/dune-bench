/**
 * Traitor validation logic.
 */

import { getFactionState } from "../../../state";
import { Faction, type GameState } from "../../../types";
import { createError, invalidResult, validResult, type ValidationResult } from "../../types";

/**
 * Check if a faction can call traitor on an opponent's leader.
 */
export function canCallTraitor(
  state: GameState,
  callingFaction: Faction,
  targetLeaderId: string
): ValidationResult<never> {
  const factionState = getFactionState(state, callingFaction);
  const hasTraitor = factionState.traitors.some(
    (t) => t.leaderId === targetLeaderId
  );

  if (!hasTraitor) {
    return invalidResult(
      [
        createError(
          "ABILITY_NOT_AVAILABLE",
          `You do not have a traitor card for ${targetLeaderId}`,
          { field: "targetLeaderId" }
        ),
      ],
      { traitorCardsHeld: factionState.traitors.length }
    );
  }

  return validResult({ canCallTraitor: true, targetLeaderId });
}

