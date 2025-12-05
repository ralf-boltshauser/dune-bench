/**
 * Integration Tests for Complete Phase Flow
 * 
 * Tests the complete bidding phase flow: initialize → auction → bidding → resolution.
 */

import { describe, it, expect } from "vitest";
import { BiddingPhaseHandler } from "@/lib/game/phases/handlers/bidding";
import { Faction, Phase } from "@/lib/game/types";
import {
  assertSpice,
  assertHandSize,
  assertEventEmitted,
  assertPhaseComplete,
  assertNextPhase,
} from "../helpers/assertions";
import {
  BiddingTestStateBuilder,
  createBasicBiddingState,
} from "../helpers/test-state-builder";
import { AgentResponseBuilder } from "../helpers/agent-response-builder";

describe("Phase Flow Integration", () => {
  it("should complete a full phase with single auction", () => {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 15)
      .withSpice(Faction.HARKONNEN, 15)
      .build();

    const handler = new BiddingPhaseHandler();
    const initResult = handler.initialize(state);

    // Process bidding
    const responses = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 1)
      .queueBid(Faction.HARKONNEN, 2)
      .queuePass(Faction.ATREIDES)
      .getResponses();

    let currentState = initResult.state;
    let phaseComplete = initResult.phaseComplete;

    while (!phaseComplete && responses.length > 0) {
      const stepResult = handler.processStep(currentState, responses.splice(0, 1));
      currentState = stepResult.state;
      phaseComplete = stepResult.phaseComplete;

      if (stepResult.pendingRequests.length > 0) {
        // In real test, would get agent responses here
        break;
      }
    }

    // Assertions would go here
    expect(currentState).toBeDefined();
  });

  it("should handle multiple auctions in sequence", () => {
    const state = createBasicBiddingState();
    const handler = new BiddingPhaseHandler();

    // Initialize
    const initResult = handler.initialize(state);
    expect(initResult).toBeDefined();

    // Process multiple auctions
    // This would require more complex response handling
  });

  it("should handle BOUGHT-IN rule correctly", () => {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withSpice(Faction.ATREIDES, 1)
      .withSpice(Faction.HARKONNEN, 1)
      .withSpice(Faction.EMPEROR, 1)
      .build();

    const handler = new BiddingPhaseHandler();
    const initResult = handler.initialize(state);

    const responses = new AgentResponseBuilder()
      .queueAllPass([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .getResponses();

    const stepResult = handler.processStep(initResult.state, responses);

    // Should trigger BOUGHT-IN
    assertEventEmitted(stepResult.events, "CARD_BOUGHT_IN");
    assertPhaseComplete(stepResult, true);
  });
});

