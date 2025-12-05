/**
 * Response Assertions
 *
 * Reusable assertions for agent responses.
 */

import type { AgentResponse } from "@/lib/game/phases/types";
import { Faction } from "@/lib/game/types";

export class ResponseAssertions {
  static expectValidResponse(response: AgentResponse): void {
    if (!response.factionId) {
      throw new Error("Response missing factionId");
    }
    if (!response.actionType) {
      throw new Error("Response missing actionType");
    }
    if (typeof response.data !== "object") {
      throw new Error("Response data must be an object");
    }
  }

  static expectPassResponse(
    response: AgentResponse,
    faction: Faction
  ): void {
    this.expectValidResponse(response);
    if (response.factionId !== faction) {
      throw new Error(
        `Expected faction ${faction}, got ${response.factionId}`
      );
    }
    if (response.actionType !== "PASS") {
      throw new Error(
        `Expected actionType PASS, got ${response.actionType}`
      );
    }
    if (!response.passed) {
      throw new Error("Expected passed to be true");
    }
  }

  static expectActionResponse(
    response: AgentResponse,
    faction: Faction,
    actionType: string
  ): void {
    this.expectValidResponse(response);
    if (response.factionId !== faction) {
      throw new Error(
        `Expected faction ${faction}, got ${response.factionId}`
      );
    }
    if (response.actionType !== actionType.toUpperCase()) {
      throw new Error(
        `Expected actionType ${actionType.toUpperCase()}, got ${response.actionType}`
      );
    }
    if (response.passed) {
      throw new Error("Expected passed to be false for action response");
    }
  }

  static expectResponseData(
    response: AgentResponse,
    expectedData: Record<string, unknown>
  ): void {
    for (const [key, value] of Object.entries(expectedData)) {
      if (response.data[key] !== value) {
        throw new Error(
          `Expected data.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(response.data[key])}`
        );
      }
    }
  }

  static expectResponseCount(
    responses: AgentResponse[],
    expectedCount: number
  ): void {
    if (responses.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} responses, got ${responses.length}`
      );
    }
  }

  static expectResponseOrder(
    responses: AgentResponse[],
    expectedFactions: Faction[]
  ): void {
    if (responses.length !== expectedFactions.length) {
      throw new Error(
        `Expected ${expectedFactions.length} responses, got ${responses.length}`
      );
    }
    responses.forEach((response, index) => {
      if (response.factionId !== expectedFactions[index]) {
        throw new Error(
          `Expected response ${index} to be from ${expectedFactions[index]}, got ${response.factionId}`
        );
      }
    });
  }
}

