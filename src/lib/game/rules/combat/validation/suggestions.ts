/**
 * Battle plan suggestions generation.
 */

import {
  getDefenseCards,
  getFactionState,
  getWeaponCards,
  hasCheapHero,
} from "../../../state";
import type { Faction, GameState, Leader } from "../../../types";
import type { BattlePlanSuggestion } from "../types";

/**
 * Generate battle plan suggestions for the agent.
 */
export function generateBattlePlanSuggestions(
  state: GameState,
  faction: Faction,
  forcesAvailable: number,
  leaders: Leader[]
): BattlePlanSuggestion[] {
  const suggestions: BattlePlanSuggestion[] = [];
  const factionState = getFactionState(state, faction);
  const weapons = getWeaponCards(state, faction);
  const defenses = getDefenseCards(state, faction);

  // Best leader + max forces
  if (leaders.length > 0) {
    const bestLeader = leaders.reduce((a, b) =>
      a.strength > b.strength ? a : b
    );
    suggestions.push({
      forcesDialed: forcesAvailable,
      leaderId: bestLeader.definitionId,
      weaponCardId: weapons[0]?.definitionId ?? null,
      defenseCardId: defenses[0]?.definitionId ?? null,
      estimatedStrength: forcesAvailable + bestLeader.strength,
      description: `Aggressive: ${bestLeader.definitionId} with ${forcesAvailable} forces`,
    });

    // Conservative - dial fewer forces
    if (forcesAvailable > 2) {
      const conservativeForces = Math.ceil(forcesAvailable / 2);
      suggestions.push({
        forcesDialed: conservativeForces,
        leaderId: bestLeader.definitionId,
        weaponCardId: weapons[0]?.definitionId ?? null,
        defenseCardId: defenses[0]?.definitionId ?? null,
        estimatedStrength: conservativeForces + bestLeader.strength,
        description: `Conservative: ${bestLeader.definitionId} with ${conservativeForces} forces`,
      });
    }
  }

  // Cheap Hero - can be played in lieu of a leader (battle.md line 12)
  // MANDATORY when no leaders available (battle.md line 190)
  if (hasCheapHero(state, faction)) {
    const isMandatory = leaders.length === 0;
    suggestions.push({
      forcesDialed: forcesAvailable,
      leaderId: null,
      weaponCardId: weapons[0]?.definitionId ?? null,
      defenseCardId: defenses[0]?.definitionId ?? null,
      estimatedStrength: forcesAvailable,
      description: `Cheap Hero with ${forcesAvailable} forces${
        isMandatory
          ? " (MANDATORY - no leaders available)"
          : " (optional - can be played in lieu of leader)"
      }`,
    });
  }

  return suggestions;
}

