/**
 * Agent Response Builder for Bidding Phase
 * 
 * Helper utilities for building mock agent responses for bidding tests.
 * Enhanced with fluent API and sequences.
 */

import { Faction } from '../../../types';
import type { AgentResponse, AgentRequest } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: AgentResponse[] = [];
  private currentAuction: number | null = null;

  /**
   * Start organizing responses for a specific auction
   */
  forAuction(auctionNumber: number): AuctionResponseBuilder {
    this.currentAuction = auctionNumber;
    return new AuctionResponseBuilder(this, auctionNumber);
  }

  /**
   * Queue a bid response
   */
  queueBid(faction: Faction, amount: number): this {
    this.queueResponse({
      factionId: faction,
      actionType: 'BID',
      data: { amount },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass response
   */
  queuePass(faction: Faction): this {
    this.queueResponse({
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
    return this;
  }

  /**
   * Queue Atreides peek acknowledgment
   */
  queueAtreidesPeek(faction: Faction = Faction.ATREIDES): this {
    this.queueResponse({
      factionId: faction,
      actionType: 'PEEK_CARD',
      data: { acknowledged: true },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Karama card usage to buy without paying
   */
  queueKaramaBuyWithoutPaying(
    faction: Faction,
    karamaCardId: string
  ): this {
    // First use Karama tool
    this.queueResponse({
      factionId: faction,
      actionType: 'USE_KARAMA_BUY_WITHOUT_PAYING',
      data: { karamaCardId },
      passed: false,
    });
    // Then bid (which will be free due to Karama)
    this.queueResponse({
      factionId: faction,
      actionType: 'BID',
      data: { amount: 1, useKarama: true },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Karama card usage to bid over spice limit
   */
  queueKaramaBidOverSpice(
    faction: Faction,
    karamaCardId: string,
    bidAmount: number
  ): this {
    // First use Karama tool
    this.queueResponse({
      factionId: faction,
      actionType: 'USE_KARAMA_BID_OVER_SPICE',
      data: { karamaCardId, bidAmount },
      passed: false,
    });
    // Then bid with the amount
    this.queueResponse({
      factionId: faction,
      actionType: 'BID',
      data: { amount: bidAmount, useKarama: true },
      passed: false,
    });
    return this;
  }

  /**
   * Queue multiple passes (for bought-in scenario)
   */
  queueAllPass(factions: Faction[]): this {
    for (const faction of factions) {
      this.queuePass(faction);
    }
    return this;
  }

  /**
   * Queue a bidding war sequence
   */
  queueBiddingWar(
    factions: Faction[],
    startBid: number,
    endBid: number
  ): this {
    let currentBid = startBid;
    for (const faction of factions) {
      if (currentBid <= endBid) {
        this.queueBid(faction, currentBid);
        currentBid++;
      } else {
        this.queuePass(faction);
      }
    }
    return this;
  }

  /**
   * Queue a single winner scenario (one bid, all others pass)
   */
  queueSingleWinner(winner: Faction, bidAmount: number, otherFactions: Faction[]): this {
    this.queueBid(winner, bidAmount);
    for (const faction of otherFactions) {
      this.queuePass(faction);
    }
    return this;
  }

  /**
   * Generic response queue
   */
  queueResponse(response: AgentResponse): this {
    this.responses.push(response);
    return this;
  }

  /**
   * Get all queued responses as array
   */
  getResponses(): AgentResponse[] {
    return this.responses;
  }

  /**
   * Match responses to requests automatically
   */
  matchRequests(requests: AgentRequest[]): AgentResponse[] {
    const matched: AgentResponse[] = [];
    let responseIndex = 0;

    for (const request of requests) {
      // Find next response for this faction or request type
      while (responseIndex < this.responses.length) {
        const response = this.responses[responseIndex];
        if (
          response.factionId === request.factionId ||
          (request.requestType === 'BID_OR_PASS' &&
            (response.actionType === 'BID' || response.actionType === 'PASS'))
        ) {
          matched.push(response);
          responseIndex++;
          break;
        }
        responseIndex++;
      }
    }

    return matched;
  }

  /**
   * Clear all responses
   */
  clear(): this {
    this.responses = [];
    this.currentAuction = null;
    return this;
  }

  /**
   * Build responses (for fluent API compatibility)
   */
  build(): AgentResponse[] {
    return this.responses;
  }
}

/**
 * Fluent builder for auction-specific responses
 */
class AuctionResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private auctionNumber: number
  ) {}

  /**
   * Atreides peek acknowledgment
   */
  atreidesPeek(faction: Faction = Faction.ATREIDES): this {
    this.parent.queueAtreidesPeek(faction);
    return this;
  }

  /**
   * Queue a bid
   */
  bid(faction: Faction, amount: number): this {
    this.parent.queueBid(faction, amount);
    return this;
  }

  /**
   * Queue a pass
   */
  pass(faction: Faction): this {
    this.parent.queuePass(faction);
    return this;
  }

  /**
   * Return to parent builder
   */
  endAuction(): AgentResponseBuilder {
    return this.parent;
  }

  /**
   * Start organizing responses for another auction (chainable)
   */
  forAuction(auctionNumber: number): AuctionResponseBuilder {
    return this.parent.forAuction(auctionNumber);
  }
}

