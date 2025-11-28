/**
 * Agent Response Builder for Revival Phase
 * 
 * Helper utilities for building mock agent responses for revival phase testing.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a force revival response
   */
  queueForceRevival(
    faction: Faction,
    additionalCount: number
  ): this {
    this.queueResponse('REVIVE_FORCES', {
      factionId: faction,
      actionType: 'REVIVE_FORCES',
      data: { count: additionalCount },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a leader revival response
   */
  queueLeaderRevival(
    faction: Faction,
    leaderId: string
  ): this {
    this.queueResponse('REVIVE_LEADER', {
      factionId: faction,
      actionType: 'REVIVE_LEADER',
      data: { leaderId },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Kwisatz Haderach revival response
   */
  queueKwisatzHaderachRevival(faction: Faction): this {
    this.queueResponse('REVIVE_KWISATZ_HADERACH', {
      factionId: faction,
      actionType: 'REVIVE_KWISATZ_HADERACH',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Fremen revival boost grant/deny response
   */
  queueFremenBoost(
    faction: Faction,
    grant: boolean
  ): this {
    this.queueResponse('GRANT_FREMEN_REVIVAL_BOOST', {
      factionId: faction,
      actionType: grant ? 'GRANT_FREMEN_REVIVAL_BOOST' : 'DENY_FREMEN_REVIVAL_BOOST',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass response
   */
  queuePass(faction: Faction): this {
    this.queueResponse('REVIVE_FORCES', {
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
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

