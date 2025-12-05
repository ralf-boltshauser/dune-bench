/**
 * Enhanced Agent Response Builder with Fluent API
 * 
 * Fluent builder pattern for easier test writing.
 * Extends existing AgentResponseBuilder with fluent methods.
 */

import { Faction, TerritoryId } from '../../../types';
import { AgentResponseBuilder } from './agent-response-builder';

/**
 * Fluent response builder for a specific faction
 */
export class FactionResponseBuilder {
  constructor(
    private parent: AgentResponseBuilder,
    private faction: Faction
  ) {}

  /**
   * Ship forces to territory
   */
  shipTo(territoryId: TerritoryId, sector: number, count: number, eliteCount?: number, cost?: number): this {
    this.parent.queueShipment(this.faction, {
      territoryId,
      sector,
      regularCount: count,
      eliteCount,
      cost, // Include cost if provided
    });
    return this;
  }

  /**
   * Move forces from one territory to another
   */
  moveFromTo(
    fromTerritoryId: TerritoryId,
    fromSector: number,
    toTerritoryId: TerritoryId,
    toSector: number,
    count: number,
    useElite?: boolean
  ): this {
    this.parent.queueMovement(this.faction, {
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      useElite,
    });
    return this;
  }

  /**
   * Pass on shipment
   */
  passShipment(): this {
    this.parent.queuePassShipment(this.faction);
    return this;
  }

  /**
   * Pass on movement
   */
  passMovement(): this {
    this.parent.queuePassMovement(this.faction);
    return this;
  }

  /**
   * Pass on both shipment and movement
   */
  passBoth(): this {
    this.passShipment();
    this.passMovement();
    return this;
  }

  /**
   * Guild-specific: Act now
   */
  actNow(): this {
    if (this.faction !== Faction.SPACING_GUILD) {
      throw new Error('actNow() can only be called for Spacing Guild');
    }
    this.parent.queueGuildActNow(this.faction);
    return this;
  }

  /**
   * Guild-specific: Wait later
   */
  waitLater(): this {
    if (this.faction !== Faction.SPACING_GUILD) {
      throw new Error('waitLater() can only be called for Spacing Guild');
    }
    this.parent.queueGuildWait(this.faction);
    return this;
  }

  /**
   * Guild-specific: Delay to end
   */
  delayToEnd(): this {
    if (this.faction !== Faction.SPACING_GUILD) {
      throw new Error('delayToEnd() can only be called for Spacing Guild');
    }
    this.parent.queueGuildDelayToEnd(this.faction);
    return this;
  }

  /**
   * Guild-specific: Cross-ship
   */
  crossShip(
    fromTerritoryId: TerritoryId,
    fromSector: number,
    toTerritoryId: TerritoryId,
    toSector: number,
    count: number,
    useElite?: boolean,
    cost?: number
  ): this {
    if (this.faction !== Faction.SPACING_GUILD) {
      throw new Error('crossShip() can only be called for Spacing Guild');
    }
    this.parent.queueGuildCrossShip(this.faction, {
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      useElite,
      cost,
    });
    return this;
  }

  /**
   * Guild-specific: Ship off-planet
   */
  shipOffPlanet(
    fromTerritoryId: TerritoryId,
    fromSector: number,
    count: number,
    useElite?: boolean,
    cost?: number
  ): this {
    if (this.faction !== Faction.SPACING_GUILD) {
      throw new Error('shipOffPlanet() can only be called for Spacing Guild');
    }
    this.parent.queueGuildOffPlanet(this.faction, {
      fromTerritoryId,
      fromSector,
      count,
      useElite,
      cost,
    });
    return this;
  }

  /**
   * Fremen-specific: Send forces (free shipment)
   */
  sendForces(territoryId: TerritoryId, sector: number, count: number, eliteCount?: number): this {
    if (this.faction !== Faction.FREMEN) {
      throw new Error('sendForces() can only be called for Fremen');
    }
    this.parent.queueFremenShipment(this.faction, {
      territoryId,
      sector,
      regularCount: count,
      eliteCount,
    });
    return this;
  }

