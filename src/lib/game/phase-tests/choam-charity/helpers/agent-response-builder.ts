/**
 * Agent Response Builder for CHOAM Charity Phase
 * 
 * Helper utilities for building mock agent responses for testing.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a charity claim response
   */
  queueCharityClaim(faction: Faction): this {
    this.queueResponse('CLAIM_CHARITY', {
      factionId: faction,
      actionType: 'CLAIM_CHARITY',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass response (decline charity)
   */
  queuePass(faction: Faction): this {
    this.queueResponse('CLAIM_CHARITY', {
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

