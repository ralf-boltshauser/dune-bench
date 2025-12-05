/**
 * Response Builder
 *
 * Fluent API for creating agent responses in tests.
 */

import type { AgentResponse } from "@/lib/game/phases/types";
import { Faction } from "@/lib/game/types";

export class ResponseBuilder {
  private response: Partial<AgentResponse> = {};

  static create(): ResponseBuilder {
    return new ResponseBuilder();
  }

  forFaction(faction: Faction): this {
    this.response.factionId = faction;
    return this;
  }

  withAction(actionType: string): this {
    this.response.actionType = actionType;
    return this;
  }

  withData(data: Record<string, unknown>): this {
    this.response.data = data;
    return this;
  }

  withReasoning(reasoning: string): this {
    this.response.reasoning = reasoning;
    return this;
  }

  withPassed(passed: boolean): this {
    this.response.passed = passed;
    return this;
  }

  asPass(reasoning?: string): this {
    this.response.actionType = "PASS";
    this.response.passed = true;
    if (reasoning) {
      this.response.reasoning = reasoning;
    }
    return this;
  }

  asAction(actionType: string, data?: Record<string, unknown>): this {
    this.response.actionType = actionType;
    this.response.passed = false;
    if (data) {
      this.response.data = data;
    }
    return this;
  }

  build(): AgentResponse {
    return {
      factionId: Faction.ATREIDES,
      actionType: "PASS",
      data: {},
      passed: true,
      ...this.response,
    } as AgentResponse;
  }

  // Preset methods
  static passResponse(faction: Faction, reasoning?: string): ResponseBuilder {
    return ResponseBuilder.create()
      .forFaction(faction)
      .withAction("PASS")
      .withData({})
      .withReasoning(reasoning || "Passing")
      .withPassed(true);
  }

  static actionResponse(
    faction: Faction,
    actionType: string,
    data: Record<string, unknown>,
    reasoning?: string
  ): ResponseBuilder {
    const builder = ResponseBuilder.create()
      .forFaction(faction)
      .withAction(actionType)
      .withData(data)
      .withPassed(false);
    if (reasoning) {
      builder.withReasoning(reasoning);
    }
    return builder;
  }

  static errorResponse(faction: Faction, errorMessage: string): ResponseBuilder {
    return ResponseBuilder.create()
      .forFaction(faction)
      .withAction("PASS")
      .withData({})
      .withReasoning(`Error occurred: ${errorMessage}`)
      .withPassed(true);
  }
}