  /**
   * BG-specific: Send spiritual advisor
   */
  sendAdvisor(destination: TerritoryId | 'POLAR_SINK', sector?: number): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('sendAdvisor() can only be called for Bene Gesserit');
    }
    if (destination === 'POLAR_SINK') {
      this.parent.queueBGSpiritualAdvisor(this.faction, {
        territoryId: TerritoryId.POLAR_SINK,
        sector: 9,
        sendToPolarSink: true,
      });
    } else {
      this.parent.queueBGSpiritualAdvisor(this.faction, {
        territoryId: destination,
        sector: sector || 9,
        sendToPolarSink: false,
      });
    }
    return this;
  }

  /**
   * BG-specific: Pass on spiritual advisor
   */
  passAdvisor(): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('passAdvisor() can only be called for Bene Gesserit');
    }
    this.parent.queueBGPassAdvisor(this.faction);
    return this;
  }

  /**
   * BG-specific: Intrusion (flip fighters to advisors)
   */
  intrusion(territoryId: TerritoryId, sector: number, flipCount: number): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('intrusion() can only be called for Bene Gesserit');
    }
    this.parent.queueBGIntrusion(this.faction, {
      territory: territoryId,
      sector,
      flipCount,
    });
    return this;
  }

  /**
   * BG-specific: Pass on intrusion
   */
  passIntrusion(): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('passIntrusion() can only be called for Bene Gesserit');
    }
    this.parent.queueBGPassAbility(this.faction, 'INTRUSION');
    return this;
  }

  /**
   * BG-specific: Wartime (flip advisors to fighters)
   */
  wartime(territories: Array<{ territoryId: TerritoryId; sector: number }>): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('wartime() can only be called for Bene Gesserit');
    }
    this.parent.queueBGWartime(this.faction, territories);
    return this;
  }

  /**
   * BG-specific: Pass on wartime
   */
  passWartime(): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('passWartime() can only be called for Bene Gesserit');
    }
    this.parent.queueBGPassAbility(this.faction, 'WARTIME');
    return this;
  }

  /**
   * BG-specific: Take up arms (flip advisors to fighters)
   */
  takeUpArms(territoryId: TerritoryId, sector: number, flipCount: number): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('takeUpArms() can only be called for Bene Gesserit');
    }
    this.parent.queueBGTakeUpArms(this.faction, {
      territory: territoryId,
      sector,
      flipCount,
    });
    return this;
  }

  /**
   * BG-specific: Pass on take up arms
   */
  passTakeUpArms(): this {
    if (this.faction !== Faction.BENE_GESSERIT) {
      throw new Error('passTakeUpArms() can only be called for Bene Gesserit');
    }
    this.parent.queueBGPassAbility(this.faction, 'TAKE_UP_ARMS');
    return this;
  }

  /**
   * Return to parent builder
   */
  end(): AgentResponseBuilder {
    return this.parent;
  }
}

/**
 * Enhanced Agent Response Builder with fluent API
 */
export class EnhancedAgentResponseBuilder extends AgentResponseBuilder {
  /**
   * Start building responses for a specific faction
   */
  forFaction(faction: Faction): FactionResponseBuilder {
    return new FactionResponseBuilder(this, faction);
  }

  /**
   * Convenience method for Guild
   */
  forGuild(): FactionResponseBuilder {
    return this.forFaction(Faction.SPACING_GUILD);
  }

  /**
   * Convenience method for BG
   */
  forBG(): FactionResponseBuilder {
    return this.forFaction(Faction.BENE_GESSERIT);
  }

  /**
   * Convenience method for Fremen
   */
  forFremen(): FactionResponseBuilder {
    return this.forFaction(Faction.FREMEN);
  }

  /**
   * Queue sequential flow for multiple factions
   */
  queueSequentialFlow(
    factions: Faction[],
    actions: Array<{
      faction: Faction;
      shipment?: {
        territoryId: TerritoryId;
        sector: number;
        count: number;
        eliteCount?: number;
      };
      movement?: {
        fromTerritoryId: TerritoryId;
        fromSector: number;
        toTerritoryId: TerritoryId;
        toSector: number;
        count: number;
        useElite?: boolean;
      };
    }>
  ): this {
    for (const action of actions) {
      if (action.shipment) {
        this.queueShipment(action.faction, {
          territoryId: action.shipment.territoryId,
          sector: action.shipment.sector,
          regularCount: action.shipment.count,
          eliteCount: action.shipment.eliteCount,
        });
      } else {
        this.queuePassShipment(action.faction);
      }

      if (action.movement) {
        this.queueMovement(action.faction, action.movement);
      } else {
        this.queuePassMovement(action.faction);
      }
    }
    return this;
  }
}

