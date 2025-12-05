/**
 * Shared Test Data Constants
 * 
 * Centralized test data for reuse across all test suites.
 */

import { Faction, TerritoryId } from '../../../types';

/**
 * Leader IDs by faction
 */
export const TestLeaders = {
  [Faction.ATREIDES]: ['paul_atreides', 'duncan_idaho', 'gurney_halleck', 'thufir_hawat'],
  [Faction.BENE_GESSERIT]: ['lady_jessica', 'wanna_yueh', 'princess_irulan'],
  [Faction.EMPEROR]: ['shaddam_iv', 'hasimir_fenring', 'bashar'],
  [Faction.FREMEN]: ['stilgar', 'chani', 'otheym'],
  [Faction.HARKONNEN]: ['feyd_rautha', 'beast_rabban', 'piter_de_vries'],
  [Faction.SPACING_GUILD]: ['esmar_tuek', 'soo_soo_sook'],
};

/**
 * Treachery Card IDs by type
 */
export const TestCards = {
  weapons: {
    poison: ['chaumas', 'chaumurky', 'gom_jabbar', 'ellaca_drug'],
    projectile: ['crysknife', 'maula_pistol', 'slip_tip', 'stunner'],
    special: ['lasgun'],
  },
  defenses: {
    poison: ['snooper'],
    projectile: ['shield'],
  },
  worthless: ['baliset', 'jubba_cloak', 'kulon', 'la_la_la', 'trip_to_gamont'],
  special: ['cheap_hero', 'karama', 'tleilaxu_ghola', 'truthtrance', 'weather_control', 'family_atomics', 'hajr'],
};

/**
 * Territory constants
 */
export const TestTerritories = {
  strongholds: [
    TerritoryId.ARRAKEEN,
    TerritoryId.CARTHAG,
    TerritoryId.TUEKS_SIETCH,
    TerritoryId.SIETCH_TABR,
    TerritoryId.HABBANYA_SIETCH,
  ],
  polarSink: TerritoryId.POLAR_SINK,
  sand: [
    TerritoryId.ROCK_OUTCROPPINGS,
    TerritoryId.THE_GREAT_FLAT,
    TerritoryId.OLD_GAP,
    TerritoryId.SOUTH_MESA,
    TerritoryId.FALSE_WALL_WEST,
    TerritoryId.FALSE_WALL_SOUTH,
    TerritoryId.FALSE_WALL_EAST,
    TerritoryId.CIELAGO_NORTH,
    TerritoryId.CIELAGO_SOUTH,
    TerritoryId.IMPERIAL_BASIN,
    TerritoryId.BASIN,
    TerritoryId.HABBANYA_RIDGE_FLAT,
    TerritoryId.ROCK_OUTCROPPINGS,
  ],
};

/**
 * Default sector for battles (most common)
 */
export const DEFAULT_SECTOR = 9;

/**
 * Default spice amounts for testing
 */
export const DefaultSpice = new Map<Faction, number>([
  [Faction.ATREIDES, 20],
  [Faction.BENE_GESSERIT, 15],
  [Faction.FREMEN, 10],
  [Faction.HARKONNEN, 25],
  [Faction.EMPEROR, 30],
  [Faction.SPACING_GUILD, 5],
]);

