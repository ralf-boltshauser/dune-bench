/**
 * Request Builder
 *
 * Fluent API for creating agent requests in tests.
 */

import type { AgentRequest, AgentRequestType } from "../../../../phases/types";
import { Faction } from "@/lib/game/types";

export class RequestBuilder {
  private request: Partial<AgentRequest> = {};

  static create(): RequestBuilder {
    return new RequestBuilder();
  }

  forFaction(faction: Faction): this {
    this.request.factionId = faction;
    return this;
  }

  withType(type: AgentRequestType): this {
    this.request.requestType = type;
    return this;
  }

  withPrompt(prompt: string): this {
    this.request.prompt = prompt;
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.request.context = context;
    return this;
  }

  withActions(actions: string[]): this {
    this.request.availableActions = actions;
    return this;
  }

  withTimeout(timeout: number): this {
    this.request.timeout = timeout;
    return this;
  }

  withUrgent(urgent: boolean): this {
    this.request.urgent = urgent;
    return this;
  }

  build(): AgentRequest {
    return {
      factionId: Faction.ATREIDES,
      requestType: "USE_KARAMA",
      prompt: "Test",
      context: {},
      availableActions: ["PASS"],
      ...this.request,
    } as AgentRequest;
  }

  // Preset methods
  static bidRequest(faction: Faction, context?: Record<string, unknown>): RequestBuilder {
    return RequestBuilder.create()
      .forFaction(faction)
      .withType("BID_OR_PASS")
      .withPrompt("Make a bid or pass")
      .withContext(context || { currentBid: 0, auctionNumber: 1 })
      .withActions(["BID", "PASS"]);
  }

  static passRequest(faction: Faction): RequestBuilder {
    return RequestBuilder.create()
      .forFaction(faction)
      .withType("BID_OR_PASS")
      .withPrompt("Make a bid or pass")
      .withContext({})
      .withActions(["BID", "PASS"]);
  }

  static peekRequest(faction: Faction, cardId: string): RequestBuilder {
    return RequestBuilder.create()
      .forFaction(faction)
      .withType("PEEK_CARD")
      .withPrompt("Peek at the card")
      .withContext({ cardId })
      .withActions(["PEEK_CARD", "PASS"]);
  }
}

