/**
 * Test State Builder
 * 
 * Fluent API for building game states for testing mutations.
 * Reuses existing mutations where possible and ensures immutability.
 */

import { createGameState } from '../../factory';
import { addSpice, addSpiceToTerritory } from '../../mutations/spice';
import { formAlliance } from '../../mutations/alliances';
import { moveStorm } from '../../mutations/storm';
import { getFactionState } from '../../queries';
import { addToStack, addToForceCount, subtractFromForceCount, createForceStack } from '../../force-utils';
import {
  Faction,
  Phase,
  TerritoryId,
  LeaderLocation,
  CardLocation,
  type GameState,
  type Leader,
} from '../../../types';
import { getTreacheryCardDefinition, getLeaderDefinition } from '../../../data';

/**
 * Force placement configuration
 */
export interface ForceConfig {
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  regular: number;
  elite?: number;
  advisors?: number; // For Bene Gesserit
}

/**
 * Leader configuration
 */
export interface LeaderConfig {
  location?: LeaderLocation;
  usedThisTurn?: boolean;
  usedInTerritoryId?: TerritoryId | null;
  hasBeenKilled?: boolean;
}

/**
 * Karama interrupt configuration
 */
export interface KaramaInterruptConfig {
  interruptType: 'cancel' | 'prevent';
  targetFaction: Faction;
  abilityName: string;
  abilityContext?: Record<string, unknown>;
}

/**
 * Test State Builder - Fluent API for building game states
 */
export class TestStateBuilder {
  private state: GameState;

