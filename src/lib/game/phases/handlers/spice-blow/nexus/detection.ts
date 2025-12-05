import { type GameState } from "../../../../types";
import { type SpiceBlowContext } from "../types";

/**
 * Check if Nexus can occur (not on Turn 1)
 * @rule 1.02.03
 */
export function canNexusOccur(state: GameState, context: SpiceBlowContext): boolean {
  // Rule 1.02.03 - NO NEXUS: There can not be a Nexus on Turn one for any reason.
  return state.turn > 1;
}

/**
 * Check if Nexus should be triggered after a Territory Card is placed
 */
export function checkNexusTriggerAfterTerritoryCard(
  state: GameState,
  context: SpiceBlowContext
): boolean {
  return (
    context.shaiHuludCount > 0 &&
    state.turn > 1 &&
    !context.nexusTriggered
  );
}

/**
 * Check if Fremen worm choice is needed before Nexus
 */
export function checkFremenWormChoiceNeeded(
  state: GameState,
  context: SpiceBlowContext
): boolean {
  // This is a simplified check - actual check happens in reveal logic
  // Check if Fremen is in the game
  const firstFaction = state.factions.keys().next().value;
  const hasFremen = firstFaction !== undefined && state.factions.has(firstFaction);
  
  return (
    context.shaiHuludCount > 0 &&
    context.fremenWormChoice === null &&
    hasFremen
  );
}

