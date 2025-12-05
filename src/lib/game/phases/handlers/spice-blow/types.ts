import { Faction, TerritoryId, type SpiceCard } from "../../../types";
import { type PhaseStepResult } from "../../types";

/**
 * Spice Blow Phase Context
 * Tracks all state during the spice blow phase execution
 */
export interface SpiceBlowContext {
  cardARevealed: boolean;
  cardBRevealed: boolean;
  lastSpiceLocation: { territoryId: TerritoryId; sector: number } | null;
  shaiHuludCount: number;
  nexusTriggered: boolean;
  nexusResolved: boolean;
  fremenWormChoice: "devour" | "ride" | null;
  factionsActedInNexus: Set<Faction>;
  // Turn 1 handling: Shai-Hulud cards revealed on turn 1 are set aside
  // and reshuffled back into the deck at the end of the phase (Rule 1.02.02)
  turnOneWormsSetAside: SpiceCard[];
  // Fremen ally protection tracking
  fremenProtectionDecision: "protect" | "allow" | null;
  pendingDevourLocation: { territoryId: TerritoryId; sector: number } | null;
  pendingDevourDeck: "A" | "B" | null;
  // Track territory cards placed this turn (per deck) to exclude from sandworm devouring
  // Rule: Sandworms can NEVER devour newly placed spice - they only devour in territories
  // from previous turns' territory cards
  territoryCardsPlacedThisTurn: {
    deckA: SpiceCard[];
    deckB: SpiceCard[];
  };
}

/**
 * Deck type for two-pile system
 */
export type DeckType = "A" | "B";

/**
 * Location for spice placement or devouring
 */
export interface Location {
  territoryId: TerritoryId;
  sector: number;
}

/**
 * Type-safe result type that includes context updates
 * This replaces the _contextUpdate hack pattern
 */
export interface SpiceBlowStepResult extends PhaseStepResult {
  context: SpiceBlowContext;
}

