import {
  destroySpiceInTerritory,
  getProtectedLeaders,
  logAction,
  sendForcesToTanks,
} from "../../../../state";
import { Faction, LeaderLocation, type GameState } from "../../../../types";
import { type PhaseEvent, type PhaseStepResult } from "../../../types";
import { type DeckType, type Location, type SpiceBlowContext } from "../types";
import { getSpiceCardDefinition, isShaiHulud } from "../../../../data";
import { getDiscardPile } from "../deck";
import { SpiceBlowEvents } from "../events/factory";
import { SpiceBlowLogger } from "../utils/logger";
import { SpiceBlowRequests } from "../requests/builders";
import { SpiceBlowResults } from "../results/factory";

/**
 * Get the territory location from the topmost Territory Card in the discard pile.
 * Rule 1.02.05: "destroy all spice and Forces in the Territory of the topmost Territory Card in the discard pile"
 * 
 * CRITICAL: A sandworm can NEVER devour newly placed spice. It only devours in territories
 * from previous turns' territory cards. We must exclude territory cards placed this turn.
 */
export function getTopmostTerritoryCardLocation(
  state: GameState,
  deckType: DeckType,
  context: SpiceBlowContext
): Location | null {
  const discardPile = getDiscardPile(state, deckType);
  
  // Get the set of cards placed this turn for this deck (to exclude them)
  const cardsPlacedThisTurn = deckType === "A" 
    ? context.territoryCardsPlacedThisTurn.deckA
    : context.territoryCardsPlacedThisTurn.deckB;
  
  // Create a Set for fast lookup - compare by definitionId and type
  // Since cards are the same instances, we can compare by reference or by definitionId
  const cardsPlacedThisTurnSet = new Set(
    cardsPlacedThisTurn.map(card => `${card.definitionId}:${card.type}`)
  );

  // Find the topmost (last) Territory Card in the discard pile
  // EXCLUDING any cards placed this turn
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];
    
    // Skip cards placed this turn - sandworms can never devour newly placed spice
    // Compare by definitionId and type to identify the same card
    const cardKey = `${card.definitionId}:${card.type}`;
    if (cardsPlacedThisTurnSet.has(cardKey)) {
      // Double-check: also verify it's actually the same card instance
      // by checking if it exists in the placed cards array
      const isCurrentTurnCard = cardsPlacedThisTurn.some(
        placedCard => 
          placedCard.definitionId === card.definitionId &&
          placedCard.type === card.type
      );
      if (isCurrentTurnCard) {
        continue;
      }
    }
    
    const cardDef = getSpiceCardDefinition(card.definitionId);

    if (
      cardDef &&
      !isShaiHulud(cardDef) &&
      cardDef.territoryId &&
      cardDef.sector !== undefined
    ) {
      return {
        territoryId: cardDef.territoryId,
        sector: cardDef.sector,
      };
    }
  }

  // No previous turn territory card found - sandworm has nothing to devour
  // (This is valid - if this is the first territory card ever placed on this deck,
  // there's nothing to devour)
  return null;
}

/**
 * Execute the actual devouring of forces (after Fremen protection decision or if not applicable).
 */
