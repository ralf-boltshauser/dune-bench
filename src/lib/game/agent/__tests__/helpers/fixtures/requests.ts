/**
 * Request Fixtures
 *
 * Reusable agent request presets for tests.
 */

import type { AgentRequest, AgentRequestType } from "../../../../phases/types";
import { Faction } from "@/lib/game/types";

export const REQUEST_PRESETS = {
  SIMPLE_PASS: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "USE_KARAMA",
    prompt: "Test prompt",
    context: {},
    availableActions: ["PASS"],
  }),

  BIDDING_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "BID_OR_PASS",
    prompt: "Make a bid or pass",
    context: { currentBid: 2, card: "weapon_1" },
    availableActions: ["BID", "PASS"],
  }),

  REVIVAL_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "REVIVE_FORCES",
    prompt: "Revive forces from the Tleilaxu Tanks",
    context: { availableForces: 5, cost: 2 },
    availableActions: ["REVIVE_FORCES", "PASS"],
  }),

  SHIPMENT_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "SHIP_FORCES",
    prompt: "Ship forces to Dune",
    context: { availableReserves: 10, spice: 5 },
    availableActions: ["SHIP_FORCES", "PASS"],
  }),

  MOVEMENT_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "MOVE_FORCES",
    prompt: "Move forces on the board",
    context: { availableForces: 5 },
    availableActions: ["MOVE_FORCES", "PASS"],
  }),

  BATTLE_PLAN_REQUEST: (faction: Faction): AgentRequest => ({
    factionId: faction,
    requestType: "CREATE_BATTLE_PLAN",
    prompt: "Create a battle plan",
    context: { territory: "ARRAKEEN", opponent: Faction.HARKONNEN },
    availableActions: ["CREATE_BATTLE_PLAN", "PASS"],
  }),
} as const;

// Builder for custom requests
export function createTestRequest(
  overrides?: Partial<AgentRequest>
): AgentRequest {
  return {
    factionId: Faction.ATREIDES,
    requestType: "USE_KARAMA",
    prompt: "Test",
    context: {},
    availableActions: ["PASS"],
    ...overrides,
  };
}

