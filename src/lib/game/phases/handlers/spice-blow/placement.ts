import { addSpiceToTerritory, logAction } from "../../../state";
import { type GameState, type SpiceCard, TerritoryId } from "../../../types";
import { type PhaseEvent } from "../../types";
import { type DeckType, type SpiceBlowContext } from "./types";
import { discardSpiceCard } from "./deck";
import { isInStorm } from "./validation";
import { SpiceBlowEvents } from "./events/factory";
import { SpiceBlowLogger } from "./utils/logger";
import { TERRITORY_DEFINITIONS } from "../../../types/territories";

interface TerritoryCardDef {
  territoryId?: TerritoryId;
  sector?: number;
  spiceAmount?: number;
  name: string;
}

/**
 * Handle territory card - place spice or skip if in storm
 * @rule 1.02.04
 */
export function handleTerritoryCard(
  state: GameState,
  card: SpiceCard,
  cardDef: TerritoryCardDef,
  deckType: DeckType,
  context: SpiceBlowContext,
  events: PhaseEvent[]
): { state: GameState; events: PhaseEvent[]; context: SpiceBlowContext } {
  if (
    !cardDef.territoryId ||
    cardDef.sector === undefined ||
    !cardDef.spiceAmount
  ) {
    // Invalid territory card
    const updatedContext = {
      ...context,
      ...(deckType === "A"
        ? { cardARevealed: true }
        : { cardBRevealed: true }),
    };
    return {
      state,
      events,
      context: updatedContext,
    };
  }

  const territoryId = cardDef.territoryId;
  const sector = cardDef.sector;
  const amount = cardDef.spiceAmount;

  // Initialize events array
  const newEvents = [...events];

  // CRITICAL: Spice can only be placed in territories with spiceBlowLocation: true
  // This is the definitive list of territories where spice blows can occur
  const territoryDef = TERRITORY_DEFINITIONS[territoryId];
  const canHaveSpiceBlow = territoryDef && territoryDef.spiceBlowLocation === true;

  if (!canHaveSpiceBlow) {
    // Spice cannot be placed in territories without spiceBlowLocation: true
    SpiceBlowLogger.spiceNotPlaced(sector);
    
    newEvents.push(
      SpiceBlowEvents.spiceNotPlaced(
        territoryId,
        sector,
        amount,
        `territory does not have spiceBlowLocation (territory: ${territoryDef?.name || territoryId})`
      )
    );

    // Discard the card (even if spice wasn't placed, we still track it)
    const newState = discardSpiceCard(state, card, deckType);
    
    // Track this territory card as placed this turn (even if spice wasn't placed due to storm/invalid)
    const territoryCardsPlacedThisTurn = {
      ...context.territoryCardsPlacedThisTurn,
      [deckType === "A" ? "deckA" : "deckB"]: [
        ...context.territoryCardsPlacedThisTurn[deckType === "A" ? "deckA" : "deckB"],
        card,
      ],
    };
    
    const finalContext = {
      ...context,
      territoryCardsPlacedThisTurn,
      ...(deckType === "A" ? { cardARevealed: true } : { cardBRevealed: true }),
    };

    return {
      state: newState,
      events: newEvents,
      context: finalContext,
    };
  }

  // Check if location is in storm
  // Rule 1.02.04: "If the Spice Blow icon is currently in storm, no spice is Placed"
  // Must check both: exact sector match AND if storm is in any sector of the territory
  // (For multi-sector territories, if storm is in any sector, spice cannot be placed)
  const inStorm = territoryId
    ? isInStorm(state, sector, territoryId)
    : isInStorm(state, sector);

  SpiceBlowLogger.spicePlacementCheck(territoryId, sector, state.stormSector, inStorm);

  let newState = state;

  // Helper function to track territory card placed this turn
  const trackTerritoryCard = (ctx: SpiceBlowContext): SpiceBlowContext => ({
    ...ctx,
    territoryCardsPlacedThisTurn: {
      ...ctx.territoryCardsPlacedThisTurn,
      [deckType === "A" ? "deckA" : "deckB"]: [
        ...ctx.territoryCardsPlacedThisTurn[deckType === "A" ? "deckA" : "deckB"],
        card,
      ],
    },
  });

  if (inStorm) {
    // Spice doesn't blow - card goes to discard
    SpiceBlowLogger.spiceNotPlaced(sector);

    newEvents.push(
      SpiceBlowEvents.spiceNotPlaced(territoryId, sector, amount, "territory is in storm")
    );

    // Discard the card (even if in storm, we still track it)
    newState = discardSpiceCard(newState, card, deckType);
    
    // Track this territory card as placed this turn (even if spice wasn't placed due to storm)
    const updatedContext = trackTerritoryCard(context);
    
    const finalContext = {
      ...updatedContext,
      ...(deckType === "A" ? { cardARevealed: true } : { cardBRevealed: true }),
    };

    return {
      state: newState,
      events: newEvents,
      context: finalContext,
    };
  } else {
    // Place spice on territory
    newState = addSpiceToTerritory(newState, territoryId, sector, amount);
    
    SpiceBlowLogger.spicePlaced(amount, territoryId, sector);

    newEvents.push(SpiceBlowEvents.spicePlaced(territoryId, sector, amount));

    newState = logAction(newState, "SPICE_BLOW", null, {
      territory: territoryId,
      sector,
      amount,
    });

    // Discard the card
    newState = discardSpiceCard(newState, card, deckType);
    
    // Track this territory card as placed this turn (to exclude from sandworm devouring)
    // Rule: Sandworms can NEVER devour newly placed spice
    const updatedContext = trackTerritoryCard({
      ...context,
      lastSpiceLocation: { territoryId, sector },
    });

    const finalContext = {
      ...updatedContext,
      ...(deckType === "A"
        ? { cardARevealed: true }
        : { cardBRevealed: true }),
    };

    return {
      state: newState,
      events: newEvents,
      context: finalContext,
    };
  }
}

