/**
 * Spice Collection Phase Handler
 *
 * Phase 1.08: Spice Collection (Rule 1.08)
 * - AUTOMATIC collection - no agent decisions needed
 * - Collection rate: 2 spice per force (base)
 * - Collection rate: 3 spice per force if faction has forces in Arrakeen OR Carthag
 * - Limited by available spice in territory/sector
 * - Collected per sector (forces in different sectors collect separately)
 */

import { GAME_CONSTANTS } from "../../data";
import {
  addSpice,
  areSectorsSeparatedByStorm,
  getFactionState,
  logAction,
  removeSpiceFromTerritory,
} from "../../state";
import {
  Faction,
  Phase,
  TerritoryId,
  TerritoryType,
  type GameState,
} from "../../types";
import { TERRITORY_DEFINITIONS } from "../../types/territories";
import {
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../types";

// =============================================================================
// SPICE COLLECTION PHASE HANDLER
// =============================================================================

export class SpiceCollectionPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SPICE_COLLECTION;

  initialize(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Automatic collection for all factions
    for (const [faction, factionState] of state.factions) {
      // @rule 1.08.02
      // Check if faction has ornithopter access (forces in Arrakeen or Carthag)
      // Rule 1.08.02: "If the player occupies Carthag and/or Arrakeen their collection rate is now 3 spice per Force."
      const hasOrnithopterBonus = this.checkOrnithopterAccess(
        newState,
        faction
      );
      const collectionRate = hasOrnithopterBonus
        ? GAME_CONSTANTS.SPICE_PER_FORCE_WITH_CITY
        : GAME_CONSTANTS.SPICE_PER_FORCE;

      // Process each force stack on the board
      for (const forceStack of factionState.forces.onBoard) {
        // Rule 1.08.01: "Any player whose Forces Occupy a Sector of a Territory in which there is spice may now collect that spice."
        // CRITICAL: Collection only occurs if there is spice in that territory
        // IMPORTANT: Forces do NOT need to be in the same sector as the spice - they only need to be in the same territory
        // Example: Spice in territory X sector 1, forces in territory X sector 2 -> CAN collect
        // Example: Spice in territory X sector 1, forces in territory Y sector 1 -> CANNOT collect (different territory)
        // We iterate over spiceOnBoard to ensure we only process territories that actually contain spice
        // CRITICAL: Iterate over a snapshot of spice locations to avoid issues when modifying during iteration
        // But always check the current state for the actual amount (may have been reduced by previous collections)
        const spiceLocationsSnapshot = [...newState.spiceOnBoard];
        for (const spiceLocation of spiceLocationsSnapshot) {
          // Must be in same territory (Rule 1.08.01: forces must occupy a sector of the territory with spice)
          // Forces can be in any sector of that territory - they don't need to match the spice's sector
          if (spiceLocation.territoryId !== forceStack.territoryId) {
            continue;
          }

          // CRITICAL: Spice can only be collected from SAND territories, not ROCK territories
          // Rule 1.08: Spice collection only works in sand territories (spice blows only occur in sand)
          const territoryDef = TERRITORY_DEFINITIONS[spiceLocation.territoryId];
          if (!territoryDef || territoryDef.type !== TerritoryType.SAND) {
            continue; // Cannot collect from ROCK territories or invalid territories
          }

          // Check if forces and spice are separated by storm
          // Rule 1.01.04: Forces cannot interact if separated by a storm sector
          // This applies to spice collection just like it applies to battles
          if (
            areSectorsSeparatedByStorm(
              newState,
              forceStack.sector,
              spiceLocation.sector
            )
          ) {
            continue; // Cannot collect - separated by storm
          }

          // Get current amount from state (may have been reduced by previous collections in this phase)
          const currentSpiceLocation = newState.spiceOnBoard.find(
            (s) =>
              s.territoryId === spiceLocation.territoryId &&
              s.sector === spiceLocation.sector
          );

          // If spice was already fully collected, skip
          if (!currentSpiceLocation || currentSpiceLocation.amount <= 0) {
            continue;
          }

          // Calculate collection amount based on current amount
          // Rule 2.02.12 (COEXISTENCE): Advisors cannot collect spice
          // Only count fighters (for BG: total - advisors; for others: all forces are fighters)
          const totalForces =
            forceStack.forces.regular + forceStack.forces.elite;
          const advisors = forceStack.advisors ?? 0;
          const fighterCount = totalForces - advisors; // Exclude advisors
          const maxCollection = fighterCount * collectionRate;
          // @rule 1.08.03 - Uncollected spice remains (Math.min limits collection to available spice)
          const actualCollection = Math.min(
            maxCollection,
            currentSpiceLocation.amount
          );

          if (actualCollection > 0) {
            // Apply collection
            newState = addSpice(newState, faction, actualCollection);
            newState = removeSpiceFromTerritory(
              newState,
              spiceLocation.territoryId,
              spiceLocation.sector,
              actualCollection
            );

            // Log event
            events.push({
              type: "SPICE_COLLECTED",
              data: {
                faction,
                territory: spiceLocation.territoryId,
                sector: spiceLocation.sector,
                amount: actualCollection,
                forces: fighterCount,
                collectionRate,
                forceSector: forceStack.sector,
              },
              message: `${faction} collects ${actualCollection} spice from ${spiceLocation.territoryId} sector ${spiceLocation.sector} (${fighterCount} fighters in sector ${forceStack.sector} × ${collectionRate} spice/force)`,
            });

            newState = logAction(newState, "SPICE_COLLECTED", faction, {
              territory: spiceLocation.territoryId,
              sector: spiceLocation.sector,
              amount: actualCollection,
              forces: fighterCount,
              collectionRate,
              forceSector: forceStack.sector,
            });
          }
        }
      }
    }

    // Phase complete immediately - no agent interaction needed
    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.MENTAT_PAUSE,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  processStep(state: GameState): PhaseStepResult {
    // This should never be called since we complete in initialize()
    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.MENTAT_PAUSE,
      pendingRequests: [],
      actions: [],
      events: [],
    };
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Check if faction has ornithopter access (forces in Arrakeen or Carthag).
   * Rule 1.08.02: "If the player occupies Carthag and/or Arrakeen their collection rate is now 3 spice per Force."
   * This bonus applies to ALL their spice collection, not just in those cities.
   * Rule 2.02.12 (COEXISTENCE): Advisors cannot grant ornithopters - only fighters count.
   */
  private checkOrnithopterAccess(state: GameState, faction: Faction): boolean {
    const factionState = getFactionState(state, faction);

    // Check if faction has any fighters (not advisors) in Arrakeen or Carthag
    // Rule 2.02.12: Advisors cannot grant ornithopters
    const hasArrakeen = factionState.forces.onBoard.some((stack) => {
      if (stack.territoryId !== TerritoryId.ARRAKEEN) return false;
      const totalForces = stack.forces.regular + stack.forces.elite;
      const advisors = stack.advisors ?? 0;
      return totalForces - advisors > 0; // Only fighters count
    });
    const hasCarthag = factionState.forces.onBoard.some((stack) => {
      if (stack.territoryId !== TerritoryId.CARTHAG) return false;
      const totalForces = stack.forces.regular + stack.forces.elite;
      const advisors = stack.advisors ?? 0;
      return totalForces - advisors > 0; // Only fighters count
    });

    return hasArrakeen || hasCarthag;
  }
}
