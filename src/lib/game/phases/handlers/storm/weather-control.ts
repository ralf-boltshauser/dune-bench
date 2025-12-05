/**
 * Weather Control Handling
 * 
 * Handles Weather Control card logic and storm movement override.
 */

import { getTreacheryCardDefinition } from "../../../data";
import { getFactionState } from "../../../state";
import { FACTION_NAMES, Faction, type GameState } from "../../../types";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { applyStormMovement } from "./movement";

/**
 * Check if any faction can play Weather Control and ask them
 * @rule 3.01.23
 */
export function checkWeatherControl(
  state: GameState,
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  const pendingRequests: AgentRequest[] = [];

  // Weather Control can only be played after Turn 1
  if (state.turn === 1) {
    // Skip to applying movement
    return applyStormMovement(state, context);
  }

  // Check each faction for Weather Control card
  for (const [faction, factionState] of state.factions) {
    // Check if faction has Weather Control card
    const hasWeatherControl = factionState.hand.some((card) => {
      const def = getTreacheryCardDefinition(card.definitionId);
      return def && def.id === "weather_control";
    });

    if (!hasWeatherControl) continue;

    // Ask if they want to play it
    pendingRequests.push({
      factionId: faction,
      requestType: "PLAY_WEATHER_CONTROL",
      prompt: `You have Weather Control. You may play it to control the storm this phase. You can move it 0-10 sectors counterclockwise (0 = prevent movement, 1-10 = move that many sectors). The calculated movement is ${context.stormMovement} sectors. Do you want to play Weather Control?`,
      context: {
        calculatedMovement: context.stormMovement,
        turn: state.turn,
      },
      availableActions: ["PLAY_WEATHER_CONTROL", "PASS"],
    });
  }

  if (pendingRequests.length > 0) {
    context.waitingForWeatherControl = true;
    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: false,
      actions: [],
      events,
    };
  }

  // No one wants to play Weather Control - mark as checked and apply movement
  // CRITICAL: Set weatherControlUsed to prevent infinite re-checking in processStep
  context.weatherControlUsed = true;
  return applyStormMovement(state, context);
}

/**
 * Process Weather Control response
 *
 * IMPORTANT: We only ask once. If agent gives invalid response, we treat it as a pass
 * and move on. We never ask again in the same phase.
 */
export function processWeatherControl(
  state: GameState,
  responses: AgentResponse[],
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  let newState = state;

  // Mark that we've processed Weather Control - we will NEVER ask again this phase
  context.waitingForWeatherControl = false;
  // Mark that we've asked (even if no one played it)
  // This prevents checkWeatherControl from asking again in the same phase
  // We set weatherControlUsed = true to indicate "we've handled this, don't ask again"
  // weatherControlBy will be set if someone actually played it, null if everyone passed
  context.weatherControlUsed = true;

  // Process responses - only the first faction to play Weather Control gets to use it
  // If multiple factions have it, they all get asked, but only one can play it
  for (const response of responses) {
    // Handle both tool response (play_weather_control) and direct action (PLAY_WEATHER_CONTROL)
    // Tool names are converted to uppercase by parseResponse, so check both cases
    const isWeatherControl =
      response.actionType === "PLAY_WEATHER_CONTROL" ||
      response.actionType === "play_weather_control" ||
      response.actionType?.toLowerCase() === "play_weather_control";

    // Debug: log if we got a response but it's not being recognized
    if (response.factionId === Faction.HARKONNEN && responses.length > 0) {
      console.log(
        `[DEBUG] Weather Control response from ${
          FACTION_NAMES[response.factionId]
        }: actionType=${response.actionType}, passed=${
          response.passed
        }, isWeatherControl=${isWeatherControl}`
      );
    }

    // If Weather Control was already used by another faction, skip
    if (context.weatherControlBy !== null) {
      break;
    }

    // If this faction wants to play Weather Control (not passing)
    // NOTE: Any response that is NOT play_weather_control is treated as a pass
    // This includes view tools, invalid tool calls, or no tool calls
    if (isWeatherControl && !response.passed) {
      const faction = response.factionId;
      // weatherControlUsed is already set above, just mark who played it
      context.weatherControlBy = faction;

      // Get movement choice (0-10, where 0 = prevent movement)
      const movement = Number(response.data.movement ?? 0);
      const clampedMovement = Math.max(0, Math.min(10, movement));

      // Override calculated movement with Weather Control choice
      context.stormMovement = clampedMovement;

      // Remove card from hand (discard after use)
      const factionState = getFactionState(newState, faction);
      const cardIndex = factionState.hand.findIndex((card) => {
        const def = getTreacheryCardDefinition(card.definitionId);
        return def && def.id === "weather_control";
      });

      if (cardIndex >= 0) {
        const card = factionState.hand[cardIndex];
        // Create new state with card removed from hand
        const newHand = [...factionState.hand];
        newHand.splice(cardIndex, 1);

        // Create new faction state
        const newFactionState = {
          ...factionState,
          hand: newHand,
        };

        // Create new state with updated faction and discard pile
        newState = {
          ...newState,
          factions: new Map(newState.factions),
          treacheryDiscard: [...newState.treacheryDiscard, card],
        };
        newState.factions.set(faction, newFactionState);
      }

      events.push({
        type: "WEATHER_CONTROL_PLAYED",
        data: { faction, movement: clampedMovement },
        message: `${faction} played Weather Control. Storm movement: ${
          clampedMovement === 0 ? "no movement" : clampedMovement + " sectors"
        }`,
      });

      console.log(`\n🌤️  ${FACTION_NAMES[faction]} played Weather Control!`);
      console.log(
        `   Storm movement: ${
          clampedMovement === 0 ? "NO MOVEMENT" : clampedMovement + " sectors"
        }`
      );

      // Only one faction can play Weather Control per phase
      break;
    }
  }

  // If we got here, either:
  // 1. Someone played Weather Control (weatherControlBy is set)
  // 2. Everyone passed or gave invalid responses (weatherControlBy is null)
  //
  // Either way, we've asked once and got responses. We treat invalid responses as passes.
  // We will NEVER ask again - we move forward to apply storm movement.
  //
  // Now apply movement (either Weather Control override or normal calculated movement)
  return applyStormMovement(newState, context);
}

