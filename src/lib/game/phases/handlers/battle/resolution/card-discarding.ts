/**
 * Card Discarding
 *
 * Handles discarding of used treachery cards after battle.
 */

import { Faction } from "../../../../types";
import { getTreacheryCardDefinition } from "../../../../data";
import { discardTreacheryCard } from "../../../../state";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Finish discarding cards after winner has made their choice (or if no choice was needed).
 */
export function finishCardDiscarding(
  state: GameState,
  battle: CurrentBattle,
  result: BattleResult,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  // Discard used treachery cards
  const discardCards = (faction: Faction, cardIds: string[]) => {
    for (const cardId of cardIds) {
      newState = discardTreacheryCard(newState, faction, cardId);
      const cardDef = getTreacheryCardDefinition(cardId);
      events.push({
        type: "CARD_DISCARDED",
        data: { faction, cardId, cardName: cardDef?.name },
        message: `${faction} discards ${cardDef?.name || cardId}`,
      });
    }
  };

  discardCards(battle.aggressor, result.aggressorResult.cardsToDiscard);
  discardCards(battle.defender, result.defenderResult.cardsToDiscard);

  return newState;
}

