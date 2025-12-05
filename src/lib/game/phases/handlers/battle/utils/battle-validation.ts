/**
 * Battle Validation
 *
 * Centralized validation logic for battles.
 */

import { Faction, TerritoryId, type GameState } from "../../../../types";
import { isBattleCapable } from "./battle-utils";
import type { CurrentBattle, PendingBattle } from "../../../types";

/**
 * Result of battle validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate that a battle choice is valid.
 */
export function validateBattleChoice(
  state: GameState,
  battle: PendingBattle,
  aggressor: Faction
): ValidationResult {
  const errors: string[] = [];

  // Check that aggressor is in the battle
  if (!battle.factions.includes(aggressor)) {
    errors.push(`Aggressor ${aggressor} is not a participant in this battle`);
  }

  // Check that Bene Gesserit has fighters if they are the aggressor
  if (aggressor === Faction.BENE_GESSERIT) {
    if (!isBattleCapable(state, aggressor, battle.territoryId, battle.sector)) {
      errors.push(
        `Bene Gesserit cannot battle with only advisors (no fighters) in ${battle.territoryId}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that Bene Gesserit can battle in a territory/sector.
 */
export function validateBGCanBattle(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): boolean {
  return isBattleCapable(state, Faction.BENE_GESSERIT, territoryId, sector);
}

/**
 * Validate battle setup.
 */
export function validateBattleSetup(
  battle: CurrentBattle | null,
  state: GameState
): ValidationResult {
  const errors: string[] = [];

  if (!battle) {
    errors.push("Battle is null");
    return { valid: false, errors };
  }

  // Validate that both factions have battle-capable forces
  if (
    !isBattleCapable(state, battle.aggressor, battle.territoryId, battle.sector)
  ) {
    errors.push(
      `Aggressor ${battle.aggressor} has no battle-capable forces in ${battle.territoryId}`
    );
  }

  if (
    !isBattleCapable(state, battle.defender, battle.territoryId, battle.sector)
  ) {
    errors.push(
      `Defender ${battle.defender} has no battle-capable forces in ${battle.territoryId}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

