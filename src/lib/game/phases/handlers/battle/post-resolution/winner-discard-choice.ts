/**
 * Winner Card Discard Choice
 *
 * Handles winner's choice of which cards to discard after winning.
 */

import { Faction, BattleSubPhase } from "../../../../types";
import { getTreacheryCardDefinition } from "../../../../data";
import { getAvailableLeadersForCapture } from "../../../../state";
import { updatePendingBattlesAfterBattle } from "../pending-battles";
import { finishCardDiscarding } from "../resolution/card-discarding";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Request winner's choice of which cards to discard after winning.
 * Rule: "The winning player may discard any of the cards they played"
 */
export function requestWinnerCardDiscard(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  winner: Faction,
  cardsToKeep: string[]
): PhaseStepResult {
  const battle = context.currentBattle!;
  const result = battle.battleResult!;

  // Get card names for the prompt
  const cardNames = cardsToKeep.map((cardId) => {
    const cardDef = getTreacheryCardDefinition(cardId);
    return cardDef?.name || cardId;
  });

  const pendingRequests: AgentRequest[] = [
    {
      factionId: winner,
      requestType: "CHOOSE_CARDS_TO_DISCARD",
      prompt: `You won the battle! You played: ${cardNames.join(
        ", "
      )}. Which cards would you like to discard? (You may keep any that don't say "Discard after use". You can discard all, some, or none.)`,
      context: {
        cardsToKeep,
        cardNames,
        cardsToDiscard: result.aggressorResult.cardsToDiscard.concat(
          result.defenderResult.cardsToDiscard
        ),
      },
      availableActions: ["CHOOSE_CARDS_TO_DISCARD"],
    },
  ];

  return {
    state,
    phaseComplete: false,
    pendingRequests,
    actions: [],
    events,
  };
}

/**
 * Process winner's choice of which cards to discard.
 */
export function processWinnerCardDiscard(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    requestCaptureChoice: (
      state: GameState,
      events: PhaseEvent[],
      leaderId: string,
      victim: Faction
    ) => PhaseStepResult;
    endBattlePhase: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
    requestBattleChoice: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;
  const result = battle.battleResult!;
  const winner = result.winner!;

  const response = responses.find((r) => r.factionId === winner);
  let newState = state;

  if (response && response.actionType === "CHOOSE_CARDS_TO_DISCARD") {
    const cardsToDiscard = (response.data.cardsToDiscard as string[]) || [];

    // Validate that all discarded cards are in the winner's cardsToKeep
    const winnerResult =
      winner === battle.aggressor
        ? result.aggressorResult
        : result.defenderResult;

    // Update the result: move chosen cards from cardsToKeep to cardsToDiscard
    for (const cardId of cardsToDiscard) {
      if (winnerResult.cardsToKeep.includes(cardId)) {
        // Remove from cardsToKeep and add to cardsToDiscard
        const index = winnerResult.cardsToKeep.indexOf(cardId);
        winnerResult.cardsToKeep.splice(index, 1);
        winnerResult.cardsToDiscard.push(cardId);
      }
    }

    // Log the choice
    if (cardsToDiscard.length > 0) {
      const cardNames = cardsToDiscard.map((cardId) => {
        const cardDef = getTreacheryCardDefinition(cardId);
        return cardDef?.name || cardId;
      });
      events.push({
        type: "CARD_DISCARDED",
        data: {
          faction: winner,
          cardsDiscarded: cardsToDiscard,
          cardNames,
        },
        message: `${winner} chooses to discard: ${cardNames.join(", ")}`,
      });
    } else {
      events.push({
        type: "CARD_DISCARDED",
        data: {
          faction: winner,
          cardsDiscarded: [],
        },
        message: `${winner} chooses to keep all cards`,
      });
    }
  }

  // Now finish discarding cards (including winner's choice)
  newState = finishCardDiscarding(newState, battle, result, events);

  // Clear the stored battle result
  battle.battleResult = undefined;

  // HARKONNEN CAPTURED LEADERS: Check if Harkonnen won and can capture a leader
  if (
    result.winner === Faction.HARKONNEN &&
    !result.lasgunjShieldExplosion &&
    state.factions.has(Faction.HARKONNEN)
  ) {
    const availableLeaders = getAvailableLeadersForCapture(
      newState,
      result.loser!,
      battle.territoryId
    );

    if (availableLeaders.length > 0) {
      // Randomly select one leader from the available pool
      const captureTarget =
        availableLeaders[Math.floor(Math.random() * availableLeaders.length)];

      events.push({
        type: "HARKONNEN_CAPTURE_OPPORTUNITY",
        data: {
          winner: result.winner,
          loser: result.loser,
          captureTarget: captureTarget.definitionId,
        },
        message: `Harkonnen can capture ${result.loser}'s leader!`,
      });

      // Move to capture sub-phase
      context.subPhase = BattleSubPhase.HARKONNEN_CAPTURE;
      return callbacks.requestCaptureChoice(
        newState,
        events,
        captureTarget.definitionId,
        result.loser!
      );
    }
  }

  // Update pending battles: remove factions that no longer have forces
  // This allows the aggressor to continue fighting in the same territory
  // if other enemies remain (MULTIPLE BATTLES rule)
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    newState,
    battle.territoryId,
    battle.sector
  );

  // Check for more battles
  context.currentBattle = null;
  context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

  if (context.pendingBattles.length === 0) {
    return callbacks.endBattlePhase(newState, events);
  }

  return callbacks.requestBattleChoice(newState, events);
}

