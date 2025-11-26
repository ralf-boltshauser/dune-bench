/**
 * Public exports for game data.
 * Import from '@/lib/game/data' to access all static game data.
 */

// Leaders
export {
  ATREIDES_LEADERS,
  BENE_GESSERIT_LEADERS,
  EMPEROR_LEADERS,
  FREMEN_LEADERS,
  HARKONNEN_LEADERS,
  SPACING_GUILD_LEADERS,
  ALL_LEADERS,
  LEADER_BY_ID,
  LEADERS_BY_FACTION,
  getLeaderDefinition,
  getLeadersForFaction,
} from './leaders';

// Treachery Cards
export {
  PROJECTILE_WEAPONS,
  POISON_WEAPONS,
  SPECIAL_WEAPONS,
  DEFENSE_CARDS,
  SPECIAL_CARDS,
  WORTHLESS_CARDS,
  ALL_TREACHERY_CARDS,
  TREACHERY_CARD_BY_ID,
  getTreacheryCardDefinition,
  isWeaponCard,
  isDefenseCard,
  isProjectileDefense,
  isPoisonDefense,
  isKaramaCard,
  isCheapHero,
  isWorthless,
} from './treachery-cards';

// Spice Cards
export {
  TERRITORY_SPICE_CARDS,
  SHAI_HULUD_CARDS,
  ALL_SPICE_CARDS,
  SPICE_CARD_BY_ID,
  getSpiceCardDefinition,
  isShaiHulud,
} from './spice-cards';

// Faction Configuration
export {
  type FactionConfig,
  type StartingForce,
  ATREIDES_CONFIG,
  BENE_GESSERIT_CONFIG,
  EMPEROR_CONFIG,
  FREMEN_CONFIG,
  HARKONNEN_CONFIG,
  SPACING_GUILD_CONFIG,
  FACTION_CONFIGS,
  getFactionConfig,
  GAME_CONSTANTS,
} from './faction-config';
