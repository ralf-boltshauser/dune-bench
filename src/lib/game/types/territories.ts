/**
 * Territory definitions for the Dune game board.
 * Based on the official GF9 Dune board map.
 */

import { TerritoryType } from "./enums";

// =============================================================================
// TERRITORY IDS
// =============================================================================

export enum TerritoryId {
  // Strongholds (3 border lines)
  ARRAKEEN = "arrakeen",
  CARTHAG = "carthag",
  SIETCH_TABR = "sietch_tabr",
  HABBANYA_SIETCH = "habbanya_sietch",
  TUEKS_SIETCH = "tueks_sietch",

  // Special
  POLAR_SINK = "polar_sink",
  IMPERIAL_BASIN = "imperial_basin",

  // Sand territories
  CIELAGO_NORTH = "cielago_north",
  CIELAGO_SOUTH = "cielago_south",
  MERIDIAN = "meridian",
  CIELAGO_EAST = "cielago_east",
  CIELAGO_WEST = "cielago_west",
  CIELAGO_DEPRESSION = "cielago_depression",
  SOUTH_MESA = "south_mesa",
  FUNERAL_PLAIN = "funeral_plain",
  THE_GREAT_FLAT = "the_great_flat",
  THE_GREATER_FLAT = "the_greater_flat",
  HABBANYA_ERG = "habbanya_erg",
  HABBANYA_RIDGE_FLAT = "habbanya_ridge_flat",
  FALSE_WALL_WEST = "false_wall_west",
  WIND_PASS_NORTH = "wind_pass_north",
  THE_MINOR_ERG = "the_minor_erg",
  PASTY_MESA = "pasty_mesa",
  RED_CHASM = "red_chasm",
  SIHAYA_RIDGE = "sihaya_ridge",
  SHIELD_WALL = "shield_wall",
  HOLE_IN_THE_ROCK = "hole_in_the_rock",
  BASIN = "basin",
  RIM_WALL_WEST = "rim_wall_west",
  GARA_KULON = "gara_kulon",
  OLD_GAP = "old_gap",
  BROKEN_LAND = "broken_land",
  TSIMPO = "tsimpo",
  ARSUNT = "arsunt",
  PLASTIC_BASIN = "plastic_basin",
  HAGGA_BASIN = "hagga_basin",
  ROCK_OUTCROPPINGS = "rock_outcroppings",
  WIND_PASS = "wind_pass",
  BIGHT_OF_THE_CLIFF = "bight_of_the_cliff",
  FALSE_WALL_SOUTH = "false_wall_south",
  FALSE_WALL_EAST = "false_wall_east",
  HARG_PASS = "harg_pass",
}

// =============================================================================
// TERRITORY DEFINITIONS
// =============================================================================

/**
 * Force slot mapping for a specific sector within a territory.
 * Maps to SVG element IDs in the map visualization.
 */
export interface ForceSlotMapping {
  sector: number;
  slotGroupId: string; // e.g., "force-slot-meridian-sector-0"
  slotCount: number; // Number of individual slots (usually 4)
}

export interface TerritoryDefinition {
  id: TerritoryId;
  name: string;
  type: TerritoryType;
  sectors: number[]; // Which sectors (0-17) this territory spans
  adjacentTerritories: TerritoryId[];
  spiceBlowLocation?: boolean; // Can spice blow here?
  protectedFromStorm?: boolean; // Rock territories are protected
  forceSlots?: ForceSlotMapping[]; // Force slot mappings for visualization
  spiceSlotId?: string; // Spice slot SVG ID (e.g., "spice-broken-land")
}

// Stronghold territories
export const STRONGHOLD_TERRITORIES: TerritoryId[] = [
  TerritoryId.ARRAKEEN,
  TerritoryId.CARTHAG,
  TerritoryId.SIETCH_TABR,
  TerritoryId.HABBANYA_SIETCH,
  TerritoryId.TUEKS_SIETCH,
];

// Territories that grant ornithopter movement (3 territories)
export const ORNITHOPTER_TERRITORIES: TerritoryId[] = [
  TerritoryId.ARRAKEEN,
  TerritoryId.CARTHAG,
];

