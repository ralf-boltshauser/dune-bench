/**
 * Main battle plan validation orchestration.
 */

import { getLeaderDefinition } from "../../../data";
import {
  getAvailableLeaders,
  getDefenseCards,
  getFactionState,
  getForceCountInTerritory,
  getWeaponCards,
  hasCheapHero,
} from "../../../state";
import { getBGFightersInSector } from "../../../state/queries";
import {
  Faction,
  TerritoryId,
  type BattlePlan,
  type GameState,
} from "../../../types";
import {
  invalidResult,
  validResult,
  type ValidationError,
  type ValidationResult,
} from "../../types";
import type { BattlePlanSuggestion } from "../types";
import { generateBattlePlanSuggestions } from "./suggestions";
import {
  validateKwisatzHaderach,
  validateSpiceDialing,
} from "./validate-abilities";
import { validateTreacheryCards } from "./validate-cards";
import { validateForcesDialed } from "./validate-forces";
import {
  validateCheapHero,
  validateLeaderAvailability,
  validateLeaderHeroExclusivity,
  validateLeaderOrCheapHero,
} from "./validate-leaders";

/**
 * Validate a battle plan before submission.
 * Ensures all components are legal and available by delegating to
 * specific validators for forces, leaders, treachery cards, abilities, etc.
 *
 * @param sector Optional sector number. When provided, uses sector-specific force counting.
 *               This is important for Bene Gesserit to exclude advisors, and for territories
 *               where a faction may have forces in multiple sectors.
 */
export function validateBattlePlan(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  plan: BattlePlan,
  sector?: number
): ValidationResult<BattlePlanSuggestion> {
  const errors: ValidationError[] = [];
  const factionState = getFactionState(state, faction);

  // IMPORTANT: For Bene Gesserit, use getBGFightersInSector to exclude advisors when sector is provided
  // Advisors are non-combatants and shouldn't be counted as available forces
  const forcesInTerritory =
    sector !== undefined && faction === Faction.BENE_GESSERIT
      ? getBGFightersInSector(state, territoryId, sector)
      : sector !== undefined
      ? (() => {
          const forces = factionState.forces.onBoard.find(
            (f) => f.territoryId === territoryId && f.sector === sector
          );
          return forces ? forces.forces.regular + forces.forces.elite : 0;
        })()
      : getForceCountInTerritory(state, faction, territoryId);
  const availableLeaders = getAvailableLeaders(state, faction);
  const hasLeaders = availableLeaders.length > 0;
  const hasCheapHeroCard = hasCheapHero(state, faction);

  const context = {
    forcesInTerritory,
    availableLeaders: availableLeaders.map((l) => ({
      id: l.definitionId,
      strength: l.strength,
    })),
    hasLeaders,
    hasCheapHero: hasCheapHeroCard,
    weaponCardsInHand: getWeaponCards(state, faction).length,
    defenseCardsInHand: getDefenseCards(state, faction).length,
  };

  // Validate each aspect
  errors.push(...validateForcesDialed(plan, forcesInTerritory));
  errors.push(
    ...validateLeaderOrCheapHero(
      plan,
      hasLeaders,
      hasCheapHeroCard,
      availableLeaders
    )
  );
  errors.push(
    ...validateLeaderAvailability(
      plan,
      factionState,
      territoryId,
      availableLeaders
    )
  );
  errors.push(...validateCheapHero(plan, hasCheapHeroCard));
  errors.push(...validateLeaderHeroExclusivity(plan));
  errors.push(...validateTreacheryCards(plan, factionState));
  errors.push(
    ...validateKwisatzHaderach(plan, faction, factionState, territoryId)
  );
  errors.push(...validateSpiceDialing(plan, state, factionState));

  if (errors.length === 0) {
    const leaderStrength = plan.leaderId
      ? getLeaderDefinition(plan.leaderId)?.strength ?? 0
      : 0;
    return validResult({
      ...context,
      estimatedStrength: plan.forcesDialed + leaderStrength,
    });
  }

  // Generate suggestions
  const suggestions = generateBattlePlanSuggestions(
    state,
    faction,
    forcesInTerritory,
    availableLeaders
  );

  return invalidResult(errors, context, suggestions);
}
