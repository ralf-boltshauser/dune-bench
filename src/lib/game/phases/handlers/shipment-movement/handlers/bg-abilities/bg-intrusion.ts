/**
 * BG INTRUSION Handler
 * @rule 2.02.15
 *
 * Handles Bene Gesserit INTRUSION ability:
 * "When a Force of another faction that you are not allied to enters a Territory
 * where you have fighters, you may flip them to advisors.✷"
 */

import { Faction, TerritoryId, type GameState } from "../../../../../types";
import { areAllied, getBGFightersInSector } from "../../../../../state";
import { FACTION_NAMES } from "../../../../../types";
import { type AgentRequest, type AgentResponse, type PhaseEvent, type PhaseStepResult } from "../../../../types";
import { type BGIntrusionTrigger } from "../../types";

export class BGIntrusionHandler {
  /**
   * Check if BG INTRUSION should be triggered (Rule 2.02.16).
   *
   * Rule: "When a Force of another faction that you are not allied to enters a Territory
   * where you have fighters, you may flip them to advisors.✷"
   *
   * Requirements:
   * - Advanced rules must be enabled
   * - BG must be in game
   * - Entering faction must NOT be allied to BG
   * - BG must have fighters (not just advisors) in the territory/sector
   * - "Enters" includes: ship, move, send, worm ride
   */
  shouldTrigger(
    state: GameState,
    enteringFaction: Faction,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    // Only in advanced rules
    if (!state.config.advancedRules) return false;

    // BG must be in game
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    // Cannot trigger for BG's own actions
    if (enteringFaction === Faction.BENE_GESSERIT) return false;

    // Must NOT be allied
    if (areAllied(state, Faction.BENE_GESSERIT, enteringFaction))
      return false;

    // BG must have fighters (not just advisors) in this territory/sector
    const fighters = getBGFightersInSector(state, territoryId, sector);
    if (fighters === 0) return false;

    return true;
  }

  /**
   * Request BG INTRUSION decision (Rule 2.02.16).
   * When a non-ally enters a territory where BG has fighters, BG may flip them to advisors.
   */
  requestDecision(
    state: GameState,
    events: PhaseEvent[],
    trigger: BGIntrusionTrigger
  ): PhaseStepResult {
    const { territory, sector, enteringFaction } = trigger;
    const fightersInSector = getBGFightersInSector(state, territory, sector);

    console.log(
      `\n⚔️  BG INTRUSION: ${FACTION_NAMES[enteringFaction]} entered ${territory} (sector ${sector})`
    );
    console.log(
      `   You have ${fightersInSector} fighter${
        fightersInSector !== 1 ? "s" : ""
      } here. You may flip them to advisors.\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "BG_INTRUSION",
        prompt: `INTRUSION (Rule 2.02.16): ${
          FACTION_NAMES[enteringFaction]
        } entered ${territory} (sector ${sector}) where you have ${fightersInSector} fighter${
          fightersInSector !== 1 ? "s" : ""
        }. You may flip them to advisors (optional). This can be cancelled by Karama (✷).`,
        context: {
          territory,
          sector,
          enteringFaction,
          fightersInSector,
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_intrusion", "pass"],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process BG's INTRUSION decision.
   */
  processDecision(
    state: GameState,
    responses: AgentResponse[],
    trigger: BGIntrusionTrigger | null
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const newState = state;

    if (!trigger) {
      return { state, events: newEvents };
    }

    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    const { territory, sector, enteringFaction } = trigger;

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_INTRUSION"
    ) {
      // BG used the ability - state was already updated by the tool
      const choice = bgResponse.data.choice as string;
      const count =
        (bgResponse.data.count as number) ||
        getBGFightersInSector(state, territory, sector);

      if (choice === "flip") {
        console.log(
          `   ✅ Bene Gesserit flips ${count} fighter${
            count !== 1 ? "s" : ""
          } to advisor${
            count !== 1 ? "s" : ""
          } in ${territory} (sector ${sector})\n`
        );

        newEvents.push({
          type: "FORCES_CONVERTED",
          data: {
            faction: Faction.BENE_GESSERIT,
            territory,
            sector,
            count,
            conversion: "fighters_to_advisors",
            reason: "intrusion",
            enteringFaction,
          },
          message: `Bene Gesserit flips ${count} fighter${
            count !== 1 ? "s" : ""
          } to advisor${
            count !== 1 ? "s" : ""
          } in ${territory} (INTRUSION - Rule 2.02.16)`,
        });
      }
    } else {
      console.log(`   ⏭️  Bene Gesserit passes on INTRUSION\n`);
    }

    return { state: newState, events: newEvents };
  }
}

