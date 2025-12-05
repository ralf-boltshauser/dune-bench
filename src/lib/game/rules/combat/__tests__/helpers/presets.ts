/**
 * Test Presets for Combat Rules Tests
 * 
 * Common test scenarios and data.
 */

import { Faction, TerritoryId, TreacheryCardType } from '../../../../types/index.js';

/**
 * Common card IDs for testing
 */
export const TEST_CARDS = {
  WEAPONS: {
    CRYSKNIFE: 'crysknife',
    MAULA_PISTOL: 'maula_pistol',
    CHAUMAS: 'chaumas',
    LASGUN: 'lasgun',
    ELLACA_DRUG: 'ellaca_drug',
  },
  DEFENSES: {
    SHIELD: 'shield_1', // Use shield_1, shield_2, shield_3, or shield_4
    SNOOPER: 'snooper_1', // Use snooper_1, snooper_2, snooper_3, or snooper_4
    SHIELD_SNOOPER: 'shield_1', // Shield Snooper is just a shield for explosion purposes
  },
  WORTHLESS: {
    BALISET: 'baliset',
    JUBBA_CLOAK: 'jubba_cloak',
  },
  SPECIAL: {
    CHEAP_HERO: 'cheap_hero_1',
  },
} as const;

/**
 * Common leader IDs for testing
 */
export const TEST_LEADERS = {
  ATREIDES: {
    LADY_JESSICA: 'lady_jessica',
    THUFIR_HAWAT: 'thufir_hawat',
    GURNEY_HALLECK: 'gurney_halleck',
  },
  HARKONNEN: {
    FEYD_RAUTHA: 'feyd_rautha',
    BEAST_RABBAN: 'beast_rabban',
    PITER_DE_VRIES: 'piter_de_vries',
  },
  FREMEN: {
    STILGAR: 'stilgar',
  },
  EMPEROR: {
    HASIMIR_FENRING: 'hasimir_fenring',
  },
} as const;

/**
 * Common territories for testing
 */
export const TEST_TERRITORIES = {
  ARRAKEEN: TerritoryId.ARRAKEEN,
  CARTHAG: TerritoryId.CARTHAG,
  POLAR_SINK: TerritoryId.POLAR_SINK,
} as const;

