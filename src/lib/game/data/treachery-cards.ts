/**
 * Treachery card definitions for the base game.
 * Based on GF9 Dune Classic Rules Section 3.01.
 */

import { TreacheryCardType, type TreacheryCardDefinition } from '../types';

// =============================================================================
// WEAPON CARDS - PROJECTILE
// =============================================================================

export const PROJECTILE_WEAPONS: TreacheryCardDefinition[] = [
  {
    id: 'crysknife',
    name: 'Crysknife',
    type: TreacheryCardType.WEAPON_PROJECTILE,
    description: 'Kills opponent\'s leader. Opponent may protect with Projectile Defense.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'maula_pistol',
    name: 'Maula Pistol',
    type: TreacheryCardType.WEAPON_PROJECTILE,
    description: 'Kills opponent\'s leader. Opponent may protect with Projectile Defense.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'slip_tip',
    name: 'Slip Tip',
    type: TreacheryCardType.WEAPON_PROJECTILE,
    description: 'Kills opponent\'s leader. Opponent may protect with Projectile Defense.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'stunner',
    name: 'Stunner',
    type: TreacheryCardType.WEAPON_PROJECTILE,
    description: 'Kills opponent\'s leader. Opponent may protect with Projectile Defense.',
    isProjectile: true,
    discardAfterUse: false,
  },
];

// =============================================================================
// WEAPON CARDS - POISON
// =============================================================================

export const POISON_WEAPONS: TreacheryCardDefinition[] = [
  {
    id: 'chaumas',
    name: 'Chaumas',
    type: TreacheryCardType.WEAPON_POISON,
    description: 'Kills opponent\'s leader. Opponent may protect with Poison Defense.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'chaumurky',
    name: 'Chaumurky',
    type: TreacheryCardType.WEAPON_POISON,
    description: 'Kills opponent\'s leader. Opponent may protect with Poison Defense.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'ellaca_drug',
    name: 'Ellaca Drug',
    type: TreacheryCardType.WEAPON_POISON,
    description: 'Kills opponent\'s leader. Opponent may protect with Poison Defense.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'gom_jabbar',
    name: 'Gom Jabbar',
    type: TreacheryCardType.WEAPON_POISON,
    description: 'Kills opponent\'s leader. Opponent may protect with Poison Defense.',
    isPoison: true,
    discardAfterUse: false,
  },
];

// =============================================================================
// WEAPON CARDS - SPECIAL
// =============================================================================

export const SPECIAL_WEAPONS: TreacheryCardDefinition[] = [
  {
    id: 'lasgun',
    name: 'Lasgun',
    type: TreacheryCardType.WEAPON_SPECIAL,
    description: 'Kills opponent\'s leader. No defense. If Shield played, lasgun/shield explosion destroys everything in territory.',
    isSpecial: true,
    discardAfterUse: false,
  },
];

// =============================================================================
// DEFENSE CARDS
// =============================================================================

export const DEFENSE_CARDS: TreacheryCardDefinition[] = [
  {
    id: 'shield_1',
    name: 'Shield',
    type: TreacheryCardType.DEFENSE_PROJECTILE,
    description: 'Protects your leader from a projectile weapon.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'shield_2',
    name: 'Shield',
    type: TreacheryCardType.DEFENSE_PROJECTILE,
    description: 'Protects your leader from a projectile weapon.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'shield_3',
    name: 'Shield',
    type: TreacheryCardType.DEFENSE_PROJECTILE,
    description: 'Protects your leader from a projectile weapon.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'shield_4',
    name: 'Shield',
    type: TreacheryCardType.DEFENSE_PROJECTILE,
    description: 'Protects your leader from a projectile weapon.',
    isProjectile: true,
    discardAfterUse: false,
  },
  {
    id: 'snooper_1',
    name: 'Snooper',
    type: TreacheryCardType.DEFENSE_POISON,
    description: 'Protects your leader from a poison weapon.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'snooper_2',
    name: 'Snooper',
    type: TreacheryCardType.DEFENSE_POISON,
    description: 'Protects your leader from a poison weapon.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'snooper_3',
    name: 'Snooper',
    type: TreacheryCardType.DEFENSE_POISON,
    description: 'Protects your leader from a poison weapon.',
    isPoison: true,
    discardAfterUse: false,
  },
  {
    id: 'snooper_4',
    name: 'Snooper',
    type: TreacheryCardType.DEFENSE_POISON,
    description: 'Protects your leader from a poison weapon.',
    isPoison: true,
    discardAfterUse: false,
  },
];

// =============================================================================
// SPECIAL CARDS
// =============================================================================

