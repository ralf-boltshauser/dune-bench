/**
 * Constants for Shipment & Movement Phase
 * 
 * Single source of truth for all action types, request types, and phase constants.
 */

/**
 * Valid shipment action types
 */
export const SHIPMENT_ACTION_TYPES = [
  "SHIP_FORCES", // Normal shipment
  "FREMEN_SEND_FORCES", // Fremen native reserves (Rule 2.04.05)
  "GUILD_CROSS_SHIP", // Guild cross-ship (Rule 2.06.05.01)
  "GUILD_SHIP_OFF_PLANET", // Guild off-planet (Rule 2.06.05.02)
] as const;

export type ShipmentActionType = typeof SHIPMENT_ACTION_TYPES[number];

/**
 * Valid movement action types
 */
export const MOVEMENT_ACTION_TYPES = [
  "MOVE_FORCES",
] as const;

export type MovementActionType = typeof MOVEMENT_ACTION_TYPES[number];

/**
 * Request types for agent requests
 */
export const REQUEST_TYPES = {
  SHIP_FORCES: "SHIP_FORCES",
  MOVE_FORCES: "MOVE_FORCES",
  GUILD_TIMING_DECISION: "GUILD_TIMING_DECISION",
  SEND_ADVISOR: "SEND_ADVISOR",
  BG_INTRUSION: "BG_INTRUSION",
  FLIP_ADVISORS: "FLIP_ADVISORS",
  TAKE_UP_ARMS: "TAKE_UP_ARMS",
} as const;

/**
 * Faction phase states
 * Note: FactionPhase type is defined in types.ts
 */
export const FACTION_PHASES = {
  SHIP: "SHIP",
  MOVE: "MOVE",
  DONE: "DONE",
} as const;

/**
 * Guild timing decision options
 */
export const GUILD_TIMING_OPTIONS = {
  ACT_NOW: "act_now",
  WAIT_LATER: "wait_later",
  DELAY_TO_END: "delay_to_end",
  WAIT: "wait",
} as const;

/**
 * BG ability action types
 */
export const BG_ABILITY_ACTIONS = {
  SEND_SPIRITUAL_ADVISOR: "BG_SEND_SPIRITUAL_ADVISOR",
  INTRUSION: "BG_INTRUSION",
  FLIP_ADVISORS: "FLIP_ADVISORS",
  TAKE_UP_ARMS: "BG_TAKE_UP_ARMS",
} as const;

/**
 * Helper function to check if action type is a shipment action
 */
export function isShipmentActionType(actionType: string | undefined): actionType is ShipmentActionType {
  return SHIPMENT_ACTION_TYPES.includes(actionType as ShipmentActionType);
}

/**
 * Helper function to check if action type is a movement action
 */
export function isMovementActionType(actionType: string | undefined): actionType is MovementActionType {
  return MOVEMENT_ACTION_TYPES.includes(actionType as MovementActionType);
}