  constructor(factions: readonly Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]) {
    this.state = createGameState({
      factions,
      advancedRules: true,
    });
    // Clear starting forces from board for clean slate
    this.clearStartingForces();
  }

  /**
   * Clear all starting forces from board (move to reserves)
   */
  private clearStartingForces(): void {
    for (const faction of Array.from(this.state.factions.keys())) {
      const factionState = getFactionState(this.state, faction);
      // Move all on-board forces to reserves
      for (const stack of factionState.forces.onBoard) {
        const totalRegular = stack.forces.regular || 0;
        const totalElite = stack.forces.elite || 0;
        factionState.forces.reserves.regular += totalRegular;
        factionState.forces.reserves.elite += totalElite;
      }
      // Clear on-board forces
      factionState.forces.onBoard = [];
    }
  }

  /**
   * Set game phase
   */
  withPhase(phase: Phase): this {
    this.state = { ...this.state, phase };
    return this;
  }

  /**
   * Set game turn
   */
  withTurn(turn: number): this {
    this.state = { ...this.state, turn };
    return this;
  }

  /**
   * Set factions in game (recreates state with new factions)
   */
  withFactions(factions: readonly Faction[]): this {
    this.state = createGameState({
      factions,
      advancedRules: this.state.config.advancedRules,
    });
    this.clearStartingForces();
    return this;
  }

  /**
   * Set faction spice amount
   */
  withSpice(faction: Faction, amount: number): this {
    this.state = addSpice(this.state, faction, amount);
    return this;
  }

  /**
   * Add spice to territory/sector
   */
  withTerritorySpice(territoryId: TerritoryId, sector: number, amount: number): this {
    this.state = addSpiceToTerritory(this.state, territoryId, sector, amount);
    return this;
  }

  /**
   * Place forces on board
   */
  withForces(config: ForceConfig): this {
    const { faction, territory, sector, regular, elite = 0, advisors } = config;

    const factionState = getFactionState(this.state, faction);
    const totalNeeded = regular + elite;
    const currentReserves =
      factionState.forces.reserves.regular + factionState.forces.reserves.elite;

    // Ensure faction has enough forces in reserves
    if (currentReserves < totalNeeded) {
      factionState.forces.reserves.regular += Math.max(0, regular - (factionState.forces.reserves.regular || 0));
      factionState.forces.reserves.elite += Math.max(0, elite - (factionState.forces.reserves.elite || 0));
    }

    // Remove from reserves and add to board using force-utils directly
    if (regular > 0) {
      factionState.forces.reserves = subtractFromForceCount(factionState.forces.reserves, regular, false);
      // Determine advisor count for BG
      const advisorCount = (faction === Faction.BENE_GESSERIT && advisors !== undefined) 
        ? advisors 
        : (faction === Faction.BENE_GESSERIT && advisors === undefined ? 0 : undefined);
      factionState.forces.onBoard = addToStack(
        factionState.forces.onBoard,
        faction,
        territory,
        sector,
        regular,
        false,
        advisorCount
      );
    }
    if (elite > 0) {
      factionState.forces.reserves = subtractFromForceCount(factionState.forces.reserves, elite, true);
      factionState.forces.onBoard = addToStack(
        factionState.forces.onBoard,
        faction,
        territory,
        sector,
        elite,
        true
      );
    }

    return this;
  }

  /**
   * Set forces in reserves
   */
  withForcesInReserves(faction: Faction, regular: number, elite: number = 0): this {
    const factionState = getFactionState(this.state, faction);
    factionState.forces.reserves.regular = regular;
    factionState.forces.reserves.elite = elite;
    return this;
  }

  /**
   * Set forces in tanks
   */
  withForcesInTanks(faction: Faction, regular: number, elite: number = 0): this {
    const factionState = getFactionState(this.state, faction);
    factionState.forces.tanks.regular = regular;
    factionState.forces.tanks.elite = elite;
    return this;
  }

  /**
   * Set leader state
   */
  withLeader(faction: Faction, leaderId: string, config?: LeaderConfig): this {
    const factionState = getFactionState(this.state, faction);
    const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

    if (!leader) {
      throw new Error(`Leader ${leaderId} not found for ${faction}`);
    }

    if (config) {
      if (config.location !== undefined) {
        leader.location = config.location;
      }
      if (config.usedThisTurn !== undefined) {
        leader.usedThisTurn = config.usedThisTurn;
      }
      if (config.usedInTerritoryId !== undefined) {
        leader.usedInTerritoryId = config.usedInTerritoryId;
      }
      if (config.hasBeenKilled !== undefined) {
        leader.hasBeenKilled = config.hasBeenKilled;
      }
    }

    return this;
  }

  /**
   * Convenience: Set leader in pool
   */
  withLeaderInPool(faction: Faction, leaderId: string): this {
    return this.withLeader(faction, leaderId, { location: LeaderLocation.LEADER_POOL });
  }

  /**
   * Convenience: Set leader in tanks
   */
  withLeaderInTanks(faction: Faction, leaderId: string, faceUp: boolean = true): this {
    return this.withLeader(faction, leaderId, {
      location: faceUp ? LeaderLocation.TANKS_FACE_UP : LeaderLocation.TANKS_FACE_DOWN,
    });
  }

  /**
   * Convenience: Set leader on board
   */
  withLeaderOnBoard(faction: Faction, leaderId: string, territoryId: TerritoryId): this {
    return this.withLeader(faction, leaderId, {
      location: LeaderLocation.ON_BOARD,
      usedInTerritoryId: territoryId,
      usedThisTurn: true,
    });
  }

  /**
   * Add cards to faction's hand
   */
  withHand(faction: Faction, cardIds: string[]): this {
    const factionState = getFactionState(this.state, faction);

    for (const cardId of cardIds) {
      const cardDef = getTreacheryCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Card not found: ${cardId}`);
      }

      // Check if already in hand
      if (!factionState.hand.some((c) => c.definitionId === cardId)) {
        factionState.hand.push({
          definitionId: cardDef.id,
          type: cardDef.type,
          location: CardLocation.HAND,
          ownerId: faction,
        });

        // Remove from deck if present
        const deckIndex = this.state.treacheryDeck.findIndex(
          (c) => c.definitionId === cardId
        );
        if (deckIndex >= 0) {
          this.state.treacheryDeck.splice(deckIndex, 1);
        }
      }
    }

    return this;
  }

  /**
   * Set treachery deck cards
   */
  withTreacheryDeck(cardIds: string[]): this {
    this.state.treacheryDeck = cardIds.map((cardId) => {
      const cardDef = getTreacheryCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: CardLocation.DECK,
        ownerId: null,
      };
    });
    return this;
  }

  /**
   * Set treachery discard pile
   */
  withTreacheryDiscard(cardIds: string[]): this {
    this.state.treacheryDiscard = cardIds.map((cardId) => {
      const cardDef = getTreacheryCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: CardLocation.DISCARD,
        ownerId: null,
      };
    });
    return this;
  }

  /**
   * Form alliance between two factions
   */
  withAlliance(faction1: Faction, faction2: Faction): this {
    this.state = formAlliance(this.state, faction1, faction2);
    return this;
  }

  /**
   * Set storm sector
   */
  withStormSector(sector: number): this {
    this.state = moveStorm(this.state, sector);
    return this;
  }

  /**
   * Set Kwisatz Haderach state
   */
  withKwisatzHaderach(active: boolean, forcesLost: number = 7): this {
    const atreidesState = getFactionState(this.state, Faction.ATREIDES);
    if (atreidesState.kwisatzHaderach) {
      atreidesState.kwisatzHaderach.isActive = active;
      atreidesState.kwisatzHaderach.forcesLostCount = forcesLost;
    }
    return this;
  }

  /**
   * Set Karama interrupt state
   */
  withKaramaInterrupt(config: KaramaInterruptConfig): this {
    const eligibleFactions = Array.from(this.state.factions.keys()).filter(
      (f) => f !== config.targetFaction
    );

    this.state = {
      ...this.state,
      karamaState: {
        interruptType: config.interruptType,
        targetFaction: config.targetFaction,
        abilityName: config.abilityName,
        abilityContext: config.abilityContext || {},
        eligibleFactions,
        responses: new Map(),
        interrupted: false,
        interruptor: null,
        turn: this.state.turn,
        phase: this.state.phase,
      },
    };
    return this;
  }

  /**
   * Set hand size by filling with cards (for testing hand size limits).
   */
  withHandSize(faction: Faction, count: number): this {
    const factionState = getFactionState(this.state, faction);
    const currentSize = factionState.hand.length;
    
    if (count > currentSize) {
      // Add cards to reach desired size
      const cardsNeeded = count - currentSize;
      const availableCards = this.state.treacheryDeck.slice(0, cardsNeeded);
      
      for (const card of availableCards) {
        const updatedCard = { ...card, location: CardLocation.HAND, ownerId: faction };
        factionState.hand.push(updatedCard);
      }
      
      // Remove from deck
      this.state.treacheryDeck = this.state.treacheryDeck.slice(cardsNeeded);
    } else if (count < currentSize) {
      // Remove cards to reach desired size
      factionState.hand = factionState.hand.slice(0, count);
    }
    
    return this;
  }

  /**
   * Add traitor card to faction.
   */
  withTraitorCard(faction: Faction, leaderId: string): this {
    const factionState = getFactionState(this.state, faction);
    if (!factionState.traitors.some((t) => t.leaderId === leaderId)) {
      factionState.traitors.push({ leaderId });
    }
    return this;
  }

  /**
   * Set elite forces revived this turn (for Fremen/Emperor).
   */
  withEliteRevivedThisTurn(faction: Faction, count: number): this {
    const factionState = getFactionState(this.state, faction);
    factionState.eliteForcesRevivedThisTurn = count;
    return this;
  }

  /**
   * Set Kwisatz Haderach as dead.
   */
  withKHDead(isDead: boolean): this {
    const atreidesState = getFactionState(this.state, Faction.ATREIDES);
    if (atreidesState.kwisatzHaderach) {
      atreidesState.kwisatzHaderach.isDead = isDead;
    }
    return this;
  }

  /**
   * Set Kwisatz Haderach used in territory.
   */
  withKHUsedInTerritory(territoryId: TerritoryId | null): this {
    const atreidesState = getFactionState(this.state, Faction.ATREIDES);
    if (atreidesState.kwisatzHaderach) {
      atreidesState.kwisatzHaderach.usedInTerritoryThisTurn = territoryId;
    }
    return this;
  }

  /**
   * Convenience: Set advisors on board (Bene Gesserit).
   */
  withAdvisorsOnBoard(
    faction: Faction,
    territoryId: TerritoryId,
    sector: number,
    count: number
  ): this {
    return this.withForces({
      faction,
      territory: territoryId,
      sector,
      regular: 0,
      advisors: count,
    });
  }

  /**
   * Convenience: Set fighters on board (Bene Gesserit).
   */
  withFightersOnBoard(
    faction: Faction,
    territoryId: TerritoryId,
    sector: number,
    regular: number,
    elite: number = 0
  ): this {
    return this.withForces({
      faction,
      territory: territoryId,
      sector,
      regular,
      elite,
      advisors: 0,
    });
  }

  /**
   * Set leader as used in battle.
   */
  withLeaderUsed(faction: Faction, leaderId: string, territoryId: TerritoryId): this {
    return this.withLeader(faction, leaderId, {
      location: LeaderLocation.ON_BOARD,
      usedThisTurn: true,
      usedInTerritoryId: territoryId,
    });
  }

  /**
   * Set leader as killed (track kill count).
   */
  withLeaderKilled(faction: Faction, leaderId: string, times: number = 1): this {
    const factionState = getFactionState(this.state, faction);
    const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
    
    if (leader) {
      leader.hasBeenKilled = times > 0;
      leader.location = times === 1 
        ? LeaderLocation.TANKS_FACE_UP 
        : LeaderLocation.TANKS_FACE_DOWN;
    }
    
    return this;
  }

  /**
   * Set captured leader (Harkonnen).
   */
  withCapturedLeader(
    captor: Faction,
    victim: Faction,
    leaderId: string
  ): this {
    const victimState = getFactionState(this.state, victim);
    const leader = victimState.leaders.find((l) => l.definitionId === leaderId);
    
    if (!leader) {
      throw new Error(`Leader ${leaderId} not found for ${victim}`);
    }

    // Remove from victim
    victimState.leaders = victimState.leaders.filter((l) => l.definitionId !== leaderId);

    // Add to captor with capture metadata
    const captorState = getFactionState(this.state, captor);
    captorState.leaders.push({
      ...leader,
      faction: captor,
      capturedBy: captor,
      originalFaction: victim,
      location: LeaderLocation.LEADER_POOL,
    });

    return this;
  }

  /**
   * Set stronghold as occupied by factions (for occupancy limit tests).
   */
  withStrongholdOccupied(territoryId: TerritoryId, factions: Faction[]): this {
    if (factions.length > 2) {
      throw new Error('Stronghold can only be occupied by max 2 factions');
    }

    // Place forces for each faction
    factions.forEach((faction, index) => {
      this.withForces({
        faction,
        territory: territoryId,
        sector: index + 1, // Different sectors
        regular: 1,
      });
    });

    return this;
  }

  /**
   * Convenience: Set stronghold as full (2 factions).
   */
  withStrongholdFull(territoryId: TerritoryId, faction1: Faction, faction2: Faction): this {
    return this.withStrongholdOccupied(territoryId, [faction1, faction2]);
  }

  /**
   * Set sector as in storm (for storm restriction tests).
   */
  withSectorInStorm(sector: number): this {
    this.state.stormSector = sector;
    return this;
  }

  /**
   * Set territory/sector as in storm.
   */
  withTerritoryInStorm(territoryId: TerritoryId, sector: number): this {
    // For simplicity, just set storm sector
    // In real game, need to check if territory contains that sector
    this.state.stormSector = sector;
    return this;
  }

  /**
   * Add pending deal.
   */
  withPendingDeal(deal: import('../../../types').Deal): this {
    this.state.pendingDeals = [...this.state.pendingDeals, deal];
    return this;
  }

  /**
   * Add deal to history.
   */
  withDealHistory(deal: import('../../../types').Deal): this {
    this.state.dealHistory = [...this.state.dealHistory, deal];
    return this;
  }

  /**
   * Set win attempts for faction.
   */
  withWinAttempts(faction: Faction, count: number): this {
    const newAttempts = new Map(this.state.winAttempts);
    newAttempts.set(faction, count);
    this.state.winAttempts = newAttempts;
    return this;
  }

  /**
   * Build and return final state
   */
  build(): GameState {
    return this.state;
  }
}

/**
 * Factory function to create a test state builder
 */
export function buildTestState(factions: readonly Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): TestStateBuilder {
  return new TestStateBuilder(factions);
}

/**
 * Create minimal valid game state
 */
export function minimalState(...factions: Faction[]): GameState {
  return buildTestState(factions.length > 0 ? factions : undefined).build();
}

/**
 * Preset: Two factions with basic setup
 */
export function presetTwoFactions(): TestStateBuilder {
  return buildTestState([Faction.ATREIDES, Faction.HARKONNEN])
    .withPhase(Phase.SHIPMENT_MOVEMENT)
    .withTurn(1);
}

/**
 * Preset: All factions
 */
export function presetAllFactions(): TestStateBuilder {
  return buildTestState([
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.SPACING_GUILD,
  ]);
}

/**
 * Preset: Two factions with alliance
 */
export function presetWithAlliance(): TestStateBuilder {
  return presetTwoFactions().withAlliance(Faction.ATREIDES, Faction.HARKONNEN);
}

