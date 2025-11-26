/**
 * Public exports for game types.
 * Import from '@/lib/game/types' to access all type definitions.
 */

// Core enums
export {
  Faction,
  FACTION_NAMES,
  Phase,
  PHASE_ORDER,
  BattleSubPhase,
  TerritoryType,
  TreacheryCardType,
  WEAPON_TYPES,
  DEFENSE_TYPES,
  ForceType,
  SpiceCardType,
  WinCondition,
  AllianceStatus,
} from './enums';

// Territory definitions
export {
  TerritoryId,
  TERRITORY_DEFINITIONS,
  STRONGHOLD_TERRITORIES,
  ORNITHOPTER_TERRITORIES,
  ALL_TERRITORY_IDS,
  isStronghold,
  providesOrnithopters,
  type TerritoryDefinition,
} from './territories';

// Entity types
export {
  type LeaderDefinition,
  type Leader,
  LeaderLocation,
  type TreacheryCardDefinition,
  type TreacheryCard,
  CardLocation,
  type SpiceCardDefinition,
  type SpiceCard,
  SpiceCardLocation,
  type TraitorCard,
  type ForceStack,
  type ForceCount,
  type FactionForces,
  type BeneGesseritForces,
  type SpiceLocation,
  type BattlePlan,
  type Deal,
  DealStatus,
  type Alliance,
  type BeneGesseritPrediction,
  type KwisatzHaderach,
} from './entities';

// State types
export {
  type GameConfig,
  type GameVariants,
  type FactionState,
  type StormPhaseState,
  type BiddingPhaseState,
  type BattlePhaseState,
  type PendingBattle,
  type Battle,
  type VoiceCommand,
  type GameState,
  type WinResult,
  type GameAction,
  type GameActionType,
  type FactionContext,
  type PublicFactionState,
  type PhaseContext,
  type StormPhaseContext,
  type SpiceBlowContext,
  type ChoamCharityContext,
  type BiddingContext,
  type RevivalContext,
  type ShipmentMovementContext,
  type BattleContext,
  type SpiceCollectionContext,
  type MentatPauseContext,
} from './state';
