/**
 * Territory Extraction Utilities
 * 
 * Centralized logic for extracting territory information from agent responses.
 * Handles normalization and different response formats.
 */

import { TerritoryId } from "../../../../types";
import { type AgentResponse } from "@/lib/game/types";
import { normalizeTerritoryIds } from "../helpers";

/**
 * Result of territory extraction
 */
export interface TerritoryExtractionResult {
  territoryId: TerritoryId | undefined;
  sector: number | undefined;
}

/**
 * Extract territory from shipment response
 * Handles all shipment types: normal, Fremen, Guild cross-ship, Guild off-planet
 */
export function extractShipmentTerritory(
  response: AgentResponse,
  actionType: string
): TerritoryExtractionResult {
  const normalized = normalizeTerritoryIds(response.data);
  const normalizedData = normalized.normalized
    ? normalized.data
    : response.data;

  // Guild cross-ship: forces enter the destination territory
  if (actionType === "GUILD_CROSS_SHIP") {
    return {
      territoryId: normalizedData.toTerritoryId as TerritoryId | undefined,
      sector: response.data.toSector as number | undefined,
    };
  }

  // Normal shipment, Fremen shipment, or Guild off-planet: use territoryId
  return {
    territoryId: normalized.normalized
      ? (normalized.data.territoryId as TerritoryId | undefined)
      : (response.data.territoryId as TerritoryId | undefined),
    sector: response.data.sector as number | undefined,
  };
}

/**
 * Extract territory from movement response
 * Handles both new format and legacy format
 */
export function extractMovementTerritory(
  response: AgentResponse
): TerritoryExtractionResult {
  const normalized = normalizeTerritoryIds(response.data);
  const normalizedData = normalized.normalized
    ? normalized.data
    : response.data;

  // Check for new format first
  if (normalizedData.toTerritoryId) {
    return {
      territoryId: normalizedData.toTerritoryId as TerritoryId | undefined,
      sector: normalizedData.toSector as number | undefined,
    };
  }

  // Legacy format: { to: { territory, sector } }
  const toData = normalizedData.to as
    | { territory?: TerritoryId; sector?: number }
    | undefined;

  return {
    territoryId: toData?.territory,
    sector: toData?.sector,
  };
}

/**
 * Extract territory for INTRUSION trigger
 * Handles both shipment and movement cases
 * 
 * For shipment: territory where forces are being shipped
 * For movement: destination territory
 */
export function extractIntrusionTerritory(
  response: AgentResponse,
  actionType: string
): TerritoryExtractionResult {
  // For shipment actions, use shipment extraction
  if (actionType === "GUILD_CROSS_SHIP" || actionType === "SHIP_FORCES" || actionType === "FREMEN_SEND_FORCES") {
    return extractShipmentTerritory(response, actionType);
  }

  // For movement actions, use movement extraction
  if (actionType === "MOVE_FORCES") {
    return extractMovementTerritory(response);
  }

  // Fallback: try to extract from response data
  const normalized = normalizeTerritoryIds(response.data);
  return {
    territoryId: normalized.normalized
      ? (normalized.data.toTerritoryId as TerritoryId | undefined) ||
        (normalized.data.territoryId as TerritoryId | undefined)
      : (response.data.toTerritoryId as TerritoryId | undefined) ||
        (response.data.territoryId as TerritoryId | undefined),
    sector: (response.data.toSector as number | undefined) ||
      (response.data.sector as number | undefined),
  };
}

/**
 * Extract territory for Spiritual Advisor trigger
 * Only used for normal shipments (not cross-ship or off-planet)
 */
export function extractSpiritualAdvisorTerritory(
  response: AgentResponse
): TerritoryExtractionResult {
  const normalized = normalizeTerritoryIds(response.data);
  return {
    territoryId: normalized.normalized
      ? (normalized.data.territoryId as TerritoryId)
      : (response.data.territoryId as TerritoryId),
    sector: response.data.sector as number,
  };
}