export function executeDevour(
  state: GameState,
  location: Location,
  events: PhaseEvent[],
  context: SpiceBlowContext
): { state: GameState; events: PhaseEvent[] } {
  const newEvents: PhaseEvent[] = [];
  const { territoryId, sector } = location;
  let newState = state;

  // Determine which factions are protected by Fremen
  const fremenState = newState.factions.get(Faction.FREMEN);
  const protectedAlly =
    context.fremenProtectionDecision === "protect"
      ? fremenState?.allyId
      : null;

  // Destroy forces in territory
  // @rule 2.04.07 SHAI-HULUD: When Shai-Hulud appears in a Territory where
  // you have Forces, they are not devoured.✷
  // Fremen forces are IMMUNE to worm devouring (this is different from storm!)
  for (const [faction, factionState] of Array.from(newState.factions.entries())) {
    // Check for protected leaders in this territory
    // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
    // Territory where they were used. (Game effects do not kill these leaders while there.)"
    const protectedLeaders = getProtectedLeaders(newState, faction);
    if (protectedLeaders.length > 0) {
      const leadersInTerritory = factionState.leaders.filter(
        (l) =>
          l.location === LeaderLocation.ON_BOARD &&
          l.usedInTerritoryId === territoryId
      );
      if (leadersInTerritory.length > 0) {
        SpiceBlowLogger.leaderProtected(faction, leadersInTerritory.length, territoryId);
        newEvents.push(
          SpiceBlowEvents.leaderProtectedFromWorm(
            faction,
            territoryId,
            sector,
            leadersInTerritory.length
          )
        );
      }
    }

    // Fremen forces are not devoured by worms
    if (faction === Faction.FREMEN) {
      const forcesInSector = factionState.forces.onBoard.find(
        (f) => f.territoryId === territoryId && f.sector === sector
      );
      if (forcesInSector) {
        const totalForces =
          forcesInSector.forces.regular + forcesInSector.forces.elite;
        newEvents.push(
          SpiceBlowEvents.fremenWormImmunity(faction, territoryId, sector, totalForces)
        );
      }
      continue;
    }

    // Check if this faction is protected by Fremen
    if (protectedAlly === faction) {
      const forcesInSector = factionState.forces.onBoard.find(
        (f) => f.territoryId === territoryId && f.sector === sector
      );
      if (forcesInSector) {
        const totalForces =
          forcesInSector.forces.regular + forcesInSector.forces.elite;
        newEvents.push(
          SpiceBlowEvents.fremenProtectedAlly(faction, territoryId, sector, totalForces)
        );
        SpiceBlowLogger.allyProtected(faction, totalForces);
      }
      continue;
    }

    const forcesInSector = factionState.forces.onBoard.find(
      (f) => f.territoryId === territoryId && f.sector === sector
    );

    if (forcesInSector) {
      const totalForces =
        forcesInSector.forces.regular + forcesInSector.forces.elite;
      // All non-Fremen, non-protected forces are devoured
      newState = sendForcesToTanks(
        newState,
        faction,
        territoryId,
        sector,
        totalForces
      );
      newEvents.push(
        SpiceBlowEvents.forcesDevoured(faction, territoryId, sector, totalForces)
      );
    }
  }

  newState = logAction(newState, "SHAI_HULUD", null, {
    territory: territoryId,
    sector,
  });

  return { state: newState, events: [...events, ...newEvents] };
}

/**
 * Devour forces and spice in a specific territory.
 * Rule 1.02.05: Destroy all spice and Forces in the Territory.
 *
 * This returns either:
 * - A PhaseStepResult if we need to request Fremen protection decision
 * - An object with { state, events } if devouring is complete
 */
export function devourForcesInTerritory(
  state: GameState,
  location: Location,
  events: PhaseEvent[],
  context: SpiceBlowContext
): { state: GameState; events: PhaseEvent[] } | PhaseStepResult {
  const newEvents: PhaseEvent[] = [];
  const { territoryId, sector } = location;
  let newState = state;

  // Destroy all spice in territory (Rule 1.02.05)
  const spiceInTerritory = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (spiceInTerritory) {
    newState = destroySpiceInTerritory(newState, territoryId, sector);
    newEvents.push(
      SpiceBlowEvents.spiceDestroyedByWorm(
        territoryId,
        sector,
        spiceInTerritory.amount
      )
    );
  }

  // @rule 2.04.10 ALLIANCE: You may decide to protect (or not protect) your allies from being devoured by sandworms
  // Check if Fremen can protect allies from sandworms
  const fremenState = newState.factions.get(Faction.FREMEN);
  if (fremenState?.allyId) {
    const ally = fremenState.allyId;
    const allyState = newState.factions.get(ally);

    // Check if ally has forces in this territory
    const allyForcesInSector = allyState?.forces.onBoard.find(
      (f) => f.territoryId === territoryId && f.sector === sector
    );

    if (allyForcesInSector) {
      const totalAllyForces =
        allyForcesInSector.forces.regular + allyForcesInSector.forces.elite;

      SpiceBlowLogger.allyForces(ally, totalAllyForces, territoryId);

      // Return PhaseStepResult with pending request
      // The caller will update context.pendingDevourLocation
      const pendingRequests = [
        SpiceBlowRequests.fremenProtection(location, ally, totalAllyForces),
      ];

      // Note: This returns PhaseStepResult, not SpiceBlowStepResult
      // The caller will wrap it with context
      return {
        state: newState,
        phaseComplete: false,
        pendingRequests,
        actions: [],
        events: [...events, ...newEvents],
      };
    }
  }

  // No Fremen protection needed, proceed with normal devouring
  return executeDevour(newState, location, [...events, ...newEvents], context);
}

