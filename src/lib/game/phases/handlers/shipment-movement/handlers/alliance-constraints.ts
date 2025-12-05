/**
 * Alliance Constraint Handler (Rule 1.06.03.08)
 *
 * Handles alliance constraint:
 * "At the end of your Shipment and Movement actions,
 * Place all your Forces that are in the same Territory (except the Polar Sink)
 * as your Ally's Forces in the Tleilaxu Tanks."
 *
 * CRITICAL: Applied AFTER EACH faction completes, not at end of phase!
 */

import { Faction, TerritoryId, type GameState, FACTION_NAMES } from "@/lib/game/types";
import { getFactionsInTerritory, sendForcesToTanks, logAction } from "@/lib/game/state";
import { type PhaseEvent } from "@/lib/game/phases/types";
import { type ProcessingResult } from "../types";

export class AllianceConstraintHandler {
  /**
   * @rule 1.06.07 CONSTRAINT: At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks.
   * Apply alliance constraint for a specific faction that just completed actions.
   *
   * CRITICAL: Applied AFTER EACH faction completes, not at end of phase!
   * @rule 1.10.02.07
   */
  applyForFaction(
    state: GameState,
    faction: Faction,
    _events: PhaseEvent[]
  ): ProcessingResult {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const factionState = state.factions.get(faction);
    if (!factionState) return { state, events: newEvents };

    const allyId = factionState.allyId;
    if (!allyId) {
      // No ally, no constraint
      return { state, events: newEvents };
    }

    const allyState = state.factions.get(allyId);
    if (!allyState) return { state, events: newEvents };

    // Get all territories where this faction has forces
    const factionTerritories = new Set<TerritoryId>();
    for (const stack of factionState.forces.onBoard) {
      factionTerritories.add(stack.territoryId);
    }

    // Check each territory for ally presence
    for (const territoryId of Array.from(factionTerritories)) {
      // Rule: Except Polar Sink
      if (territoryId === TerritoryId.POLAR_SINK) continue;

      const occupants = getFactionsInTerritory(newState, territoryId);
      if (occupants.includes(allyId)) {
        // Ally is in this territory - send all forces to tanks
        const forcesInTerritory = factionState.forces.onBoard.filter(
          (s) => s.territoryId === territoryId
        );

        let totalForces = 0;
        for (const stack of forcesInTerritory) {
          totalForces += stack.forces.regular + stack.forces.elite;
        }

        if (totalForces > 0) {
          console.log(
            `\n   ⚠️  ALLIANCE CONSTRAINT: ${FACTION_NAMES[faction]} has ${totalForces} forces in ${territoryId} with ally ${FACTION_NAMES[allyId]}`
          );
          console.log(
            `   🗑️  Sending ${totalForces} forces to Tleilaxu Tanks (Rule 1.06.03.08)\n`
          );

          // Send all forces in this territory to tanks
          for (const stack of forcesInTerritory) {
            const count = stack.forces.regular + stack.forces.elite;
            newState = sendForcesToTanks(
              newState,
              faction,
              territoryId,
              stack.sector,
              count
            );
          }

          newEvents.push({
            type: "FORCES_SHIPPED",
            data: {
              faction,
              territory: territoryId,
              count: totalForces,
              reason: "alliance_constraint",
            },
            message: `${FACTION_NAMES[faction]} sends ${totalForces} forces to tanks (alliance constraint: same territory as ${FACTION_NAMES[allyId]})`,
          });

          newState = logAction(newState, "FORCES_SHIPPED", faction, {
            territory: territoryId,
            count: totalForces,
            reason: "alliance_constraint",
          });
        }
      }
    }

    return { state: newState, events: newEvents };
  }
}

