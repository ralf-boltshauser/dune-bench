/**
 * Agent Response Builder for Storm Phase Tests
 * 
 * Helper utilities for building mock agent responses for storm phase testing.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a storm dial response
   */
  queueStormDial(
    faction: Faction,
    dial: number
  ): this {
    this.queueResponse('DIAL_STORM', {
      factionId: faction,
      actionType: 'DIAL_STORM',
      data: { dial },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Weather Control response
   */
  queueWeatherControl(
    faction: Faction,
    movement: number | null // null = no movement, 1-10 = sectors to move
  ): this {
    this.queueResponse('PLAY_WEATHER_CONTROL', {
      factionId: faction,
      actionType: 'PLAY_WEATHER_CONTROL',
      data: { movement },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Family Atomics response
   */
  queueFamilyAtomics(faction: Faction): this {
    this.queueResponse('PLAY_FAMILY_ATOMICS', {
      factionId: faction,
      actionType: 'PLAY_FAMILY_ATOMICS',
      data: {},
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass response
   */
  queuePass(faction: Faction): this {
    this.queueResponse('PASS', {
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

