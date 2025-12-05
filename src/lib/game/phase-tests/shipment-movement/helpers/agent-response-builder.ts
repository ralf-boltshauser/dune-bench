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
      cost?: number; // Optional cost (for tests)
    }
  ): this {
    const responseData: any = {
      territoryId: data.territoryId,
      sector: data.sector,
      regularCount: data.regularCount,
      eliteCount: data.eliteCount ?? 0,
      count: (data.regularCount ?? 0) + (data.eliteCount ?? 0),
    };
    // Explicitly set cost if provided (don't use spread to avoid issues)
    if (data.cost !== undefined) {
      responseData.cost = data.cost;
    }
    // Debug: Log cost for Guild
    if (faction === 'SPACING_GUILD' || faction === 4) { // 4 is SPACING_GUILD enum value
      console.log(`   🔍 DEBUG: queueShipment - cost=${data.cost}, undefined=${data.cost === undefined}`);
    }
    this.queueResponse('SHIP_FORCES', {
      factionId: faction,
      actionType: 'SHIP_FORCES', // Handler checks for this
      data: responseData,
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
    // Debug: Log BG movements
    if (faction === Faction.BENE_GESSERIT || String(faction).toLowerCase() === 'bene_gesserit') {
      console.log(`   🔍 DEBUG: queueMovement - BG movement queued: from=${data.fromTerritoryId}, to=${data.toTerritoryId}, count=${data.count}`);
    }
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
    this.queueResponse('MOVE_FORCES', { // Request type is MOVE_FORCES
      factionId: faction,
      actionType: 'PASS', // Action type for passing
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
      cost?: number;
    }
  ): this {
    // Note: Request type should match what the handler requests
    // The handler requests 'SHIP_FORCES' for all shipment types, but actionType distinguishes them
    this.queueResponse('SHIP_FORCES', {
      factionId: faction,
      actionType: 'GUILD_CROSS_SHIP', // Action type distinguishes cross-ship from normal shipment
      data: {
        fromTerritoryId: data.fromTerritoryId,
        fromSector: data.fromSector,
        toTerritoryId: data.toTerritoryId,
        toSector: data.toSector,
        count: data.count,
        useElite: data.useElite ?? false,
        cost: data.cost, // Include cost if provided
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
      cost?: number;
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
        cost: data.cost, // Include cost if provided
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

  // =============================================================================
  // FLUENT API - Specialized Builders
  // =============================================================================

  /**
   * Get a builder for a specific faction
   */
  forFaction(faction: Faction): FactionResponseBuilder {
    return new FactionResponseBuilder(this, faction);
  }

  /**
   * Get a builder for Guild
   */
  forGuild(): GuildResponseBuilder {
    return new GuildResponseBuilder(this, Faction.SPACING_GUILD);
  }

  /**
   * Get a builder for BG
   */
  forBG(): BGResponseBuilder {
    return new BGResponseBuilder(this, Faction.BENE_GESSERIT);
  }

  // =============================================================================
  // COMMON PATTERNS
  // =============================================================================

  /**
   * Queue shipment then movement for a faction
   */
  queueShipmentThenMovement(
    faction: Faction,
    shipment: {
      territoryId: TerritoryId;
      sector: number;
      regularCount: number;
      eliteCount?: number;
    },
    movement: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      toTerritoryId: TerritoryId;
      toSector: number;
      count: number;
      useElite?: boolean;
    }
  ): this {
    this.queueShipment(faction, shipment);
    this.queueMovement(faction, movement);
    return this;
  }

  /**
   * Queue pass for both shipment and movement
   */
  queuePassBoth(faction: Faction): this {
    this.queuePassShipment(faction);
    this.queuePassMovement(faction);
    return this;
  }

  /**
   * Queue all factions to pass
   */
  queueAllFactionsPass(factions: Faction[]): this {
    for (const faction of factions) {
      this.queuePassBoth(faction);
    }
    return this;
  }

  // =============================================================================
  // BG ABILITY HELPERS
  // =============================================================================

  /**
   * Queue BG INTRUSION response
   */
  queueBGIntrusion(
    faction: Faction,
    data: {
      territory: TerritoryId;
      sector: number;
      flipCount: number;
    }
  ): this {
    this.queueResponse('BG_INTRUSION', {
      factionId: faction,
      actionType: 'BG_INTRUSION',
      data: {
        choice: 'flip',
        territory: data.territory,
        sector: data.sector,
        count: data.flipCount,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue BG WARTIME response
   */
  queueBGWartime(
    faction: Faction,
    territories: Array<{ territoryId: TerritoryId; sector: number }>
  ): this {
    this.queueResponse('FLIP_ADVISORS', {
      factionId: faction,
      actionType: 'FLIP_ADVISORS', // Handler checks for this action type
      data: {
        territories: territories.map((t) => ({
          territoryId: t.territoryId,
          sector: t.sector,
        })),
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue BG TAKE UP ARMS response
   */
  queueBGTakeUpArms(
    faction: Faction,
    data: {
      territory: TerritoryId;
      sector: number;
      flipCount: number;
    }
  ): this {
    this.queueResponse('TAKE_UP_ARMS', { // Request type matches handler's requestType
      factionId: faction,
      actionType: 'BG_TAKE_UP_ARMS', // Action type matches handler's check
      data: {
        choice: 'flip',
        territory: data.territory,
        sector: data.sector,
        count: data.flipCount,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue BG pass on ability
   */
  queueBGPassAbility(
    faction: Faction,
    ability: 'INTRUSION' | 'WARTIME' | 'TAKE_UP_ARMS'
  ): this {
    // WARTIME handler requests 'FLIP_ADVISORS', not 'BG_WARTIME'
    const requestType =
      ability === 'INTRUSION'
        ? 'BG_INTRUSION'
        : ability === 'WARTIME'
        ? 'FLIP_ADVISORS' // Handler requests FLIP_ADVISORS for WARTIME
        : 'TAKE_UP_ARMS'; // Handler requests TAKE_UP_ARMS (not BG_TAKE_UP_ARMS)
    this.queueResponse(requestType, {
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
    return this;
  }

  // =============================================================================
  // GUILD HELPERS
  // =============================================================================

  /**
   * Queue Guild timing decision
   */
  queueGuildTiming(
    faction: Faction,
    timing: 'NOW' | 'LATER' | 'DELAY_TO_END'
  ): this {
    if (timing === 'NOW') {
      this.queueGuildActNow(faction);
    } else if (timing === 'LATER') {
      this.queueGuildWait(faction);
    } else {
      this.queueGuildDelayToEnd(faction);
    }
    return this;
  }

  /**
   * Queue Guild shipment and movement sequence
   */
  queueGuildShipmentSequence(
    faction: Faction,
    shipment: {
      type: 'normal' | 'cross-ship' | 'off-planet';
      data: any;
    },
    movement: {
      fromTerritoryId: TerritoryId;
      fromSector: number;
      toTerritoryId: TerritoryId;
      toSector: number;
      count: number;
      useElite?: boolean;
    }
  ): this {
    if (shipment.type === 'cross-ship') {
      this.queueGuildCrossShip(faction, shipment.data);
    } else if (shipment.type === 'off-planet') {
      this.queueGuildOffPlanet(faction, shipment.data);
    } else {
      this.queueShipment(faction, shipment.data);
    }
    this.queueMovement(faction, movement);
    return this;
  }
}

// =============================================================================
// SPECIALIZED BUILDERS
// =============================================================================

/**
 * Builder for faction responses
 */
export class FactionResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  shipment(data: {
    territoryId: TerritoryId;
    sector: number;
    regularCount: number;
    eliteCount?: number;
  }): this {
    this.parent.queueShipment(this.faction, data);
    return this;
  }

  movement(data: {
    fromTerritoryId: TerritoryId;
    fromSector: number;
    toTerritoryId: TerritoryId;
    toSector: number;
    count: number;
    useElite?: boolean;
  }): this {
    this.parent.queueMovement(this.faction, data);
    return this;
  }

  passShipment(): this {
    this.parent.queuePassShipment(this.faction);
    return this;
  }

  passMovement(): this {
    this.parent.queuePassMovement(this.faction);
    return this;
  }

  passBoth(): this {
    this.parent.queuePassBoth(this.faction);
    return this;
  }
}

/**
 * Builder for Guild responses
 */
export class GuildResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  timing(choice: 'NOW' | 'LATER' | 'DELAY_TO_END'): this {
    this.parent.queueGuildTiming(this.faction, choice);
    return this;
  }

  normalShipment(data: {
    territoryId: TerritoryId;
    sector: number;
    regularCount: number;
    eliteCount?: number;
  }): this {
    this.parent.queueShipment(this.faction, data);
    return this;
  }

  crossShip(data: {
    fromTerritoryId: TerritoryId;
    fromSector: number;
    toTerritoryId: TerritoryId;
    toSector: number;
    count: number;
    useElite?: boolean;
  }): this {
    this.parent.queueGuildCrossShip(this.faction, data);
    return this;
  }

  offPlanet(data: {
    fromTerritoryId: TerritoryId;
    fromSector: number;
    count: number;
    useElite?: boolean;
  }): this {
    this.parent.queueGuildOffPlanet(this.faction, data);
    return this;
  }

  movement(data: {
    fromTerritoryId: TerritoryId;
    fromSector: number;
    toTerritoryId: TerritoryId;
    toSector: number;
    count: number;
    useElite?: boolean;
  }): this {
    this.parent.queueMovement(this.faction, data);
    return this;
  }
}

/**
 * Builder for BG responses
 */
export class BGResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  spiritualAdvisor(data: {
    territoryId: TerritoryId;
    sector: number;
    sendToPolarSink?: boolean;
  }): this {
    this.parent.queueBGSpiritualAdvisor(this.faction, data);
    return this;
  }

  passSpiritualAdvisor(): this {
    this.parent.queueBGPassAdvisor(this.faction);
    return this;
  }

  intrusion(data: {
    territory: TerritoryId;
    sector: number;
    flipCount: number;
  }): this {
    this.parent.queueBGIntrusion(this.faction, data);
    return this;
  }

  passIntrusion(): this {
    this.parent.queueBGPassAbility(this.faction, 'INTRUSION');
    return this;
  }

  wartime(territories: Array<{ territoryId: TerritoryId; sector: number }>): this {
    this.parent.queueBGWartime(this.faction, territories);
    return this;
  }

  passWartime(): this {
    this.parent.queueBGPassAbility(this.faction, 'WARTIME');
    return this;
  }

  takeUpArms(data: {
    territory: TerritoryId;
    sector: number;
    flipCount: number;
  }): this {
    this.parent.queueBGTakeUpArms(this.faction, data);
    return this;
  }

  passTakeUpArms(): this {
    this.parent.queueBGPassAbility(this.faction, 'TAKE_UP_ARMS');
    return this;
  }
}

