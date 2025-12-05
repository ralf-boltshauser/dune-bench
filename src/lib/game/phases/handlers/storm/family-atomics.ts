/**
 * Family Atomics Handling
 * 
 * Handles Family Atomics card logic and Shield Wall destruction.
 */

import { getTreacheryCardDefinition } from "../../../data";
import { getFactionState, sendForcesToTanks } from "../../../state";
import { isSectorInStorm } from "../../../state/queries";
import {
  FACTION_NAMES,
  Faction,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  type GameState,
} from "../../../types";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { checkWeatherControl } from "./weather-control";
import type { ForceDestructionRecord } from "./types";

/**
 * Check if storm is between two sectors
 */
export function isStormBetweenSectors(
  state: GameState,
  sector1: number,
  sector2: number
): boolean {
  const stormSector = state.stormSector;
  const min = Math.min(sector1, sector2);
  const max = Math.max(sector1, sector2);

  // Direct path
  if (stormSector > min && stormSector < max) {
    return true;
  }

  // Wrapped path
  if (stormSector < min || stormSector > max) {
    return true;
  }

  return false;
}

/**
 * Get all forces on Shield Wall
 */
export function getForcesOnShieldWall(
  state: GameState
): ForceDestructionRecord[] {
  const destroyed: ForceDestructionRecord[] = [];

  for (const [faction, factionState] of state.factions) {
    for (const stack of factionState.forces.onBoard) {
      if (stack.territoryId === TerritoryId.SHIELD_WALL) {
        const totalForces = stack.forces.regular + stack.forces.elite;
        if (totalForces > 0) {
          destroyed.push({
            faction,
            territoryId: TerritoryId.SHIELD_WALL,
            sector: stack.sector,
            count: totalForces,
          });
        }
      }
    }
  }

  return destroyed;
}

/**
 * Check if a faction can play Family Atomics
 */
export function canPlayFamilyAtomics(
  state: GameState,
  faction: Faction
): boolean {
  const factionState = getFactionState(state, faction);

  // Check if forces are on Shield Wall
  const forcesOnShieldWall = factionState.forces.onBoard.some(
    (stack) => stack.territoryId === TerritoryId.SHIELD_WALL
  );

  if (forcesOnShieldWall) {
    return true;
  }

  // Check if forces are in territory adjacent to Shield Wall with no storm between
  const shieldWallDef = TERRITORY_DEFINITIONS[TerritoryId.SHIELD_WALL];
  for (const stack of factionState.forces.onBoard) {
    if (shieldWallDef.adjacentTerritories.includes(stack.territoryId)) {
      // Check if storm is between the sector and Shield Wall
      // Shield Wall is in sectors 7, 8
      const shieldWallSectors = [7, 8];
      const hasStormBetween = shieldWallSectors.some((swSector) => {
        // Check if storm is between stack.sector and swSector
        return (
          isSectorInStorm(state, stack.sector) ||
          isStormBetweenSectors(state, stack.sector, swSector)
        );
      });

      if (!hasStormBetween) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if any faction can play Family Atomics and ask them
 * @rule 3.01.07
 */
export function checkFamilyAtomics(
  state: GameState,
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  const pendingRequests: AgentRequest[] = [];

  // Family Atomics can only be played after Turn 1
  if (state.turn === 1) {
    // Skip to Weather Control check
    return checkWeatherControl(state, context);
  }

  // Check each faction for Family Atomics card and requirements
  for (const [faction, factionState] of state.factions) {
    // Check if faction has Family Atomics card
    const hasFamilyAtomics = factionState.hand.some((card) => {
      const def = getTreacheryCardDefinition(card.definitionId);
      return def && def.id === "family_atomics";
    });

    if (!hasFamilyAtomics) continue;

    // Check if faction meets requirements:
    // - Forces on Shield Wall OR
    // - Forces in territory adjacent to Shield Wall with no storm between
    const canPlay = canPlayFamilyAtomics(state, faction);

    if (canPlay) {
      pendingRequests.push({
        factionId: faction,
        requestType: "PLAY_FAMILY_ATOMICS",
        prompt: `You have Family Atomics. After storm movement is calculated (${context.stormMovement} sectors), you may play it to destroy all forces on the Shield Wall and remove protection from Imperial Basin, Arrakeen, and Carthag. Do you want to play Family Atomics?`,
        context: {
          calculatedMovement: context.stormMovement,
          turn: state.turn,
        },
        availableActions: ["PLAY_FAMILY_ATOMICS", "PASS"],
      });
    }
  }

  if (pendingRequests.length > 0) {
    context.waitingForFamilyAtomics = true;
    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: false,
      actions: [],
      events,
    };
  }

  // No one can play Family Atomics - mark as checked and check Weather Control
  // CRITICAL: Set familyAtomicsUsed to prevent infinite re-checking in processStep
  context.familyAtomicsUsed = true;
  return checkWeatherControl(state, context);
}

/**
 * Process Family Atomics response
 */
export function processFamilyAtomics(
  state: GameState,
  responses: AgentResponse[],
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  let newState = state;

  context.waitingForFamilyAtomics = false;

  // Process responses
  for (const response of responses) {
    if (response.actionType === "PLAY_FAMILY_ATOMICS" && !response.passed) {
      const faction = response.factionId;
      context.familyAtomicsUsed = true;
      context.familyAtomicsBy = faction;

      // Remove card from hand
      const factionState = getFactionState(newState, faction);
      const cardIndex = factionState.hand.findIndex((card) => {
        const def = getTreacheryCardDefinition(card.definitionId);
        return def && def.id === "family_atomics";
      });

      if (cardIndex >= 0) {
        factionState.hand.splice(cardIndex, 1);
        // Note: Family Atomics is "Set Aside" (not discarded), but we remove from hand
        // The card remains in play as a reminder (shieldWallDestroyed flag)
      }

      // Destroy all forces on Shield Wall
      const shieldWallForces = getForcesOnShieldWall(newState);
      for (const destruction of shieldWallForces) {
        newState = sendForcesToTanks(
          newState,
          destruction.faction,
          destruction.territoryId,
          destruction.sector,
          destruction.count
        );

        events.push({
          type: "FORCES_KILLED_BY_FAMILY_ATOMICS",
          data: destruction as unknown as Record<string, unknown>,
          message: `${destruction.count} ${destruction.faction} forces destroyed on Shield Wall by Family Atomics`,
        });
      }

      // Mark Shield Wall as destroyed
      newState = { ...newState, shieldWallDestroyed: true };

      // Remove protection from Imperial Basin, Arrakeen, and Carthag
      // This is done by updating territory definitions - but since they're constants,
      // we need to track this in state. For now, we'll handle it in destroyForcesInStorm
      // by checking if shieldWallDestroyed is true and if territory is one of the three cities

      events.push({
        type: "FAMILY_ATOMICS_PLAYED",
        data: { faction, shieldWallDestroyed: true },
        message: `${faction} played Family Atomics. Shield Wall destroyed. Imperial Basin, Arrakeen, and Carthag lose storm protection.`,
      });

      console.log(`\n💣 ${FACTION_NAMES[faction]} played Family Atomics!`);
      console.log(`   Shield Wall destroyed. Cities lose protection.`);
    }
  }

  // Now check for Weather Control
  return checkWeatherControl(newState, context);
}