export const SPECIAL_CARDS: TreacheryCardDefinition[] = [
  {
    id: 'cheap_hero_1',
    name: 'Cheap Hero',
    type: TreacheryCardType.SPECIAL,
    description: 'Play as a leader with zero strength. Can use weapon and defense. Must play when no leaders available.',
    discardAfterUse: true,
  },
  {
    id: 'cheap_hero_2',
    name: 'Cheap Hero',
    type: TreacheryCardType.SPECIAL,
    description: 'Play as a leader with zero strength. Can use weapon and defense. Must play when no leaders available.',
    discardAfterUse: true,
  },
  {
    id: 'cheap_hero_3',
    name: 'Cheap Hero',
    type: TreacheryCardType.SPECIAL,
    description: 'Play as a leader with zero strength. Can use weapon and defense. Must play when no leaders available.',
    discardAfterUse: true,
  },
  {
    id: 'family_atomics',
    name: 'Family Atomics',
    type: TreacheryCardType.SPECIAL,
    description: 'Destroy Shield Wall. Imperial Basin, Arrakeen, and Carthag no longer protected from Storm.',
    isSpecial: true,
    discardAfterUse: false, // Set aside after use
  },
  {
    id: 'hajr',
    name: 'Hajr',
    type: TreacheryCardType.SPECIAL,
    description: 'Gain an extra Force movement action.',
    discardAfterUse: true,
  },
  {
    id: 'karama_1',
    name: 'Karama',
    type: TreacheryCardType.SPECIAL,
    description: 'Cancel or prevent faction ability, buy at Guild rates, bid more than you have, or use faction Karama power.',
    discardAfterUse: true,
  },
  {
    id: 'karama_2',
    name: 'Karama',
    type: TreacheryCardType.SPECIAL,
    description: 'Cancel or prevent faction ability, buy at Guild rates, bid more than you have, or use faction Karama power.',
    discardAfterUse: true,
  },
  {
    id: 'tleilaxu_ghola',
    name: 'Tleilaxu Ghola',
    type: TreacheryCardType.SPECIAL,
    description: 'Revive 1 leader or up to 5 Forces for free, in addition to normal revival.',
    discardAfterUse: true,
  },
  {
    id: 'truthtrance_1',
    name: 'Truthtrance',
    type: TreacheryCardType.SPECIAL,
    description: 'Ask one other player a single yes/no question. They must answer truthfully.',
    discardAfterUse: true,
  },
  {
    id: 'truthtrance_2',
    name: 'Truthtrance',
    type: TreacheryCardType.SPECIAL,
    description: 'Ask one other player a single yes/no question. They must answer truthfully.',
    discardAfterUse: true,
  },
  {
    id: 'weather_control',
    name: 'Weather Control',
    type: TreacheryCardType.SPECIAL,
    description: 'Control the storm this Phase - move it 1-10 sectors or stop it from moving.',
    discardAfterUse: true,
  },
];

// =============================================================================
// WORTHLESS CARDS
// =============================================================================

export const WORTHLESS_CARDS: TreacheryCardDefinition[] = [
  {
    id: 'baliset',
    name: 'Baliset',
    type: TreacheryCardType.WORTHLESS,
    description: 'Play in place of a weapon, defense, or both. No value.',
    discardAfterUse: true, // Discarded when played in battle plan
  },
  {
    id: 'jubba_cloak',
    name: 'Jubba Cloak',
    type: TreacheryCardType.WORTHLESS,
    description: 'Play in place of a weapon, defense, or both. No value.',
    discardAfterUse: true,
  },
  {
    id: 'kulon',
    name: 'Kulon',
    type: TreacheryCardType.WORTHLESS,
    description: 'Play in place of a weapon, defense, or both. No value.',
    discardAfterUse: true,
  },
  {
    id: 'la_la_la',
    name: 'La, La, La',
    type: TreacheryCardType.WORTHLESS,
    description: 'Play in place of a weapon, defense, or both. No value.',
    discardAfterUse: true,
  },
  {
    id: 'trip_to_gamont',
    name: 'Trip to Gamont',
    type: TreacheryCardType.WORTHLESS,
    description: 'Play in place of a weapon, defense, or both. No value.',
    discardAfterUse: true,
  },
];

// =============================================================================
// ALL TREACHERY CARDS
// =============================================================================

export const ALL_TREACHERY_CARDS: TreacheryCardDefinition[] = [
  ...PROJECTILE_WEAPONS,
  ...POISON_WEAPONS,
  ...SPECIAL_WEAPONS,
  ...DEFENSE_CARDS,
  ...SPECIAL_CARDS,
  ...WORTHLESS_CARDS,
];

// Card lookup by ID
export const TREACHERY_CARD_BY_ID: Record<string, TreacheryCardDefinition> = Object.fromEntries(
  ALL_TREACHERY_CARDS.map((card) => [card.id, card])
);

// Get card definition by ID
export function getTreacheryCardDefinition(cardId: string): TreacheryCardDefinition | undefined {
  return TREACHERY_CARD_BY_ID[cardId];
}

// Helper to check card type
export function isWeaponCard(card: TreacheryCardDefinition): boolean {
  return [
    TreacheryCardType.WEAPON_PROJECTILE,
    TreacheryCardType.WEAPON_POISON,
    TreacheryCardType.WEAPON_SPECIAL,
  ].includes(card.type);
}

export function isDefenseCard(card: TreacheryCardDefinition): boolean {
  return [
    TreacheryCardType.DEFENSE_PROJECTILE,
    TreacheryCardType.DEFENSE_POISON,
  ].includes(card.type);
}

export function isProjectileDefense(card: TreacheryCardDefinition): boolean {
  return card.type === TreacheryCardType.DEFENSE_PROJECTILE;
}

export function isPoisonDefense(card: TreacheryCardDefinition): boolean {
  return card.type === TreacheryCardType.DEFENSE_POISON;
}

export function isKaramaCard(card: TreacheryCardDefinition): boolean {
  return card.id.startsWith('karama');
}

export function isCheapHero(card: TreacheryCardDefinition): boolean {
  return card.id.startsWith('cheap_hero');
}

export function isWorthless(card: TreacheryCardDefinition): boolean {
  return card.type === TreacheryCardType.WORTHLESS;
}
