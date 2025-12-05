/**
 * Test Fixtures
 * 
 * Reusable test data constants for mutation tests.
 * Single source of truth for common test values.
 */

import { Faction, TerritoryId } from '../../../types';
import { ALL_LEADERS } from '../../../data';

/**
 * Common leader IDs for testing
 */
export const TEST_LEADERS = {
  ATREIDES: {
    LETTO: 'duke-letto',
    JESSICA: 'lady-jessica',
    GURNEY: 'gurney-halleck',
    DUNCAN: 'duncan-idaho',
    THUFIR: 'thufir-hawat',
  },
  HARKONNEN: {
    BARON: 'baron-vladimir',
    FEYD: 'feyd-rautha',
    BEAST: 'beast-rabban',
    PIETER: 'pieter-de-vries',
  },
  BENE_GESSERIT: {
    MOHIAM: 'reverend-mother-mohiam',
    WANNA: 'wanna-marcus',
    MARGOT: 'margot-lady-fenring',
  },
  EMPEROR: {
    SHADDAM: 'padishah-emperor-shaddam-iv',
    HASIMIR: 'hasimir-fenring',
  },
  FREMEN: {
    STILGAR: 'stilgar',
    CHANI: 'chani',
    OTHEYM: 'otheym',
  },
  SPACING_GUILD: {
    ESMAR: 'esmar-tuek',
  },
} as const;

/**
 * Common treachery card IDs for testing
 */
export const TEST_CARDS = {
  KARAMA: 'karama',
  SHIELD: 'shield',
  LASGUN: 'lasgun',
  CRYSKNIFE: 'crysknife',
  STUNNER: 'stunner',
  SNOOPER: 'snooper',
  CHAUMAS: 'chaumas',
  GOM_JABBAR: 'gom-jabbar',
  CHEAP_HERO: 'cheap-hero',
  TRIP_TO_GAMONT: 'trip-to-gamont',
  BALISET: 'baliset',
  JUBBA_CLOAK: 'jubba-cloak',
} as const;

/**
 * Common territory IDs for testing
 */
export const TEST_TERRITORIES = {
  STRONGHOLD: TerritoryId.ARRAKEEN,
  STRONGHOLD_2: TerritoryId.CARTHAG,
  NON_STRONGHOLD: TerritoryId.GREAT_FLAT,
  POLAR_SINK: TerritoryId.POLAR_SINK,
  SAND_TERRITORY: TerritoryId.ROCK_OUTCROPPINGS,
} as const;

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG = {
  factions: [Faction.ATREIDES, Faction.HARKONNEN] as Faction[],
  spice: 20,
  forces: { regular: 10, elite: 0 },
  turn: 1,
} as const;

/**
 * Get leader ID by faction and index
 */
export function getTestLeader(faction: Faction, index: number = 0): string {
  const leaders = ALL_LEADERS.filter((l) => l.faction === faction);
  if (leaders.length === 0) {
    throw new Error(`No leaders found for faction: ${faction}`);
  }
  if (index >= leaders.length) {
    throw new Error(`Leader index ${index} out of range for ${faction}`);
  }
  return leaders[index].id;
}

/**
 * Get card ID by type (for testing)
 */
export function getTestCard(type: string): string {
  const card = Object.values(TEST_CARDS).find((id) => id.includes(type.toLowerCase()));
  if (!card) {
    throw new Error(`Test card not found for type: ${type}`);
  }
  return card;
}

