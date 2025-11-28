/**
 * Agent Response Builder for Bidding Phase
 * 
 * Helper utilities for building mock agent responses for bidding tests.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a bid response
   */
  queueBid(
    faction: Faction,
    amount: number
  ): this {
    this.queueResponse('BID_OR_PASS', {
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
    this.queueResponse('BID_OR_PASS', {
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
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
    this.queueResponse('BID_OR_PASS', {
      factionId: faction,
      actionType: 'USE_KARAMA_BUY_WITHOUT_PAYING',
      data: { karamaCardId },
      passed: false,
    });
    // Then bid (which will be free due to Karama)
    this.queueResponse('BID_OR_PASS', {
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
    this.queueResponse('BID_OR_PASS', {
      factionId: faction,
      actionType: 'USE_KARAMA_BID_OVER_SPICE',
      data: { karamaCardId, bidAmount },
      passed: false,
    });
    // Then bid with the amount
    this.queueResponse('BID_OR_PASS', {
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
   * Generic response queue
   */
  queueResponse(requestType: string, response: AgentResponse): this {
    const queue = this.responses.get(requestType) ?? [];
    queue.push(response);
    this.responses.set(requestType, queue);
    return this;
  }

  /**
   * Get all queued responses
   */
  getResponses(): Map<string, AgentResponse[]> {
    return this.responses;
  }

  /**
   * Clear all responses
   */
  clear(): this {
    this.responses.clear();
    return this;
  }
}

