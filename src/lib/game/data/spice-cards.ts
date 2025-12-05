/**
 * Spice card definitions for the base game.
 * Includes territory cards and Shai-Hulud (sandworm) cards.
 */

import {
  SpiceCardType,
  TERRITORY_DEFINITIONS,
  type SpiceCardDefinition,
} from "../types";

// =============================================================================
// TERRITORY SPICE CARDS
// =============================================================================
//
// Territory spice cards are a pure projection of the territory definitions.
// Any territory that has a spiceSlotId, spiceSector and spiceAmount defined is
// treated as having a corresponding spice card.
export const TERRITORY_SPICE_CARDS: SpiceCardDefinition[] = Object.values(
  TERRITORY_DEFINITIONS
)
  .filter(
    (def) =>
      !!def.spiceSlotId &&
      typeof def.spiceSector === "number" &&
      typeof def.spiceAmount === "number"
  )
  .map((def) => {
    return {
      id: `spice_${def.id}`,
      name: def.name,
      type: SpiceCardType.TERRITORY,
      territoryId: def.id,
      spiceAmount: def.spiceAmount!,
      sector: def.spiceSector!,
    } as SpiceCardDefinition;
  });

// =============================================================================
// SHAI-HULUD (SANDWORM) CARDS
// =============================================================================

export const SHAI_HULUD_CARDS: SpiceCardDefinition[] = [
  { id: "shai_hulud_1", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
  { id: "shai_hulud_2", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
  { id: "shai_hulud_3", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
  { id: "shai_hulud_4", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
  { id: "shai_hulud_5", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
  { id: "shai_hulud_6", name: "Shai-Hulud", type: SpiceCardType.SHAI_HULUD },
];

// =============================================================================
// ALL SPICE CARDS
// =============================================================================

export const ALL_SPICE_CARDS: SpiceCardDefinition[] = [
  ...TERRITORY_SPICE_CARDS,
  ...SHAI_HULUD_CARDS,
];

// Card lookup by ID
export const SPICE_CARD_BY_ID: Record<string, SpiceCardDefinition> =
  Object.fromEntries(ALL_SPICE_CARDS.map((card) => [card.id, card]));

// Get card definition by ID
export function getSpiceCardDefinition(
  cardId: string
): SpiceCardDefinition | undefined {
  return SPICE_CARD_BY_ID[cardId];
}

// Helper to check if card is a sandworm
export function isShaiHulud(card: SpiceCardDefinition): boolean {
  return card.type === SpiceCardType.SHAI_HULUD;
}
