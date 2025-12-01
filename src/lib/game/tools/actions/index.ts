/**
 * Action Tools Index
 *
 * Exports all phase-specific action tools for the game.
 */

// Import all tool creators and constants
import { createSetupTools, SETUP_TOOL_NAMES, SetupToolName } from './setup';
import { createStormTools, STORM_TOOL_NAMES, StormToolName } from './storm';
import { createBiddingTools, BIDDING_TOOL_NAMES, BiddingToolName } from './bidding';
import { createRevivalTools, REVIVAL_TOOL_NAMES, RevivalToolName } from './revival';
import { createShipmentTools, SHIPMENT_TOOL_NAMES, ShipmentToolName } from './shipment';
import { createMovementTools, MOVEMENT_TOOL_NAMES, MovementToolName } from './movement';
import { createBattleTools, BATTLE_TOOL_NAMES, BattleToolName } from './battle';
import { createNexusTools, NEXUS_TOOL_NAMES, NexusToolName } from './nexus';
import { createKaramaTools, KARAMA_TOOL_NAMES, KaramaToolName } from './karama';
import { createChoamTools, CHOAM_TOOL_NAMES, ChoamToolName } from './choam';

// Re-export creators
export {
  createSetupTools,
  createStormTools,
  createBiddingTools,
  createRevivalTools,
  createShipmentTools,
  createMovementTools,
  createBattleTools,
  createNexusTools,
  createKaramaTools,
  createChoamTools,
};

// Re-export constants
export {
  SETUP_TOOL_NAMES,
  STORM_TOOL_NAMES,
  BIDDING_TOOL_NAMES,
  REVIVAL_TOOL_NAMES,
  SHIPMENT_TOOL_NAMES,
  MOVEMENT_TOOL_NAMES,
  BATTLE_TOOL_NAMES,
  NEXUS_TOOL_NAMES,
  KARAMA_TOOL_NAMES,
  CHOAM_TOOL_NAMES,
};

// Re-export types
export type {
  SetupToolName,
  StormToolName,
  BiddingToolName,
  RevivalToolName,
  ShipmentToolName,
  MovementToolName,
  BattleToolName,
  NexusToolName,
  KaramaToolName,
  ChoamToolName,
};

// =============================================================================
// COMBINED TYPES
// =============================================================================

/**
 * All action tool names across all phases.
 */
export type ActionToolName =
  | SetupToolName
  | StormToolName
  | BiddingToolName
  | RevivalToolName
  | ShipmentToolName
  | MovementToolName
  | BattleToolName
  | NexusToolName
  | KaramaToolName
  | ChoamToolName;

/**
 * All action tool name arrays for iteration.
 */
export const ALL_ACTION_TOOL_NAMES = [
  ...SETUP_TOOL_NAMES,
  ...STORM_TOOL_NAMES,
  ...BIDDING_TOOL_NAMES,
  ...REVIVAL_TOOL_NAMES,
  ...SHIPMENT_TOOL_NAMES,
  ...MOVEMENT_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
  ...NEXUS_TOOL_NAMES,
  ...KARAMA_TOOL_NAMES,
  ...CHOAM_TOOL_NAMES,
] as const;
