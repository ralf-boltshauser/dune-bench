/**
 * BG WARTIME Handler
 * @rule 2.02.17
 *
 * Handles Bene Gesserit WARTIME ability:
 * "Before Shipment and Movement [1.06.00], in each Territory that you have advisors,
 * you may flip all of those advisors to fighters. This change must be publicly announced.✷"
 */

import { Faction, TerritoryId, type GameState } from "../../../../../types";
import { getFactionState, convertBGAdvisorsToFighters } from "../../../../../state";
import { validateAdvisorFlipToFighters } from "../../../../../rules";
import { type AgentRequest, type AgentResponse, type PhaseEvent, type PhaseStepResult } from "../../../../types";
import { type BGWartimeTerritory } from "../../types";
import { normalizeTerritoryIds } from "../../helpers";

export class BGWartimeHandler {
  /**
   * Check if BG has advisors and request WARTIME decision.
   * Rule 2.02.18: "Before Shipment and Movement [1.06.00], in each Territory that you have advisors,
   * you may flip all of those advisors to fighters. This change must be publicly announced.✷"
   */
  checkAndRequest(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult | null {
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);

    // Find all territories where BG has advisors
    const territoriesWithAdvisors: Array<{
      territoryId: TerritoryId;
      sector: number;
      advisorCount: number;
    }> = [];

    for (const stack of bgState.forces.onBoard) {
      const advisorCount = stack.advisors ?? 0;
      if (advisorCount > 0) {
        territoriesWithAdvisors.push({
          territoryId: stack.territoryId,
          sector: stack.sector,
          advisorCount,
        });
      }
    }

    // If no advisors, no WARTIME needed
    if (territoriesWithAdvisors.length === 0) {
      return null;
    }

    // Filter out territories that can't flip due to restrictions
    const eligibleTerritories = territoriesWithAdvisors.filter(
      ({ territoryId, sector }) => {
        return this.canFlipAdvisors(state, territoryId, sector);
      }
    );

    // If no eligible territories, no WARTIME needed
    if (eligibleTerritories.length === 0) {
      console.log(
        `\n⚔️  WARTIME: Bene Gesserit has advisors but cannot flip (PEACETIME or STORMED IN restrictions)\n`
      );
      return null;
    }

    console.log(
      `\n⚔️  WARTIME (Rule 2.02.18): Bene Gesserit may flip advisors to fighters before phase starts`
    );
    console.log(
      `   Territories with advisors: ${eligibleTerritories
        .map((t) => `${t.territoryId} (${t.advisorCount} advisors)`)
        .join(", ")}\n`
    );

    // Store territories for later processing (will be stored in state machine by caller)
    const territoryList = eligibleTerritories
      .map(
        (t, i) =>
          `  ${i + 1}. ${t.territoryId} (sector ${t.sector}) - ${
            t.advisorCount
          } advisors`
      )
      .join("\n");

    const prompt = `WARTIME (Rule 2.02.18): Before Shipment and Movement phase starts, you may flip all advisors to fighters in each territory where you have advisors. This change must be publicly announced.

Territories with advisors:
${territoryList}

You may choose to flip advisors in any or all of these territories. Each territory is flipped independently.

Options:
- Specify territories to flip (e.g., ["ARRAKEEN", "CARTHAG"])
- Pass to skip WARTIME`;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "FLIP_ADVISORS",
        prompt,
        context: {
          territories: eligibleTerritories.map((t) => ({
            territoryId: t.territoryId,
            sector: t.sector,
            advisorCount: t.advisorCount,
          })),
        },
        availableActions: ["flip_advisors", "pass"],
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
   * Check if advisors can be flipped to fighters in a territory.
   * Validates PEACETIME (Rule 2.02.19) and STORMED IN (Rule 2.02.20) restrictions.
   * Uses centralized validation function for consistency.
   */
  canFlipAdvisors(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    const validation = validateAdvisorFlipToFighters(
      state,
      Faction.BENE_GESSERIT,
      territoryId,
      sector
    );
    return validation.canFlip;
  }

  /**
   * Process WARTIME flip decision from Bene Gesserit.
   */
  processDecision(
    state: GameState,
    responses: AgentResponse[],
    territories: BGWartimeTerritory[]
  ): { state: GameState; events: PhaseEvent[] } {
    let newState = state;
    const newEvents: PhaseEvent[] = [];

    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    // Debug: Log response details
    console.log(`   🔍 DEBUG: WARTIME response check - found=${!!bgResponse}, passed=${bgResponse?.passed}, actionType=${bgResponse?.actionType}, expected=FLIP_ADVISORS`);
    if (bgResponse) {
      console.log(`   🔍 DEBUG: WARTIME response data:`, JSON.stringify(bgResponse.data, null, 2));
    }

    if (
      !bgResponse ||
      bgResponse.passed ||
      bgResponse.actionType !== "FLIP_ADVISORS"
    ) {
      console.log(
        `   ⏭️  Bene Gesserit passes on WARTIME (no advisors flipped)\n`
      );
      return { state: newState, events: newEvents };
    }

    // Get territories to flip from response - normalize territory IDs
    let territoriesToFlip: Array<{ territoryId: TerritoryId; sector: number }> =
      [];

    console.log(`   🔍 DEBUG: WARTIME - bgResponse.data.territories exists: ${!!bgResponse.data?.territories}`);
    if (bgResponse.data?.territories) {
      console.log(`   🔍 DEBUG: WARTIME - raw territories:`, JSON.stringify(bgResponse.data.territories, null, 2));
      const normalized = normalizeTerritoryIds(bgResponse.data);
      if (normalized.normalized) {
        const data = normalized.data as {
          territories?: Array<{ territoryId: TerritoryId; sector: number }>;
          [key: string]: unknown;
        };
        console.log(
          `   🔍 DEBUG: WARTIME - normalized result: normalized=${normalized.normalized}, has territories=${!!data.territories}`
        );
        if (data.territories) {
          territoriesToFlip = data.territories;
          console.log(
            `   🔍 DEBUG: WARTIME - extracted ${territoriesToFlip.length} territories from normalized data`
          );
        }
      } else if (bgResponse.data.territories) {
        // Fallback: try to use original data and normalize manually
        const rawTerritories = bgResponse.data.territories as Array<{
          territoryId: TerritoryId | string;
          sector: number;
        }>;
        console.log(`   🔍 DEBUG: WARTIME - using fallback, rawTerritories count=${rawTerritories.length}`);
        territoriesToFlip = rawTerritories.map((t) => {
          const normalized = normalizeTerritoryIds({
            territoryId: t.territoryId,
          });
          const territoryId = normalized.normalized
            ? (normalized.data.territoryId as TerritoryId | undefined)
            : (t.territoryId as TerritoryId | undefined);
          return {
            territoryId: (territoryId || t.territoryId) as TerritoryId,
            sector: t.sector,
          };
        });
        console.log(`   🔍 DEBUG: WARTIME - extracted ${territoriesToFlip.length} territories from fallback`);
      }
    }

    console.log(`   🔍 DEBUG: WARTIME - final territoriesToFlip count=${territoriesToFlip.length}`);
    if (territoriesToFlip.length === 0) {
      console.log(
        `   ⏭️  Bene Gesserit passes on WARTIME (no territories specified)\n`
      );
      return { state: newState, events: newEvents };
    }

    // Flip advisors in each specified territory
    for (const { territoryId, sector } of territoriesToFlip) {
      // Find the territory info
      const territoryInfo = territories.find(
        (t) => t.territoryId === territoryId && t.sector === sector
      );

      if (!territoryInfo) {
        console.log(
          `   ⚠️  WARTIME: Territory ${territoryId} (sector ${sector}) not found or not eligible, skipping\n`
        );
        continue;
      }

      // Double-check restrictions (in case state changed)
      if (!this.canFlipAdvisors(newState, territoryId, sector)) {
        console.log(
          `   ⚠️  WARTIME: Cannot flip advisors in ${territoryId} (sector ${sector}) - PEACETIME or STORMED IN restriction\n`
        );
        continue;
      }

      // Flip all advisors in this territory
      const advisorCount = territoryInfo.advisorCount;
      newState = convertBGAdvisorsToFighters(
        newState,
        territoryId,
        sector,
        advisorCount
      );

      console.log(
        `   ⚔️  WARTIME: Bene Gesserit flips ${advisorCount} advisors to fighters in ${territoryId} (sector ${sector})\n`
      );

      // Emit public announcement event
      newEvents.push({
        type: "ADVISORS_FLIPPED",
        data: {
          faction: Faction.BENE_GESSERIT,
          territoryId,
          sector,
          advisorCount,
          reason: "WARTIME",
        },
        message: `Bene Gesserit declares WARTIME: ${advisorCount} advisors flipped to fighters in ${territoryId} (sector ${sector})`,
      });
    }

    return { state: newState, events: newEvents };
  }
}

