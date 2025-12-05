/**
 * Battle Plan Builder for Combat Rules Tests
 * 
 * Fluent builder for creating battle plans with sensible defaults.
 */

import { Faction, type BattlePlan } from '../../../../types/index.js';

export interface BattlePlanConfig {
  factionId: Faction;
  forcesDialed?: number;
  leaderId?: string | null;
  cheapHeroUsed?: boolean;
  weaponCardId?: string | null;
  defenseCardId?: string | null;
  spiceDialed?: number;
  kwisatzHaderachUsed?: boolean;
  announcedNoLeader?: boolean;
}

export class BattlePlanBuilder {
  private plan: BattlePlan;

  static create(factionId: Faction): BattlePlanBuilder {
    return new BattlePlanBuilder(factionId);
  }

  constructor(factionId: Faction) {
    this.plan = {
      factionId,
      forcesDialed: 0,
      leaderId: null,
      cheapHeroUsed: false,
      weaponCardId: null,
      defenseCardId: null,
      spiceDialed: 0,
      kwisatzHaderachUsed: false,
      announcedNoLeader: false,
    };
  }

  withForces(count: number): this {
    this.plan.forcesDialed = count;
    return this;
  }

  withLeader(leaderId: string): this {
    this.plan.leaderId = leaderId;
    this.plan.cheapHeroUsed = false;
    return this;
  }

  withCheapHero(): this {
    this.plan.cheapHeroUsed = true;
    this.plan.leaderId = null;
    return this;
  }

  withNoLeader(): this {
    this.plan.leaderId = null;
    this.plan.cheapHeroUsed = false;
    this.plan.announcedNoLeader = true;
    return this;
  }

  withWeapon(cardId: string): this {
    this.plan.weaponCardId = cardId;
    return this;
  }

  withDefense(cardId: string): this {
    this.plan.defenseCardId = cardId;
    return this;
  }

  withSpice(amount: number): this {
    this.plan.spiceDialed = amount;
    return this;
  }

  withKwisatzHaderach(): this {
    this.plan.kwisatzHaderachUsed = true;
    return this;
  }

  build(): BattlePlan {
    return { ...this.plan };
  }
}

/**
 * Preset battle plan builders
 */
export const BattlePlanPresets = {
  /**
   * Minimal valid plan (leader + forces)
   */
  minimal(factionId: Faction, leaderId: string, forces: number = 1): BattlePlan {
    return BattlePlanBuilder.create(factionId)
      .withLeader(leaderId)
      .withForces(forces)
      .build();
  },

  /**
   * Plan with weapon and defense
   */
  withCards(factionId: Faction, leaderId: string, forces: number, weaponId: string, defenseId: string): BattlePlan {
    return BattlePlanBuilder.create(factionId)
      .withLeader(leaderId)
      .withForces(forces)
      .withWeapon(weaponId)
      .withDefense(defenseId)
      .build();
  },

  /**
   * Plan with spice dialing
   */
  withSpice(factionId: Faction, leaderId: string, forces: number, spice: number): BattlePlan {
    return BattlePlanBuilder.create(factionId)
      .withLeader(leaderId)
      .withForces(forces)
      .withSpice(spice)
      .build();
  },

  /**
   * Plan with Cheap Hero
   */
  withCheapHero(factionId: Faction, forces: number = 1): BattlePlan {
    return BattlePlanBuilder.create(factionId)
      .withCheapHero()
      .withForces(forces)
      .build();
  },

  /**
   * Plan with Kwisatz Haderach
   */
  withKH(factionId: Faction, leaderId: string, forces: number): BattlePlan {
    return BattlePlanBuilder.create(factionId)
      .withLeader(leaderId)
      .withForces(forces)
      .withKwisatzHaderach()
      .build();
  },
};

