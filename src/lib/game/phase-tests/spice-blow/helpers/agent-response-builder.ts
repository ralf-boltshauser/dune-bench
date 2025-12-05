/**
 * Agent Response Builder for Spice Blow Phase
 * 
 * Helper utilities for building mock agent responses for spice blow phase testing.
 */

import { Faction } from '../../../types';
import type { AgentRequest, AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();
  private responseSequence: AgentResponse[] = [];

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
      passed: action === 'PASS',
    });
    return this;
  }

  /**
   * Fluent API: For a specific faction
   */
  forFremen(): FremenResponseBuilder {
    return new FremenResponseBuilder(this, Faction.FREMEN);
  }

  forFaction(faction: Faction): FactionResponseBuilder {
    return new FactionResponseBuilder(this, faction);
  }

  /**
   * Queue a response sequence (for multi-step scenarios)
   */
  queueResponseSequence(responses: AgentResponse[]): this {
    this.responseSequence.push(...responses);
    return this;
  }

  /**
   * Auto-match responses to requests (for dynamic scenarios)
   */
  autoMatchRequests(requests: AgentRequest[]): AgentResponse[] {
    const matched: AgentResponse[] = [];
    
    for (const request of requests) {
      const responses = this.responses.get(request.requestType);
      if (responses && responses.length > 0) {
        matched.push(responses.shift()!);
      } else if (this.responseSequence.length > 0) {
        matched.push(this.responseSequence.shift()!);
      } else {
        // Default: pass
        matched.push({
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        });
      }
    }
    
    return matched;
  }

  /**
   * Queue a generic response
   */
  queueResponse(
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
    this.responseSequence = [];
    return this;
  }
}

/**
 * Fluent builder for Fremen responses
 */
class FremenResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  protectAlly(protect: boolean): this {
    this.parent.queueFremenProtection(this.faction, protect);
    return this;
  }

  rideWorm(ride: boolean): this {
    this.parent.queueWormRide(this.faction, ride);
    return this;
  }

  formAlliance(target: Faction): this {
    this.parent.queueAllianceDecision(this.faction, 'FORM_ALLIANCE', target);
    return this;
  }

  breakAlliance(): this {
    this.parent.queueAllianceDecision(this.faction, 'BREAK_ALLIANCE');
    return this;
  }

  pass(): this {
    this.parent.queueAllianceDecision(this.faction, 'PASS');
    return this;
  }
}

/**
 * Fluent builder for any faction responses
 */
class FactionResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  formAlliance(target: Faction): this {
    this.parent.queueAllianceDecision(this.faction, 'FORM_ALLIANCE', target);
    return this;
  }

  breakAlliance(): this {
    this.parent.queueAllianceDecision(this.faction, 'BREAK_ALLIANCE');
    return this;
  }

  pass(): this {
    this.parent.queueAllianceDecision(this.faction, 'PASS');
    return this;
  }
}

