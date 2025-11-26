/**
 * Spice card definitions for the base game.
 * Includes territory cards and Shai-Hulud (sandworm) cards.
 */

import { SpiceCardType, TerritoryId, type SpiceCardDefinition } from '../types';

// =============================================================================
// TERRITORY SPICE CARDS
// =============================================================================

// Each territory card specifies where spice blows and how much
export const TERRITORY_SPICE_CARDS: SpiceCardDefinition[] = [
  { id: 'spice_cielago_north', name: 'Cielago North', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.CIELAGO_NORTH, spiceAmount: 8, sector: 0 },
  { id: 'spice_cielago_south', name: 'Cielago South', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.CIELAGO_SOUTH, spiceAmount: 12, sector: 1 },
  { id: 'spice_south_mesa', name: 'South Mesa', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.SOUTH_MESA, spiceAmount: 10, sector: 2 },
  { id: 'spice_red_chasm', name: 'Red Chasm', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.RED_CHASM, spiceAmount: 8, sector: 3 },
  { id: 'spice_sihaya_ridge', name: 'Sihaya Ridge', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.SIHAYA_RIDGE, spiceAmount: 6, sector: 4 },
  { id: 'spice_hole_in_the_rock', name: 'Hole in the Rock', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.HOLE_IN_THE_ROCK, spiceAmount: 6, sector: 8 },
  { id: 'spice_basin', name: 'Basin', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.BASIN, spiceAmount: 8, sector: 9 },
  { id: 'spice_old_gap', name: 'Old Gap', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.OLD_GAP, spiceAmount: 6, sector: 8 },
  { id: 'spice_broken_land', name: 'Broken Land', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.BROKEN_LAND, spiceAmount: 8, sector: 7 },
  { id: 'spice_hagga_basin', name: 'Hagga Basin', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.HAGGA_BASIN, spiceAmount: 10, sector: 11 },
  { id: 'spice_rock_outcroppings', name: 'Rock Outcroppings', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.ROCK_OUTCROPPINGS, spiceAmount: 6, sector: 5 },
  { id: 'spice_wind_pass', name: 'Wind Pass', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.WIND_PASS, spiceAmount: 6, sector: 13 },
  { id: 'spice_the_minor_erg', name: 'The Minor Erg', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.THE_MINOR_ERG, spiceAmount: 8, sector: 12 },
  { id: 'spice_habbanya_erg', name: 'Habbanya Erg', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.HABBANYA_ERG, spiceAmount: 8, sector: 14 },
  { id: 'spice_the_great_flat', name: 'The Great Flat', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.THE_GREAT_FLAT, spiceAmount: 10, sector: 14 },
  { id: 'spice_funeral_plain', name: 'Funeral Plain', type: SpiceCardType.TERRITORY, territoryId: TerritoryId.FUNERAL_PLAIN, spiceAmount: 6, sector: 1 },
];

// =============================================================================
// SHAI-HULUD (SANDWORM) CARDS
// =============================================================================

export const SHAI_HULUD_CARDS: SpiceCardDefinition[] = [
  { id: 'shai_hulud_1', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
  { id: 'shai_hulud_2', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
  { id: 'shai_hulud_3', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
  { id: 'shai_hulud_4', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
  { id: 'shai_hulud_5', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
  { id: 'shai_hulud_6', name: 'Shai-Hulud', type: SpiceCardType.SHAI_HULUD },
];

// =============================================================================
// ALL SPICE CARDS
// =============================================================================

export const ALL_SPICE_CARDS: SpiceCardDefinition[] = [
  ...TERRITORY_SPICE_CARDS,
  ...SHAI_HULUD_CARDS,
];

// Card lookup by ID
export const SPICE_CARD_BY_ID: Record<string, SpiceCardDefinition> = Object.fromEntries(
  ALL_SPICE_CARDS.map((card) => [card.id, card])
);

// Get card definition by ID
export function getSpiceCardDefinition(cardId: string): SpiceCardDefinition | undefined {
  return SPICE_CARD_BY_ID[cardId];
}

// Helper to check if card is a sandworm
export function isShaiHulud(card: SpiceCardDefinition): boolean {
  return card.type === SpiceCardType.SHAI_HULUD;
}