// The full territory map - adjacencies based on GF9 board
// Note: Sectors 0-17 go counterclockwise from storm start
export const TERRITORY_DEFINITIONS: Record<TerritoryId, TerritoryDefinition> = {
  // === STRONGHOLDS ===
  [TerritoryId.ARRAKEEN]: {
    id: TerritoryId.ARRAKEEN,
    name: "Arrakeen",
    type: TerritoryType.STRONGHOLD,
    sectors: [9],
    adjacentTerritories: [
      TerritoryId.IMPERIAL_BASIN,
      TerritoryId.HOLE_IN_THE_ROCK,
      TerritoryId.RIM_WALL_WEST,
      TerritoryId.BASIN,
    ],
    protectedFromStorm: true,
    forceSlots: [
      { sector: 9, slotGroupId: "force-slot-arrakeen-sector-9", slotCount: 4 },
    ],
  },
  [TerritoryId.CARTHAG]: {
    id: TerritoryId.CARTHAG,
    name: "Carthag",
    type: TerritoryType.STRONGHOLD,
    sectors: [10],
    adjacentTerritories: [
      TerritoryId.IMPERIAL_BASIN,
      TerritoryId.ARSUNT,
      TerritoryId.HAGGA_BASIN,
      TerritoryId.TSIMPO,
    ],
    protectedFromStorm: true,
    forceSlots: [
      { sector: 10, slotGroupId: "force-slot-carthag-sector-10", slotCount: 4 },
    ],
  },
  [TerritoryId.SIETCH_TABR]: {
    id: TerritoryId.SIETCH_TABR,
    name: "Sietch Tabr",
    type: TerritoryType.STRONGHOLD,
    sectors: [13],
    adjacentTerritories: [
      TerritoryId.FALSE_WALL_SOUTH,
      TerritoryId.FALSE_WALL_EAST,
      TerritoryId.PASTY_MESA,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 13,
        slotGroupId: "force-slot-sietch-tabr-sector-13",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.HABBANYA_SIETCH]: {
    id: TerritoryId.HABBANYA_SIETCH,
    name: "Habbanya Sietch",
    type: TerritoryType.STRONGHOLD,
    sectors: [16],
    adjacentTerritories: [
      TerritoryId.HABBANYA_ERG,
      TerritoryId.FALSE_WALL_WEST,
      TerritoryId.CIELAGO_WEST,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 16,
        slotGroupId: "force-slot-habbanya-sietch-sector-16",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.TUEKS_SIETCH]: {
    id: TerritoryId.TUEKS_SIETCH,
    name: "Tuek's Sietch",
    type: TerritoryType.STRONGHOLD,
    sectors: [4],
    adjacentTerritories: [
      TerritoryId.PASTY_MESA,
      TerritoryId.RED_CHASM,
      TerritoryId.SOUTH_MESA,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 4,
        slotGroupId: "force-slot-tueks-sietch-sector-4",
        slotCount: 4,
      },
    ],
  },

  // === SPECIAL TERRITORIES ===
  [TerritoryId.POLAR_SINK]: {
    id: TerritoryId.POLAR_SINK,
    name: "Polar Sink",
    type: TerritoryType.POLAR_SINK,
    sectors: [], // Center of map, not in any sector
    adjacentTerritories: [
      // Adjacent to many territories around the center
      TerritoryId.CIELAGO_DEPRESSION,
      TerritoryId.MERIDIAN,
      TerritoryId.CIELAGO_EAST,
      TerritoryId.HABBANYA_ERG,
      TerritoryId.WIND_PASS_NORTH,
      TerritoryId.THE_MINOR_ERG,
      TerritoryId.PASTY_MESA,
      TerritoryId.GARA_KULON,
      TerritoryId.OLD_GAP,
      TerritoryId.BROKEN_LAND,
      TerritoryId.PLASTIC_BASIN,
      TerritoryId.ROCK_OUTCROPPINGS,
      TerritoryId.BIGHT_OF_THE_CLIFF,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 0,
        slotGroupId: "force-slot-polar-sink",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.IMPERIAL_BASIN]: {
    id: TerritoryId.IMPERIAL_BASIN,
    name: "Imperial Basin",
    type: TerritoryType.SAND,
    sectors: [8, 9, 10],
    adjacentTerritories: [
      TerritoryId.ARRAKEEN,
      TerritoryId.CARTHAG,
      TerritoryId.SHIELD_WALL,
      TerritoryId.HOLE_IN_THE_ROCK,
      TerritoryId.HAGGA_BASIN,
    ],
    protectedFromStorm: true, // Special: protected from storm
    forceSlots: [
      {
        sector: 8,
        slotGroupId: "force-slot-imperial-basin-sector-8",
        slotCount: 1,
      },
      {
        sector: 9,
        slotGroupId: "force-slot-imperial-basin-sector-9",
        slotCount: 4,
      },
      {
        sector: 10,
        slotGroupId: "force-slot-imperial-basin-sector-10",
        slotCount: 4,
      },
    ],
  },

  // === SAND TERRITORIES (abbreviated - full list needed for complete game) ===
  [TerritoryId.CIELAGO_NORTH]: {
    id: TerritoryId.CIELAGO_NORTH,
    name: "Cielago North",
    type: TerritoryType.SAND,
    sectors: [0, 1, 2],
    adjacentTerritories: [
      TerritoryId.CIELAGO_SOUTH,
      TerritoryId.MERIDIAN,
      TerritoryId.CIELAGO_DEPRESSION,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      {
        sector: 0,
        slotGroupId: "force-slot-cielago-north-sector-0",
        slotCount: 4,
      },
      {
        sector: 1,
        slotGroupId: "force-slot-cielago-north-sector-1",
        slotCount: 4,
      },
      {
        sector: 2,
        slotGroupId: "force-slot-cielago-north-sector-2",
        slotCount: 4,
      },
    ],
    spiceSlotId: "spice-cielago-north",
  },
  [TerritoryId.CIELAGO_SOUTH]: {
    id: TerritoryId.CIELAGO_SOUTH,
    name: "Cielago South",
    type: TerritoryType.SAND,
    sectors: [1, 2],
    adjacentTerritories: [
      TerritoryId.CIELAGO_NORTH,
      TerritoryId.MERIDIAN,
      TerritoryId.SOUTH_MESA,
      TerritoryId.FUNERAL_PLAIN,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      {
        sector: 1,
        slotGroupId: "force-slot-cielago-south-sector-1",
        slotCount: 4,
      },
      {
        sector: 2,
        slotGroupId: "force-slot-cielago-south-sector-2",
        slotCount: 4,
      },
    ],
    spiceSlotId: "spice-cielago-south",
  },
  [TerritoryId.MERIDIAN]: {
    id: TerritoryId.MERIDIAN,
    name: "Meridian",
    type: TerritoryType.SAND,
    sectors: [0, 1],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.CIELAGO_NORTH,
      TerritoryId.CIELAGO_SOUTH,
      TerritoryId.CIELAGO_DEPRESSION,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      { sector: 0, slotGroupId: "force-slot-meridian-sector-0", slotCount: 4 },
      { sector: 1, slotGroupId: "force-slot-meridian-sector-1", slotCount: 4 },
    ],
  },
  [TerritoryId.CIELAGO_EAST]: {
    id: TerritoryId.CIELAGO_EAST,
    name: "Cielago East",
    type: TerritoryType.SAND,
    sectors: [2, 3],
    adjacentTerritories: [
      TerritoryId.CIELAGO_DEPRESSION,
      TerritoryId.CIELAGO_WEST,
      TerritoryId.FALSE_WALL_WEST,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      {
        sector: 2,
        slotGroupId: "force-slot-cielago-east-sector-2",
        slotCount: 4,
      },
      {
        sector: 3,
        slotGroupId: "force-slot-cielago-east-sector-3",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.CIELAGO_WEST]: {
    id: TerritoryId.CIELAGO_WEST,
    name: "Cielago West",
    type: TerritoryType.SAND,
    sectors: [17, 0],
    adjacentTerritories: [
      TerritoryId.CIELAGO_EAST,
      TerritoryId.HABBANYA_SIETCH,
      TerritoryId.FALSE_WALL_WEST,
    ],
    forceSlots: [
      {
        sector: 0,
        slotGroupId: "force-slot-cielago-west-sector-0",
        slotCount: 2,
      },
      {
        sector: 17,
        slotGroupId: "force-slot-cielago-west-sector-17",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.CIELAGO_DEPRESSION]: {
    id: TerritoryId.CIELAGO_DEPRESSION,
    name: "Cielago Depression",
    type: TerritoryType.SAND,
    sectors: [0, 1, 2],
    adjacentTerritories: [
      TerritoryId.CIELAGO_NORTH,
      TerritoryId.CIELAGO_EAST,
      TerritoryId.MERIDIAN,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      {
        sector: 0,
        slotGroupId: "force-slot-cielago-depression-sector-0",
        slotCount: 4,
      },
      {
        sector: 1,
        slotGroupId: "force-slot-cielago-depression-sector-1",
        slotCount: 4,
      },
      {
        sector: 2,
        slotGroupId: "force-slot-cielago-depression-sector-2",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.SOUTH_MESA]: {
    id: TerritoryId.SOUTH_MESA,
    name: "South Mesa",
    type: TerritoryType.SAND,
    sectors: [3, 4, 5],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.CIELAGO_SOUTH,
      TerritoryId.TUEKS_SIETCH,
      TerritoryId.RED_CHASM,
      TerritoryId.FUNERAL_PLAIN,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      {
        sector: 3,
        slotGroupId: "force-slot-south-mesa-sector-3",
        slotCount: 4,
      },
      {
        sector: 4,
        slotGroupId: "force-slot-south-mesa-sector-4",
        slotCount: 3,
      },
      {
        sector: 5,
        slotGroupId: "force-slot-south-mesa-sector-5",
        slotCount: 4,
      },
    ],
    spiceSlotId: "spice-south-mesa",
  },
  [TerritoryId.FUNERAL_PLAIN]: {
    id: TerritoryId.FUNERAL_PLAIN,
    name: "Funeral Plain",
    type: TerritoryType.SAND,
    sectors: [14],
    adjacentTerritories: [
      TerritoryId.CIELAGO_SOUTH,
      TerritoryId.SOUTH_MESA,
      TerritoryId.THE_GREAT_FLAT,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-funeral-plain",
    forceSlots: [
      {
        sector: 14,
        slotGroupId: "force-slot-funeral-plain-sector-14",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.THE_GREAT_FLAT]: {
    id: TerritoryId.THE_GREAT_FLAT,
    name: "The Great Flat",
    type: TerritoryType.SAND,
    sectors: [14],
    adjacentTerritories: [
      TerritoryId.FUNERAL_PLAIN,
      TerritoryId.THE_GREATER_FLAT,
      TerritoryId.HABBANYA_ERG,
      TerritoryId.FALSE_WALL_WEST,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-the-great-flat",
    forceSlots: [
      {
        sector: 14,
        slotGroupId: "force-slot-great-flat-sector-14",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.THE_GREATER_FLAT]: {
    id: TerritoryId.THE_GREATER_FLAT,
    name: "The Greater Flat",
    type: TerritoryType.SAND,
    sectors: [15],
    adjacentTerritories: [
      TerritoryId.THE_GREAT_FLAT,
      TerritoryId.HABBANYA_ERG,
      TerritoryId.WIND_PASS,
    ],
    forceSlots: [
      {
        sector: 15,
        slotGroupId: "force-slot-greater-flat-sector-15",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.HABBANYA_ERG]: {
    id: TerritoryId.HABBANYA_ERG,
    name: "Habbanya Erg",
    type: TerritoryType.SAND,
    sectors: [15, 16],
    adjacentTerritories: [
      TerritoryId.THE_GREAT_FLAT,
      TerritoryId.THE_GREATER_FLAT,
      TerritoryId.HABBANYA_SIETCH,
      TerritoryId.FALSE_WALL_WEST,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-habbanya-erg",
    forceSlots: [
      {
        sector: 15,
        slotGroupId: "force-slot-habbanya-erg-sector-15",
        slotCount: 4,
      },
      {
        sector: 16,
        slotGroupId: "force-slot-habbanya-erg-sector-16",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.HABBANYA_RIDGE_FLAT]: {
    id: TerritoryId.HABBANYA_RIDGE_FLAT,
    name: "Habbanya Ridge Flat",
    type: TerritoryType.SAND,
    sectors: [16, 17],
    adjacentTerritories: [
      TerritoryId.HABBANYA_SIETCH,
      TerritoryId.HABBANYA_ERG,
      TerritoryId.FALSE_WALL_WEST,
      TerritoryId.WIND_PASS_NORTH,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-habbanya-ridge-flat",
    forceSlots: [
      {
        sector: 16,
        slotGroupId: "force-slot-habbanya-ridge-flat-sector-16",
        slotCount: 4,
      },
      {
        sector: 17,
        slotGroupId: "force-slot-habbanya-ridge-flat-sector-17",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.FALSE_WALL_WEST]: {
    id: TerritoryId.FALSE_WALL_WEST,
    name: "False Wall West",
    type: TerritoryType.ROCK,
    sectors: [15, 16, 17],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.HABBANYA_SIETCH,
      TerritoryId.HABBANYA_ERG,
      TerritoryId.CIELAGO_EAST,
      TerritoryId.CIELAGO_WEST,
      TerritoryId.THE_GREAT_FLAT,
      TerritoryId.WIND_PASS_NORTH,
    ],
    forceSlots: [
      {
        sector: 15,
        slotGroupId: "force-slot-false-wall-west-sector-15",
        slotCount: 4,
      },
      {
        sector: 16,
        slotGroupId: "force-slot-false-wall-west-sector-16",
        slotCount: 4,
      },
      {
        sector: 17,
        slotGroupId: "force-slot-false-wall-west-sector-17",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.WIND_PASS_NORTH]: {
    id: TerritoryId.WIND_PASS_NORTH,
    name: "Wind Pass North",
    type: TerritoryType.SAND,
    sectors: [16, 17],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.FALSE_WALL_WEST,
      TerritoryId.THE_MINOR_ERG,
      TerritoryId.WIND_PASS,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-wind-pass-north",
    forceSlots: [
      {
        sector: 16,
        slotGroupId: "force-slot-wind-pass-north-sector-16",
        slotCount: 1,
      },
      {
        sector: 17,
        slotGroupId: "force-slot-wind-pass-north-sector-17",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.THE_MINOR_ERG]: {
    id: TerritoryId.THE_MINOR_ERG,
    name: "The Minor Erg",
    type: TerritoryType.SAND,
    sectors: [4, 5, 6, 7],
    adjacentTerritories: [
      TerritoryId.WIND_PASS_NORTH,
      TerritoryId.PASTY_MESA,
      TerritoryId.BIGHT_OF_THE_CLIFF,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      { sector: 4, slotGroupId: "force-slot-minor-erg-sector-4", slotCount: 1 },
      { sector: 5, slotGroupId: "force-slot-minor-erg-sector-5", slotCount: 4 },
      { sector: 6, slotGroupId: "force-slot-minor-erg-sector-6", slotCount: 4 },
      { sector: 7, slotGroupId: "force-slot-minor-erg-sector-7", slotCount: 2 },
    ],
    spiceSlotId: "spice-the-minor-erg",
  },
  [TerritoryId.PASTY_MESA]: {
    id: TerritoryId.PASTY_MESA,
    name: "Pasty Mesa",
    type: TerritoryType.ROCK,
    sectors: [4, 5, 6, 7],
    adjacentTerritories: [
      TerritoryId.TUEKS_SIETCH,
      TerritoryId.SIETCH_TABR,
      TerritoryId.THE_MINOR_ERG,
      TerritoryId.SHIELD_WALL,
      TerritoryId.FALSE_WALL_EAST,
      TerritoryId.POLAR_SINK,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 4,
        slotGroupId: "force-slot-pasty-mesa-sector-4",
        slotCount: 2,
      },
      {
        sector: 5,
        slotGroupId: "force-slot-pasty-mesa-sector-5",
        slotCount: 4,
      },
      {
        sector: 6,
        slotGroupId: "force-slot-pasty-mesa-sector-6",
        slotCount: 4,
      },
      {
        sector: 7,
        slotGroupId: "force-slot-pasty-mesa-sector-7",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.RED_CHASM]: {
    id: TerritoryId.RED_CHASM,
    name: "Red Chasm",
    type: TerritoryType.SAND,
    sectors: [6],
    adjacentTerritories: [
      TerritoryId.SOUTH_MESA,
      TerritoryId.TUEKS_SIETCH,
      TerritoryId.SIHAYA_RIDGE,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      { sector: 6, slotGroupId: "force-slot-red-chasm-sector-6", slotCount: 4 },
    ],
    spiceSlotId: "spice-red-chasm",
  },
  [TerritoryId.SIHAYA_RIDGE]: {
    id: TerritoryId.SIHAYA_RIDGE,
    name: "Sihaya Ridge",
    type: TerritoryType.SAND,
    sectors: [7],
    adjacentTerritories: [
      TerritoryId.RED_CHASM,
      TerritoryId.SHIELD_WALL,
      TerritoryId.HOLE_IN_THE_ROCK,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      {
        sector: 7,
        slotGroupId: "force-slot-sihaya-ridge-sector-7",
        slotCount: 4,
      },
    ],
    spiceSlotId: "spice-sihaya-ridge",
  },
  [TerritoryId.SHIELD_WALL]: {
    id: TerritoryId.SHIELD_WALL,
    name: "Shield Wall",
    type: TerritoryType.ROCK,
    sectors: [7, 8],
    adjacentTerritories: [
      TerritoryId.PASTY_MESA,
      TerritoryId.SIHAYA_RIDGE,
      TerritoryId.HOLE_IN_THE_ROCK,
      TerritoryId.IMPERIAL_BASIN,
      TerritoryId.GARA_KULON,
    ],
    protectedFromStorm: true,
    forceSlots: [
      {
        sector: 7,
        slotGroupId: "force-slot-shield-wall-sector-7",
        slotCount: 2,
      },
      {
        sector: 8,
        slotGroupId: "force-slot-shield-wall-sector-8",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.HOLE_IN_THE_ROCK]: {
    id: TerritoryId.HOLE_IN_THE_ROCK,
    name: "Hole In The Rock",
    type: TerritoryType.SAND,
    sectors: [8],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.SIHAYA_RIDGE,
      TerritoryId.SHIELD_WALL,
      TerritoryId.ARRAKEEN,
      TerritoryId.RIM_WALL_WEST,
      TerritoryId.IMPERIAL_BASIN,
    ],
    forceSlots: [
      {
        sector: 8,
        slotGroupId: "force-slot-hole-in-the-rock-sector-8",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.BASIN]: {
    id: TerritoryId.BASIN,
    name: "Basin",
    type: TerritoryType.SAND,
    sectors: [7],
    adjacentTerritories: [
      TerritoryId.ARRAKEEN,
      TerritoryId.RIM_WALL_WEST,
      TerritoryId.OLD_GAP,
    ],
    forceSlots: [
      { sector: 7, slotGroupId: "force-slot-basin-sector-7", slotCount: 4 },
    ],
  },
  [TerritoryId.RIM_WALL_WEST]: {
    id: TerritoryId.RIM_WALL_WEST,
    name: "Rim Wall West",
    type: TerritoryType.ROCK,
    sectors: [8],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.ARRAKEEN,
      TerritoryId.HOLE_IN_THE_ROCK,
      TerritoryId.BASIN,
      TerritoryId.GARA_KULON,
    ],
    forceSlots: [
      {
        sector: 8,
        slotGroupId: "force-slot-rim-wall-west-sector-8",
        slotCount: 2,
      },
    ],
  },
  [TerritoryId.GARA_KULON]: {
    id: TerritoryId.GARA_KULON,
    name: "Gara Kulon",
    type: TerritoryType.SAND,
    sectors: [7],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.SHIELD_WALL,
      TerritoryId.RIM_WALL_WEST,
      TerritoryId.OLD_GAP,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      {
        sector: 7,
        slotGroupId: "force-slot-gara-kulon-sector-7",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.OLD_GAP]: {
    id: TerritoryId.OLD_GAP,
    name: "Old Gap",
    type: TerritoryType.SAND,
    sectors: [8, 9, 10],
    adjacentTerritories: [
      TerritoryId.BASIN,
      TerritoryId.GARA_KULON,
      TerritoryId.BROKEN_LAND,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      { sector: 8, slotGroupId: "force-slot-old-gap-sector-8", slotCount: 1 },
      { sector: 9, slotGroupId: "force-slot-old-gap-sector-9", slotCount: 4 },
      { sector: 10, slotGroupId: "force-slot-old-gap-sector-10", slotCount: 2 },
    ],
    spiceSlotId: "spice-old-gap",
  },
  [TerritoryId.BROKEN_LAND]: {
    id: TerritoryId.BROKEN_LAND,
    name: "Broken Land",
    type: TerritoryType.SAND,
    sectors: [10, 11],
    adjacentTerritories: [
      TerritoryId.OLD_GAP,
      TerritoryId.TSIMPO,
      TerritoryId.PLASTIC_BASIN,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    forceSlots: [
      {
        sector: 10,
        slotGroupId: "force-slot-broken-land-sector-10",
        slotCount: 4,
      },
      {
        sector: 11,
        slotGroupId: "force-slot-broken-land-sector-11",
        slotCount: 4,
      },
    ],
    spiceSlotId: "spice-broken-land",
  },
  [TerritoryId.TSIMPO]: {
    id: TerritoryId.TSIMPO,
    name: "Tsimpo",
    type: TerritoryType.SAND,
    sectors: [10, 11, 12],
    adjacentTerritories: [
      TerritoryId.CARTHAG,
      TerritoryId.BROKEN_LAND,
      TerritoryId.ARSUNT,
      TerritoryId.PLASTIC_BASIN,
    ],
    forceSlots: [
      { sector: 10, slotGroupId: "force-slot-tsimpo-sector-10", slotCount: 4 },
      { sector: 11, slotGroupId: "force-slot-tsimpo-sector-11", slotCount: 4 },
      { sector: 12, slotGroupId: "force-slot-tsimpo-sector-12", slotCount: 1 },
    ],
  },
  [TerritoryId.ARSUNT]: {
    id: TerritoryId.ARSUNT,
    name: "Arsunt",
    type: TerritoryType.SAND,
    sectors: [10, 11],
    adjacentTerritories: [
      TerritoryId.CARTHAG,
      TerritoryId.TSIMPO,
      TerritoryId.HAGGA_BASIN,
    ],
    forceSlots: [
      { sector: 10, slotGroupId: "force-slot-arsunt-sector-10", slotCount: 4 },
      { sector: 11, slotGroupId: "force-slot-arsunt-sector-11", slotCount: 4 },
    ],
  },
  [TerritoryId.PLASTIC_BASIN]: {
    id: TerritoryId.PLASTIC_BASIN,
    name: "Plastic Basin",
    type: TerritoryType.ROCK,
    sectors: [11, 12, 13],
    adjacentTerritories: [
      TerritoryId.BROKEN_LAND,
      TerritoryId.TSIMPO,
      TerritoryId.ROCK_OUTCROPPINGS,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      {
        sector: 11,
        slotGroupId: "force-slot-plastic-basin-sector-11",
        slotCount: 4,
      },
      {
        sector: 12,
        slotGroupId: "force-slot-plastic-basin-sector-12",
        slotCount: 4,
      },
      {
        sector: 13,
        slotGroupId: "force-slot-plastic-basin-sector-13",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.HAGGA_BASIN]: {
    id: TerritoryId.HAGGA_BASIN,
    name: "Hagga Basin",
    type: TerritoryType.SAND,
    sectors: [11, 12],
    adjacentTerritories: [
      TerritoryId.CARTHAG,
      TerritoryId.IMPERIAL_BASIN,
      TerritoryId.ARSUNT,
      TerritoryId.ROCK_OUTCROPPINGS,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-hagga-basin",
    forceSlots: [
      {
        sector: 11,
        slotGroupId: "force-slot-hagga-basin-sector-11",
        slotCount: 4,
      },
      {
        sector: 12,
        slotGroupId: "force-slot-hagga-basin-sector-12",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.ROCK_OUTCROPPINGS]: {
    id: TerritoryId.ROCK_OUTCROPPINGS,
    name: "Rock Outcroppings",
    type: TerritoryType.SAND,
    sectors: [12, 13],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.PLASTIC_BASIN,
      TerritoryId.HAGGA_BASIN,
      TerritoryId.BIGHT_OF_THE_CLIFF,
      TerritoryId.POLAR_SINK,
    ],
    spiceBlowLocation: true,
    spiceSlotId: "spice-rock-outcroppings",
    forceSlots: [
      {
        sector: 12,
        slotGroupId: "force-slot-rock-outcroppings-sector-12",
        slotCount: 4,
      },
      {
        sector: 13,
        slotGroupId: "force-slot-rock-outcroppings-sector-13",
        slotCount: 3,
      },
    ],
  },
  [TerritoryId.WIND_PASS]: {
    id: TerritoryId.WIND_PASS,
    name: "Wind Pass",
    type: TerritoryType.SAND,
    sectors: [13, 14, 15, 16],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.WIND_PASS_NORTH,
      TerritoryId.THE_GREATER_FLAT,
      TerritoryId.BIGHT_OF_THE_CLIFF,
    ],
    forceSlots: [
      {
        sector: 13,
        slotGroupId: "force-slot-wind-pass-sector-13",
        slotCount: 2,
      },
      {
        sector: 14,
        slotGroupId: "force-slot-wind-pass-sector-14",
        slotCount: 2,
      },
      {
        sector: 15,
        slotGroupId: "force-slot-wind-pass-sector-15",
        slotCount: 2,
      },
      {
        sector: 16,
        slotGroupId: "force-slot-wind-pass-sector-16",
        slotCount: 2,
      },
    ],
  },
  [TerritoryId.BIGHT_OF_THE_CLIFF]: {
    id: TerritoryId.BIGHT_OF_THE_CLIFF,
    name: "Bight of the Cliff",
    type: TerritoryType.SAND,
    sectors: [13, 14],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.THE_MINOR_ERG,
      TerritoryId.WIND_PASS,
      TerritoryId.ROCK_OUTCROPPINGS,
      TerritoryId.POLAR_SINK,
    ],
    forceSlots: [
      {
        sector: 13,
        slotGroupId: "force-slot-bight-of-the-cliff-sector-13",
        slotCount: 3,
      },
      {
        sector: 14,
        slotGroupId: "force-slot-bight-of-the-cliff-sector-14",
        slotCount: 3,
      },
    ],
  },
  [TerritoryId.FALSE_WALL_SOUTH]: {
    id: TerritoryId.FALSE_WALL_SOUTH,
    name: "False Wall South",
    type: TerritoryType.ROCK,
    sectors: [3, 4],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.SIETCH_TABR,
      TerritoryId.FALSE_WALL_EAST,
      TerritoryId.HARG_PASS,
    ],
    forceSlots: [
      {
        sector: 3,
        slotGroupId: "force-slot-false-wall-south-sector-3",
        slotCount: 4,
      },
      {
        sector: 4,
        slotGroupId: "force-slot-false-wall-south-sector-4",
        slotCount: 4,
      },
    ],
  },
  [TerritoryId.FALSE_WALL_EAST]: {
    id: TerritoryId.FALSE_WALL_EAST,
    name: "False Wall East",
    type: TerritoryType.ROCK,
    sectors: [4, 5, 6, 7, 8],
    protectedFromStorm: true,
    adjacentTerritories: [
      TerritoryId.SIETCH_TABR,
      TerritoryId.FALSE_WALL_SOUTH,
      TerritoryId.PASTY_MESA,
    ],
    forceSlots: [
      {
        sector: 4,
        slotGroupId: "force-slot-false-wall-east-sector-4",
        slotCount: 2,
      },
      {
        sector: 5,
        slotGroupId: "force-slot-false-wall-east-sector-5",
        slotCount: 2,
      },
      {
        sector: 6,
        slotGroupId: "force-slot-false-wall-east-sector-6",
        slotCount: 2,
      },
      {
        sector: 7,
        slotGroupId: "force-slot-false-wall-east-sector-7",
        slotCount: 2,
      },
      {
        sector: 8,
        slotGroupId: "force-slot-false-wall-east-sector-8",
        slotCount: 1,
      },
    ],
  },
  [TerritoryId.HARG_PASS]: {
    id: TerritoryId.HARG_PASS,
    name: "Harg Pass",
    type: TerritoryType.SAND,
    sectors: [3, 4],
    protectedFromStorm: true,
    forceSlots: [
      { sector: 3, slotGroupId: "force-slot-harg-pass-sector-3", slotCount: 2 },
      { sector: 4, slotGroupId: "force-slot-harg-pass-sector-4", slotCount: 1 },
    ],
    adjacentTerritories: [
      TerritoryId.FALSE_WALL_SOUTH,
      TerritoryId.SIHAYA_RIDGE,
    ],
  },
};

// Helper to get all territory IDs
export const ALL_TERRITORY_IDS = Object.values(TerritoryId);

// Helper to check if territory is stronghold
export function isStronghold(territoryId: TerritoryId): boolean {
  return STRONGHOLD_TERRITORIES.includes(territoryId);
}

// Helper to check if territory provides ornithopter access
export function providesOrnithopters(territoryId: TerritoryId): boolean {
  return ORNITHOPTER_TERRITORIES.includes(territoryId);
}
