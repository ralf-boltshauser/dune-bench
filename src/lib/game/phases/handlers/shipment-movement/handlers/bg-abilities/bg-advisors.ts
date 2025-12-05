/**
 * BG Spiritual Advisor Handler
 * @rule 2.02.05
 *
 * Handles Bene Gesserit Spiritual Advisor ability:
 * "Whenever any other faction Ships Forces onto Dune from off-planet,
 * you may send 1 force for FREE to Polar Sink or same territory."
 */

import { Faction, TerritoryId, type GameState } from "../../../../../types";
import { getFactionState } from "../../../../../state";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
} from "../../../../../types";
import { type BGSpiritualAdvisorTrigger } from "../../types";

export class BGSpiritualAdvisorHandler {
  /**
   * Check if we should ask BG about spiritual advisor after a shipment
   *
   * Rule 2.02.05: "Whenever any other faction Ships Forces onto Dune from off-planet"
   * Rule 2.04.03: Fremen reserves are "on Dune (the far side)" - NOT off-planet
   *
   * CRITICAL:
   * - Fremen "Send" forces (not "Ship from off-planet") - does NOT trigger BG
   * - Guild cross-ship (board to board) - does NOT trigger (no off-planet involved)
   * - Guild off-planet (board to reserves) - does NOT trigger (going TO reserves, not FROM)
   */
  shouldTrigger(
    state: GameState,
    shippingFaction: Faction,
    actionType?: string
  ): boolean {
    // Only trigger for normal off-planet shipments (SHIP_FORCES)
    // Rule 2.02.05: "Ships Forces onto Dune from off-planet"
    // NOT triggered by:
    // - GUILD_CROSS_SHIP (no off-planet involved)
    // - GUILD_SHIP_OFF_PLANET (going TO reserves, not FROM)
    // - FREMEN_SEND_FORCES (on-planet reserves, not off-planet)
    if (
      actionType === "GUILD_CROSS_SHIP" ||
      actionType === "GUILD_SHIP_OFF_PLANET" ||
      actionType === "FREMEN_SEND_FORCES"
    ) {
      return false;
    }

    // Only trigger for SHIP_FORCES (normal off-planet shipments)
    if (actionType !== "SHIP_FORCES") {
      return false;
    }

    // Only trigger for non-BG factions
    if (shippingFaction === Faction.BENE_GESSERIT) return false;

    // BG must be in game and have reserves
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves =
      bgState.forces.reserves.regular + bgState.forces.reserves.elite;
    if (reserves === 0) return false;

    return true;
  }

  /**
   * Request BG spiritual advisor decision after another faction ships.
   * Rule 2.02.05: BG may send 1 force for free when any other faction ships.
   */
  requestDecision(
    state: GameState,
    events: PhaseEvent[],
    trigger: BGSpiritualAdvisorTrigger
  ): PhaseStepResult {
    const { territory, sector } = trigger;
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves =
      bgState.forces.reserves.regular + bgState.forces.reserves.elite;

    // Check if BG has any fighters in the triggering territory (for advanced rules)
    const forcesInTerritory = bgState.forces.onBoard.filter(
      (s) => s.territoryId === territory
    );
    const hasFightersInTerritory = forcesInTerritory.length > 0;

    console.log(
      `\n🧘 BG SPIRITUAL ADVISORS: Another faction shipped to ${territory}`
    );
    console.log(
      `   You may send 1 force for FREE to Polar Sink or same territory\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "SEND_ADVISOR",
        prompt: `Spiritual Advisors: Another faction just shipped to ${territory} (sector ${sector}). You may send 1 force for FREE. Options: (1) Send to Polar Sink (basic), (2) Send to same territory ${
          hasFightersInTerritory
            ? "(NOT AVAILABLE - you have fighters there)"
            : "(advanced - Rule 2.02.11)"
        }, (3) Pass.`,
        context: {
          reserves,
          triggeringTerritory: territory,
          triggeringSector: sector,
          canUseSameTerritory: !hasFightersInTerritory,
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_send_spiritual_advisor", "pass"],
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
   * Process BG's spiritual advisor decision.
   */
  processDecision(
    state: GameState,
    responses: AgentResponse[],
    trigger: BGSpiritualAdvisorTrigger | null
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_SEND_SPIRITUAL_ADVISOR"
    ) {
      // BG used the ability - state was already updated by the tool
      const count = (bgResponse.data.count as number) || 1;
      const territory = (bgResponse.data.territoryId ||
        (bgResponse.data.choice === "polar_sink"
          ? "POLAR_SINK"
          : trigger?.territory)) as TerritoryId;
      
      // Get sector from response data, or fall back to trigger sector, or default to 0
      const sector = (bgResponse.data.sector as number | undefined) ?? 
                     trigger?.sector ?? 
                     0;

      console.log(
        `   ✅ Bene Gesserit sends 1 spiritual advisor to ${territory} (sector ${sector}) for FREE\n`
      );

      newEvents.push({
        type: "FORCES_SHIPPED",
        data: {
          faction: Faction.BENE_GESSERIT,
          territory,
          sector,
          count,
          cost: 0,
          reason: "spiritual_advisor",
        },
        message: `Bene Gesserit sends 1 spiritual advisor to ${territory} (sector ${sector}) for FREE (Rule 2.02.05)`,
      });
    } else {
      console.log(`   ⏭️  Bene Gesserit passes on spiritual advisor\n`);
    }

    // Clear game state tracking (Rule 2.02.11)
    newState = {
      ...newState,
      bgSpiritualAdvisorTrigger: null,
    };

    return { state: newState, events: newEvents };
  }
}

