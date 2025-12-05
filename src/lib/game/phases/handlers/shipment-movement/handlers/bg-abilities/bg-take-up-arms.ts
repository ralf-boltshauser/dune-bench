/**
 * BG TAKE UP ARMS Handler
 * @rule 2.02.16
 *
 * Handles Bene Gesserit TAKE UP ARMS ability:
 * "When you Move advisors into an occupied Territory, you may flip them to fighters
 * following occupancy limit if you do not already have advisors present.✷"
 */

import {
  Faction,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
} from "../../../../../types";
import {
  getFactionsInTerritory,
  getBGAdvisorsInTerritory,
  convertBGAdvisorsToFighters,
} from "../../../../../state";
import { validateAdvisorFlipToFighters } from "../../../../../rules";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
} from "../../../../types";
import { type BGTakeUpArmsTrigger } from "../../types";

export class BGTakeUpArmsHandler {
  /**
   * Check if TAKE UP ARMS should be triggered (Rule 2.02.17).
   * Rule: "When you Move advisors into an occupied Territory, you may flip them to fighters
   * following occupancy limit if you do not already have advisors present.✷"
   *
   * @param state Game state (should be BEFORE movement to check existing advisors)
   * @param territoryId Destination territory
   * @param sector Destination sector
   */
  shouldTrigger(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    // Only in advanced rules
    if (!state.config.advancedRules) return false;

    // BG must be in game
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    // Territory must be occupied (other factions present)
    const occupants = getFactionsInTerritory(state, territoryId);
    // Remove BG from occupants to check if OTHER factions are present
    const otherFactions = occupants.filter((f) => f !== Faction.BENE_GESSERIT);
    if (otherFactions.length === 0) {
      // Unoccupied - ENLISTMENT applies instead, not TAKE UP ARMS
      return false;
    }

    // BG must NOT already have advisors in this territory (BEFORE the move)
    // (Rule: "if you do not already have advisors present")
    const existingAdvisors = getBGAdvisorsInTerritory(state, territoryId);
    if (existingAdvisors > 0) {
      // Already has advisors - TAKE UP ARMS doesn't apply
      return false;
    }

    // Check restrictions - if blocked, don't offer the option
    const validation = validateAdvisorFlipToFighters(
      state,
      Faction.BENE_GESSERIT,
      territoryId,
      sector
    );
    if (!validation.canFlip) {
      // Restrictions block it - don't offer
      return false;
    }

    // Check occupancy limit for strongholds
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (territory.type === TerritoryType.STRONGHOLD) {
      // Stronghold occupancy limit: max 2 other factions
      // If already at limit, can't flip (would exceed limit)
      if (otherFactions.length >= 2) {
        // At occupancy limit - can't flip (would exceed)
        return false;
      }
    }

    return true;
  }

  /**
   * Request BG TAKE UP ARMS decision after moving advisors to occupied territory.
   * Rule 2.02.17: BG may flip advisors to fighters when moving to occupied territory.
   */
  requestDecision(
    state: GameState,
    events: PhaseEvent[],
    trigger: BGTakeUpArmsTrigger
  ): PhaseStepResult {
    const { territory, sector, advisorCount } = trigger;
    const territoryName = TERRITORY_DEFINITIONS[territory].name;

    console.log(
      `\n⚔️  BG TAKE UP ARMS: You moved ${advisorCount} advisor(s) to ${territoryName} (sector ${sector})`
    );
    console.log(
      `   This territory is occupied. You may flip them to fighters.\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "TAKE_UP_ARMS",
        prompt: `TAKE UP ARMS (Rule 2.02.17): You moved ${advisorCount} advisor(s) to ${territoryName} (sector ${sector}), which is occupied by other factions. You may flip them to fighters (optional). This can be cancelled by Karama (✷).`,
        context: {
          territory,
          sector,
          advisorCount,
          reason: "take_up_arms",
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_take_up_arms", "pass"],
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
   * Process BG's TAKE UP ARMS decision.
   */
  processDecision(
    state: GameState,
    responses: AgentResponse[],
    trigger: BGTakeUpArmsTrigger | null
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    if (!trigger) {
      return { state, events: newEvents };
    }

    const { territory, sector, advisorCount } = trigger;
    const territoryName = TERRITORY_DEFINITIONS[territory].name;

    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_TAKE_UP_ARMS"
    ) {
      // BG chose to flip advisors to fighters
      // Double-check restrictions (in case state changed)
      const validation = validateAdvisorFlipToFighters(
        newState,
        Faction.BENE_GESSERIT,
        territory,
        sector
      );

      if (!validation.canFlip) {
        console.log(
          `   ⚠️  TAKE UP ARMS: Cannot flip advisors in ${territoryName} (sector ${sector}) - ${validation.reason}\n`
        );
      } else {
        // Flip advisors to fighters
        newState = convertBGAdvisorsToFighters(
          newState,
          territory,
          sector,
          advisorCount
        );

        console.log(
          `   ✅ TAKE UP ARMS: Bene Gesserit flips ${advisorCount} advisor(s) to fighter(s) in ${territoryName} (sector ${sector})\n`
        );

        newEvents.push({
          type: "ADVISORS_FLIPPED",
          data: {
            faction: Faction.BENE_GESSERIT,
            territoryId: territory,
            sector,
            count: advisorCount,
            reason: "take_up_arms",
          },
          message: `Bene Gesserit flips ${advisorCount} advisor(s) to fighter(s) in ${territoryName} (TAKE UP ARMS, Rule 2.02.17)`,
        });
      }
    } else {
      console.log(
        `   ⏭️  Bene Gesserit passes on TAKE UP ARMS (keeps advisors as advisors)\n`
      );
    }

    return { state: newState, events: newEvents };
  }
}

