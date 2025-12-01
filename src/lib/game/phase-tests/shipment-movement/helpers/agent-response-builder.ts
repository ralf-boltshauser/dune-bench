/**
 * Agent Response Builder for Shipment & Movement Phase
 * 
 * Helper utilities for building mock agent responses for shipment and movement testing.
 */

import { Faction, TerritoryId } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a shipment response
   * Note: Handler expects actionType 'SHIP_FORCES' but requestType is also 'SHIP_FORCES'
   */
  queueShipment(
    faction: Faction,
    data: {
      territoryId: TerritoryId;
      sector: number;
      regularCount: number;
      eliteCount?: number;
    }
  ): this {
    this.queueResponse('SHIP_FORCES', {
      factionId: faction,
      actionType: 'SHIP_FORCES', // Handler checks for this
      data: {
        territoryId: data.territoryId,
        sector: data.sector,
        regularCount: data.regularCount,
        eliteCount: data.eliteCount ?? 0,
        count: (data.regularCount ?? 0) + (data.eliteCount ?? 0),
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Fremen free shipment response
   */
  queueFremenShipment(
    faction: Faction,
    data: {
      territoryId: TerritoryId;
      sector: number;
      regularCount: number;
      eliteCount?: number;
    }
  ): this {
    this.queueResponse('SHIP_FORCES', { // Request type is SHIP_FORCES
      factionId: faction,
      actionType: 'FREMEN_SEND_FORCES', // But action type is FREMEN_SEND_FORCES
      data: {
        territoryId: data.territoryId,
        sector: data.sector,
        regularCount: data.regularCount,
        eliteCount: data.eliteCount ?? 0,
        count: (data.regularCount ?? 0) + (data.eliteCount ?? 0),
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a movement response
   */
  queueMovement(
    faction: Faction,
    data: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      toTerritoryId: TerritoryId;
      toSector: number;
      count: number;
      useElite?: boolean;
    }
  ): this {
    this.queueResponse('MOVE_FORCES', {
      factionId: faction,
      actionType: 'MOVE_FORCES', // Handler checks for this
      data: {
        fromTerritoryId: data.fromTerritoryId,
        fromSector: data.fromSector,
        toTerritoryId: data.toTerritoryId,
        toSector: data.toSector,
        count: data.count,
        useElite: data.useElite ?? false,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass shipment response
   */
  queuePassShipment(faction: Faction): this {
    this.queueResponse('SHIP_FORCES', { // Request type is SHIP_FORCES
      factionId: faction,
      actionType: 'PASS_SHIPMENT', // Action type for passing
      data: {},
      passed: true,
    });
    return this;
  }

  /**
   * Queue a pass movement response
   */
  queuePassMovement(faction: Faction): this {
    this.queueResponse('PASS', {
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
    return this;
  }

  /**
   * Queue a Guild "act now" response
   */
  queueGuildActNow(faction: Faction): this {
    this.queueResponse('GUILD_TIMING_DECISION', {
      factionId: faction,
      actionType: 'GUILD_ACT_NOW',
      data: { decision: 'act_now' },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Guild "wait" response (act later)
   */
  queueGuildWait(faction: Faction): this {
    this.queueResponse('GUILD_TIMING_DECISION', {
      factionId: faction,
      actionType: 'GUILD_WAIT',
      data: { decision: 'later' },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Guild "delay to end" response
   */
  queueGuildDelayToEnd(faction: Faction): this {
    this.queueResponse('GUILD_TIMING_DECISION', {
      factionId: faction,
      actionType: 'GUILD_DELAY_TO_END',
      data: { decision: 'delay_to_end' },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Guild cross-ship response
   */
  queueGuildCrossShip(
    faction: Faction,
    data: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      toTerritoryId: TerritoryId;
      toSector: number;
      count: number;
      useElite?: boolean;
    }
  ): this {
    this.queueResponse('SHIP_FORCES', { // Request type is SHIP_FORCES
      factionId: faction,
      actionType: 'GUILD_CROSS_SHIP', // But action type is GUILD_CROSS_SHIP
      data: {
        fromTerritoryId: data.fromTerritoryId,
        fromSector: data.fromSector,
        toTerritoryId: data.toTerritoryId,
        toSector: data.toSector,
        count: data.count,
        useElite: data.useElite ?? false,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Guild off-planet shipment response
   */
  queueGuildOffPlanet(
    faction: Faction,
    data: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      count: number;
      useElite?: boolean;
    }
  ): this {
    this.queueResponse('SHIP_FORCES', { // Request type is SHIP_FORCES
      factionId: faction,
      actionType: 'GUILD_SHIP_OFF_PLANET', // But action type is GUILD_SHIP_OFF_PLANET
      data: {
        fromTerritoryId: data.fromTerritoryId,
        fromSector: data.fromSector,
        count: data.count,
        useElite: data.useElite ?? false,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Bene Gesserit spiritual advisor response
   */
  queueBGSpiritualAdvisor(
    faction: Faction,
    data: {
      territoryId: TerritoryId;
      sector: number;
      sendToPolarSink?: boolean;
    }
  ): this {
    this.queueResponse('SEND_ADVISOR', { // Request type is SEND_ADVISOR
      factionId: faction,
      actionType: 'BG_SEND_SPIRITUAL_ADVISOR', // Action type
      data: {
        territoryId: data.territoryId,
        sector: data.sector,
        sendToPolarSink: data.sendToPolarSink ?? false,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass for BG spiritual advisor (don't send)
   */
  queueBGPassAdvisor(faction: Faction): this {
    this.queueResponse('SEND_ADVISOR', { // Request type is SEND_ADVISOR
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
    return this;
  }

  /**
   * Queue playing HAJR card for extra movement
   */
  queuePlayHajr(faction: Faction): this {
    this.queueResponse('PLAY_CARD', {
      factionId: faction,
      actionType: 'PLAY_CARD',
      data: {
        cardId: 'hajr',
      },
      passed: false,
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

