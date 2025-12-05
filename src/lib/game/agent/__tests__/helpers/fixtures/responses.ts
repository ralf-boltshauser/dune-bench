/**
 * Response Fixtures
 *
 * Reusable agent response presets for tests.
 */

import type { AgentResponse } from "../../../../phases/types";
import { Faction } from "@/lib/game/types";

export const RESPONSE_PRESETS = {
  PASS: (faction: Faction, reasoning?: string): AgentResponse => ({
    factionId: faction,
    actionType: "PASS",
    data: {},
    passed: true,
    reasoning,
  }),

  ACTION: (
    faction: Faction,
    actionType: string,
    data: Record<string, unknown>
  ): AgentResponse => ({
    factionId: faction,
    actionType,
    data,
    passed: false,
  }),

  BID: (faction: Faction, amount: number): AgentResponse => ({
    factionId: faction,
    actionType: "BID",
    data: { amount },
    passed: false,
  }),

  REVIVE: (faction: Faction, count: number, cost: number): AgentResponse => ({
    factionId: faction,
    actionType: "REVIVE_FORCES",
    data: { count, cost },
    passed: false,
  }),

  SHIP: (
    faction: Faction,
    territory: string,
    sector: number,
    forceCount: number,
    cost: number
  ): AgentResponse => ({
    factionId: faction,
    actionType: "SHIP_FORCES",
    data: { territory, sector, forceCount, cost },
    passed: false,
  }),

  MOVE: (
    faction: Faction,
    from: string,
    to: string,
    forceCount: number
  ): AgentResponse => ({
    factionId: faction,
    actionType: "MOVE_FORCES",
    data: { from, to, forceCount },
    passed: false,
  }),
} as const;

