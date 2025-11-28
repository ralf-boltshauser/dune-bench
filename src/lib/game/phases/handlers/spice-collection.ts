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

import {
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from '../../types';
import {
  addSpice,
  removeSpiceFromTerritory,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type PhaseEvent,
} from '../types';

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
      // Check if faction has ornithopter access (forces in Arrakeen or Carthag)
      // Rule 1.08.02: "If the player occupies Carthag and/or Arrakeen their collection rate is now 3 spice per Force."
      const hasOrnithopterBonus = this.checkOrnithopterAccess(newState, faction);
      const collectionRate = hasOrnithopterBonus
        ? GAME_CONSTANTS.SPICE_PER_FORCE_WITH_CITY
        : GAME_CONSTANTS.SPICE_PER_FORCE;

      // Process each force stack on the board
      for (const forceStack of factionState.forces.onBoard) {
        // Check if there's spice in this sector
        const spiceLocation = newState.spiceOnBoard.find(
          (s) =>
            s.territoryId === forceStack.territoryId &&
            s.sector === forceStack.sector
        );

        if (spiceLocation && spiceLocation.amount > 0) {
          // Calculate collection amount
          const forceCount = forceStack.forces.regular + forceStack.forces.elite;
          const maxCollection = forceCount * collectionRate;
          const actualCollection = Math.min(maxCollection, spiceLocation.amount);

          if (actualCollection > 0) {
            // Apply collection
            newState = addSpice(newState, faction, actualCollection);
            newState = removeSpiceFromTerritory(
              newState,
              forceStack.territoryId,
              forceStack.sector,
              actualCollection
            );

            // Log event
            events.push({
              type: 'SPICE_COLLECTED',
              data: {
                faction,
                territory: forceStack.territoryId,
                sector: forceStack.sector,
                amount: actualCollection,
                forces: forceCount,
                collectionRate,
              },
              message: `${faction} collects ${actualCollection} spice from ${forceStack.territoryId} sector ${forceStack.sector} (${forceCount} forces × ${collectionRate} spice/force)`,
            });

            newState = logAction(newState, 'SPICE_COLLECTED', faction, {
              territory: forceStack.territoryId,
              sector: forceStack.sector,
              amount: actualCollection,
              forces: forceCount,
              collectionRate,
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
   */
  private checkOrnithopterAccess(state: GameState, faction: Faction): boolean {
    const factionState = getFactionState(state, faction);

    // Check if faction has any forces in Arrakeen or Carthag
    const hasArrakeen = factionState.forces.onBoard.some(
      (stack) => stack.territoryId === TerritoryId.ARRAKEEN
    );
    const hasCarthag = factionState.forces.onBoard.some(
      (stack) => stack.territoryId === TerritoryId.CARTHAG
    );

    return hasArrakeen || hasCarthag;
  }
}
