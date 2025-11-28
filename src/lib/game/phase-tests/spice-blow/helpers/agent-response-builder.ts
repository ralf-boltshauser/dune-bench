/**
 * Agent Response Builder for Spice Blow Phase
 * 
 * Helper utilities for building mock agent responses for spice blow phase testing.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a Fremen protection decision response
   */
  queueFremenProtection(
    faction: Faction,
    protect: boolean
  ): this {
    this.queueResponse('PROTECT_ALLY_FROM_WORM', {
      factionId: faction,
      actionType: protect ? 'PROTECT_ALLY' : 'ALLOW_DEVOURING',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Fremen worm ride choice response
   */
  queueWormRide(
    faction: Faction,
    ride: boolean
  ): this {
    this.queueResponse('WORM_RIDE', {
      factionId: faction,
      actionType: ride ? 'WORM_RIDE' : 'WORM_DEVOUR',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue an alliance decision response
   */
  queueAllianceDecision(
    faction: Faction,
    action: 'FORM_ALLIANCE' | 'BREAK_ALLIANCE' | 'PASS',
    targetFaction?: Faction
  ): this {
    this.queueResponse('ALLIANCE_DECISION', {
      factionId: faction,
      actionType: action,
      data: targetFaction ? { targetFaction } : {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a generic response
   */
  private queueResponse(
    requestType: string,
    response: AgentResponse
  ): this {
    if (!this.responses.has(requestType)) {
      this.responses.set(requestType, []);
    }
    this.responses.get(requestType)!.push(response);
    return this;
  }

  /**
   * Get all queued responses
   */
  getResponses(): Map<string, AgentResponse[]> {
    return this.responses;
  }

  /**
   * Clear all queued responses
   */
  clear(): this {
    this.responses.clear();
    return this;
  }
}

