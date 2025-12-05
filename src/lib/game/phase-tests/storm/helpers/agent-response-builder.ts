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

  /**
   * Queue both dial responses (fluent pattern)
   */
  queueBothDials(
    dialer1: Faction,
    dial1: number,
    dialer2: Faction,
    dial2: number
  ): this {
    return this.queueStormDial(dialer1, dial1).queueStormDial(dialer2, dial2);
  }

  /**
   * Queue Turn 1 dials (0-20 range)
   */
  queueTurn1Dials(
    dialer1: Faction,
    dial1: number,
    dialer2: Faction,
    dial2: number
  ): this {
    return this.queueBothDials(dialer1, dial1, dialer2, dial2);
  }

  /**
   * Queue Turn 2+ dials (1-3 range)
   */
  queueTurn2Dials(
    dialer1: Faction,
    dial1: number,
    dialer2: Faction,
    dial2: number
  ): this {
    return this.queueBothDials(dialer1, dial1, dialer2, dial2);
  }

  /**
   * Queue Weather Control with movement
   */
  queueWeatherControlWithMovement(faction: Faction, movement: number): this {
    return this.queueWeatherControl(faction, movement);
  }

  /**
   * Queue Family Atomics play
   */
  queueFamilyAtomicsPlay(faction: Faction): this {
    return this.queueFamilyAtomics(faction);
  }

  /**
   * Queue pass for all factions
   */
  queueAllPass(factions: Faction[]): this {
    for (const faction of factions) {
      this.queuePass(faction);
    }
    return this;
  }

  /**
   * Queue pass for card play
   */
  queuePassForCard(faction: Faction, cardType: string): this {
    return this.queuePass(faction);
  }

  /**
   * Get response for specific faction and request type
   */
  getResponseFor(faction: Faction, requestType: string): AgentResponse | null {
    const queue = this.responses.get(requestType) || [];
    return queue.find(r => r.factionId === faction) || null;
  }

  /**
   * Get all responses as flat array (for processStep)
   */
  getResponsesArray(): AgentResponse[] {
    const allResponses: AgentResponse[] = [];
    for (const queue of this.responses.values()) {
      allResponses.push(...queue);
    }
    return allResponses;
  }

  /**
   * Queue empty responses (for testing empty response handling)
   */
  queueEmptyResponses(): this {
    // Intentionally empty - no responses queued
    return this;
  }

  /**
   * Queue invalid dial value (for testing clamping)
   */
  queueInvalidDial(faction: Faction, invalidValue: number): this {
    return this.queueStormDial(faction, invalidValue);
  }

  /**
   * Queue missing response (simulate missing response by not queuing)
   */
  queueMissingResponse(faction: Faction): this {
    // Intentionally not queuing - simulates missing response
    return this;
  }

  /**
   * Queue both card responses (Family Atomics and Weather Control)
   */
  queueBothCardResponses(
    faction1: Faction,
    card1: 'FAMILY_ATOMICS' | 'WEATHER_CONTROL',
    faction2: Faction,
    card2: 'FAMILY_ATOMICS' | 'WEATHER_CONTROL'
  ): this {
    if (card1 === 'FAMILY_ATOMICS') {
      this.queueFamilyAtomics(faction1);
    } else {
      this.queueWeatherControl(faction1, 5); // Default movement
    }
    if (card2 === 'FAMILY_ATOMICS') {
      this.queueFamilyAtomics(faction2);
    } else {
      this.queueWeatherControl(faction2, 5); // Default movement
    }
    return this;
  }
}

