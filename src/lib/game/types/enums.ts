/**
 * Core enums for the Dune GF9 game simulation.
 * These are the fundamental building blocks that all other types depend on.
 */

// =============================================================================
// FACTIONS
// =============================================================================

export enum Faction {
  ATREIDES = 'atreides',
  BENE_GESSERIT = 'bene_gesserit',
  EMPEROR = 'emperor',
  FREMEN = 'fremen',
  HARKONNEN = 'harkonnen',
  SPACING_GUILD = 'spacing_guild',
}

// Faction display names for logging/UI
export const FACTION_NAMES: Record<Faction, string> = {
  [Faction.ATREIDES]: 'Atreides',
  [Faction.BENE_GESSERIT]: 'Bene Gesserit',
  [Faction.EMPEROR]: 'Emperor',
  [Faction.FREMEN]: 'Fremen',
  [Faction.HARKONNEN]: 'Harkonnen',
  [Faction.SPACING_GUILD]: 'Spacing Guild',
};

// =============================================================================
// GAME PHASES
// =============================================================================

export enum Phase {
  SETUP = 'setup', // Pre-game setup (traitor selection, BG prediction) - runs once
  STORM = 'storm',
  SPICE_BLOW = 'spice_blow',
  CHOAM_CHARITY = 'choam_charity',
  BIDDING = 'bidding',
  REVIVAL = 'revival',
  SHIPMENT_MOVEMENT = 'shipment_movement',
  BATTLE = 'battle',
  SPICE_COLLECTION = 'spice_collection',
  MENTAT_PAUSE = 'mentat_pause',
}

// Phase order for iteration
export const PHASE_ORDER: Phase[] = [
  Phase.STORM,
  Phase.SPICE_BLOW,
  Phase.CHOAM_CHARITY,
  Phase.BIDDING,
  Phase.REVIVAL,
  Phase.SHIPMENT_MOVEMENT,
  Phase.BATTLE,
  Phase.SPICE_COLLECTION,
  Phase.MENTAT_PAUSE,
];

// =============================================================================
// BATTLE SUB-PHASES
// =============================================================================

export enum BattleSubPhase {
  AGGRESSOR_CHOOSING = 'aggressor_choosing',
  PRESCIENCE_OPPORTUNITY = 'prescience_opportunity',
  PRESCIENCE_REVEAL = 'prescience_reveal',
  CREATING_BATTLE_PLANS = 'creating_battle_plans',
  VOICE_OPPORTUNITY = 'voice_opportunity',
  VOICE_COMPLIANCE = 'voice_compliance',
  REVEALING_PLANS = 'revealing_plans',
  TRAITOR_CALL = 'traitor_call',
  BATTLE_RESOLUTION = 'battle_resolution',
  HARKONNEN_CAPTURE = 'harkonnen_capture',
}

// =============================================================================
// TERRITORY TYPES
// =============================================================================

export enum TerritoryType {
  SAND = 'sand',
  ROCK = 'rock',
  STRONGHOLD = 'stronghold',
  POLAR_SINK = 'polar_sink',
}

// =============================================================================
// TREACHERY CARD TYPES
// =============================================================================

export enum TreacheryCardType {
  WEAPON_PROJECTILE = 'weapon_projectile',
  WEAPON_POISON = 'weapon_poison',
  WEAPON_SPECIAL = 'weapon_special', // Lasgun
  DEFENSE_PROJECTILE = 'defense_projectile',
  DEFENSE_POISON = 'defense_poison',
  SPECIAL = 'special',
  WORTHLESS = 'worthless',
}

// For easier checking
export const WEAPON_TYPES = [
  TreacheryCardType.WEAPON_PROJECTILE,
  TreacheryCardType.WEAPON_POISON,
  TreacheryCardType.WEAPON_SPECIAL,
] as const;

export const DEFENSE_TYPES = [
  TreacheryCardType.DEFENSE_PROJECTILE,
  TreacheryCardType.DEFENSE_POISON,
] as const;

// =============================================================================
// FORCE TYPES
// =============================================================================

export enum ForceType {
  REGULAR = 'regular',
  SARDAUKAR = 'sardaukar', // Emperor elite
  FEDAYKIN = 'fedaykin', // Fremen elite
  ADVISOR = 'advisor', // Bene Gesserit spiritual advisor
  FIGHTER = 'fighter', // Bene Gesserit battle-ready
}

// =============================================================================
// SPICE CARD TYPES
// =============================================================================

export enum SpiceCardType {
  TERRITORY = 'territory',
  SHAI_HULUD = 'shai_hulud',
}

// =============================================================================
// WIN CONDITIONS
// =============================================================================

export enum WinCondition {
  STRONGHOLD_VICTORY = 'stronghold_victory',
  FREMEN_SPECIAL = 'fremen_special',
  GUILD_SPECIAL = 'guild_special',
  BENE_GESSERIT_PREDICTION = 'bene_gesserit_prediction',
  DEFAULT_VICTORY = 'default_victory',
}

// =============================================================================
// ALLIANCE STATUS
// =============================================================================

export enum AllianceStatus {
  UNALLIED = 'unallied',
  ALLIED = 'allied',
}
