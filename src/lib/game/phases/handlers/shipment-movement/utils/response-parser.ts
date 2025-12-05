/**
 * Response Parser
 * 
 * Centralized logic for parsing agent responses.
 * Handles different action types and response formats.
 */

import { TerritoryId } from "../../../../types";
import { type AgentResponse } from "@/lib/game/types";
import { SHIPMENT_ACTION_TYPES, MOVEMENT_ACTION_TYPES, isShipmentActionType, isMovementActionType } from "../constants";
import { normalizeTerritoryIds } from "../helpers";

/**
 * Parsed shipment data
 */
export interface ShipmentData {
  territoryId?: TerritoryId;
  sector?: number;
  count?: number;
  cost?: number;
  useElite?: boolean;
  fromTerritoryId?: TerritoryId; // For Guild cross-ship
  fromSector?: number; // For Guild cross-ship
  toTerritoryId?: TerritoryId; // For Guild cross-ship
  toSector?: number; // For Guild cross-ship
  appliedByTool?: boolean;
}

/**
 * Parsed movement data
 */
export interface MovementData {
  fromTerritoryId?: TerritoryId;
  fromSector?: number;
  toTerritoryId?: TerritoryId;
  toSector?: number;
  count?: number;
  useElite?: boolean;
  appliedByTool?: boolean;
}

/**
 * Response parser for shipment and movement actions
 */
export class ResponseParser {
  /**
   * Check if response is a shipment action
   */
  isShipmentAction(response: AgentResponse): boolean {
    if (response.passed) return false;
    return isShipmentActionType(response.actionType);
  }

  /**
   * Check if response is a movement action
   */
  isMovementAction(response: AgentResponse): boolean {
    if (response.passed) return false;
    return isMovementActionType(response.actionType);
  }

  /**
   * Parse shipment response
   * Handles all shipment types: normal, Fremen, Guild cross-ship, Guild off-planet
   */
  parseShipment(response: AgentResponse): ShipmentData | null {
    if (!this.isShipmentAction(response)) {
      return null;
    }

    const normalized = normalizeTerritoryIds(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;

    const actionType = response.actionType;

    // Guild cross-ship: special handling
    if (actionType === "GUILD_CROSS_SHIP") {
      return {
        fromTerritoryId: normalizedData.fromTerritoryId as TerritoryId | undefined,
        fromSector: normalizedData.fromSector as number | undefined,
        toTerritoryId: normalizedData.toTerritoryId as TerritoryId | undefined,
        toSector: response.data.toSector as number | undefined,
        count: response.data.count as number | undefined,
        useElite: response.data.useElite as boolean | undefined,
        cost: response.data.cost as number | undefined,
        appliedByTool: response.data.appliedByTool as boolean | undefined,
      };
    }

    // Guild off-planet: from territory on board
    if (actionType === "GUILD_SHIP_OFF_PLANET") {
      return {
        fromTerritoryId: normalizedData.fromTerritoryId as TerritoryId | undefined,
        fromSector: response.data.fromSector as number | undefined,
        count: response.data.count as number | undefined,
        useElite: response.data.useElite as boolean | undefined,
        cost: response.data.cost as number | undefined,
        appliedByTool: response.data.appliedByTool as boolean | undefined,
      };
    }

    // Normal shipment or Fremen shipment
    return {
      territoryId: normalized.normalized
        ? (normalized.data.territoryId as TerritoryId | undefined)
        : (response.data.territoryId as TerritoryId | undefined),
      sector: response.data.sector as number | undefined,
      count: response.data.count as number | undefined,
      cost: response.data.cost as number | undefined,
      useElite: response.data.useElite as boolean | undefined,
      appliedByTool: response.data.appliedByTool as boolean | undefined,
    };
  }

  /**
   * Parse movement response
   * Handles both new format and legacy format
   */
  parseMovement(response: AgentResponse): MovementData | null {
    if (!this.isMovementAction(response)) {
      return null;
    }

    const normalized = normalizeTerritoryIds(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;

    // Check for new format first
    if (normalizedData.fromTerritoryId && normalizedData.toTerritoryId) {
      return {
        fromTerritoryId: normalizedData.fromTerritoryId as TerritoryId,
        fromSector: normalizedData.fromSector as number | undefined,
        toTerritoryId: normalizedData.toTerritoryId as TerritoryId,
        toSector: normalizedData.toSector as number | undefined,
        count: normalizedData.count as number | undefined,
        useElite: normalizedData.useElite as boolean | undefined,
        appliedByTool: response.data.appliedByTool as boolean | undefined,
      };
    }

    // Legacy format: { from: { territory, sector }, to: { territory, sector }, count }
    const fromData = normalizedData.from as
      | { territory?: TerritoryId; sector?: number }
      | undefined;
    const toData = normalizedData.to as
      | { territory?: TerritoryId; sector?: number }
      | undefined;

    if (fromData?.territory && toData?.territory) {
      return {
        fromTerritoryId: fromData.territory,
        fromSector: fromData.sector,
        toTerritoryId: toData.territory,
        toSector: toData.sector,
        count: normalizedData.count as number | undefined,
        appliedByTool: response.data.appliedByTool as boolean | undefined,
      };
    }

    return null;
  }

  /**
   * Get action category
   */
  getActionCategory(actionType: string | undefined): 'shipment' | 'movement' | 'other' {
    if (isShipmentActionType(actionType)) return 'shipment';
    if (isMovementActionType(actionType)) return 'movement';
    return 'other';
  }
}

