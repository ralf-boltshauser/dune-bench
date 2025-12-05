/**
 * State Machine for Shipment & Movement Phase
 *
 * Centralized state management for the phase handler.
 * Single source of truth for all state transitions.
 */

import { Faction, type GameState } from "@/lib/game/types";
import {
  type FactionPhase,
  type ShipmentMovementState,
  type GuildState,
  type BGSpiritualAdvisorTrigger,
  type BGIntrusionTrigger,
  type BGWartimeTerritory,
  type BGTakeUpArmsTrigger,
} from "./types";
import { getNonGuildStormOrder, checkOrnithopterAccessAtPhaseStart } from "./helpers";

/**
 * State machine for managing shipment & movement phase state
 */
export class ShipmentMovementStateMachine {
  private state: ShipmentMovementState;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Create initial empty state
   */
  private createInitialState(): ShipmentMovementState {
    return {
      currentFactionIndex: 0,
      nonGuildStormOrder: [],
      currentFactionPhase: "SHIP",
      currentFaction: null,
      guildState: {
        inGame: false,
        completed: false,
        wantsToDelayToEnd: false,
        askBeforeNextFaction: false,
      },
      bgSpiritualAdvisor: {
        waiting: false,
        trigger: null,
      },
      bgIntrusion: {
        waiting: false,
        trigger: null,
      },
      bgWartime: {
        waiting: false,
        territories: [],
      },
      bgTakeUpArms: {
        waiting: false,
        trigger: null,
      },
      ornithopterAccessAtPhaseStart: new Set(),
    };
  }

  /**
   * Initialize state from game state
   */
  initialize(state: GameState): void {
    this.state = {
      currentFactionIndex: 0,
      nonGuildStormOrder: getNonGuildStormOrder(state.stormOrder),
      currentFactionPhase: "SHIP",
      currentFaction: null,
      guildState: {
        inGame: state.factions.has(Faction.SPACING_GUILD),
        completed: !state.factions.has(Faction.SPACING_GUILD),
        wantsToDelayToEnd: false,
        askBeforeNextFaction: false,
      },
      bgSpiritualAdvisor: {
        waiting: false,
        trigger: null,
      },
      bgIntrusion: {
        waiting: false,
        trigger: null,
      },
      bgWartime: {
        waiting: false,
        territories: [],
      },
      bgTakeUpArms: {
        waiting: false,
        trigger: null,
      },
      ornithopterAccessAtPhaseStart: checkOrnithopterAccessAtPhaseStart(state),
    };
  }

  // ===========================================================================
  // Faction Tracking
  // ===========================================================================

  getCurrentFaction(): Faction | null {
    return this.state.currentFaction;
  }

  setCurrentFaction(faction: Faction | null): void {
    this.state.currentFaction = faction;
  }

  getCurrentPhase(): FactionPhase {
    return this.state.currentFactionPhase;
  }

  setCurrentPhase(phase: FactionPhase): void {
    this.state.currentFactionPhase = phase;
  }

  getCurrentFactionIndex(): number {
    return this.state.currentFactionIndex;
  }

  advanceFactionIndex(): void {
    this.state.currentFactionIndex++;
  }

  getNonGuildStormOrder(): Faction[] {
    return this.state.nonGuildStormOrder;
  }

  isAllFactionsDone(): boolean {
    return (
      this.state.currentFactionIndex >= this.state.nonGuildStormOrder.length
    );
  }

  // ===========================================================================
  // Guild State
  // ===========================================================================

  getGuildState(): GuildState {
    return { ...this.state.guildState };
  }

  isGuildInGame(): boolean {
    return this.state.guildState.inGame;
  }

  isGuildCompleted(): boolean {
    return this.state.guildState.completed;
  }

  setGuildCompleted(completed: boolean): void {
    this.state.guildState.completed = completed;
  }

  doesGuildWantToDelayToEnd(): boolean {
    return this.state.guildState.wantsToDelayToEnd;
  }

  setGuildWantsToDelayToEnd(wants: boolean): void {
    this.state.guildState.wantsToDelayToEnd = wants;
  }

  shouldAskGuildBeforeNextFaction(): boolean {
    return this.state.guildState.askBeforeNextFaction;
  }

  setAskGuildBeforeNextFaction(ask: boolean): void {
    this.state.guildState.askBeforeNextFaction = ask;
  }

  // ===========================================================================
  // BG Spiritual Advisor
  // ===========================================================================

  isWaitingForBGAdvisor(): boolean {
    return this.state.bgSpiritualAdvisor.waiting;
  }

  setWaitingForBGAdvisor(waiting: boolean, trigger: BGSpiritualAdvisorTrigger | null = null): void {
    this.state.bgSpiritualAdvisor.waiting = waiting;
    this.state.bgSpiritualAdvisor.trigger = trigger;
  }

  getBGSpiritualAdvisorTrigger(): BGSpiritualAdvisorTrigger | null {
    return this.state.bgSpiritualAdvisor.trigger;
  }

  // ===========================================================================
  // BG INTRUSION
  // ===========================================================================

  isWaitingForBGIntrusion(): boolean {
    return this.state.bgIntrusion.waiting;
  }

  setWaitingForBGIntrusion(waiting: boolean, trigger: BGIntrusionTrigger | null = null): void {
    this.state.bgIntrusion.waiting = waiting;
    this.state.bgIntrusion.trigger = trigger;
  }

  getBGIntrusionTrigger(): BGIntrusionTrigger | null {
    return this.state.bgIntrusion.trigger;
  }

  // ===========================================================================
  // BG WARTIME
  // ===========================================================================

  isWaitingForWartime(): boolean {
    return this.state.bgWartime.waiting;
  }

  setWaitingForWartime(waiting: boolean, territories: BGWartimeTerritory[] = []): void {
    this.state.bgWartime.waiting = waiting;
    this.state.bgWartime.territories = territories;
  }

  getWartimeTerritories(): BGWartimeTerritory[] {
    return [...this.state.bgWartime.territories];
  }

  // ===========================================================================
  // BG TAKE UP ARMS
  // ===========================================================================

  isWaitingForTakeUpArms(): boolean {
    return this.state.bgTakeUpArms.waiting;
  }

  setWaitingForTakeUpArms(waiting: boolean, trigger: BGTakeUpArmsTrigger | null = null): void {
    this.state.bgTakeUpArms.waiting = waiting;
    this.state.bgTakeUpArms.trigger = trigger;
  }

  getBGTakeUpArmsTrigger(): BGTakeUpArmsTrigger | null {
    return this.state.bgTakeUpArms.trigger;
  }

  // ===========================================================================
  // Ornithopter Access
  // ===========================================================================

  getOrnithopterAccess(): Set<Faction> {
    return new Set(this.state.ornithopterAccessAtPhaseStart);
  }

  hasOrnithopterAccess(faction: Faction): boolean {
    return this.state.ornithopterAccessAtPhaseStart.has(faction);
  }

  // ===========================================================================
  // Full State Access (for debugging/testing)
  // ===========================================================================

  getState(): Readonly<ShipmentMovementState> {
    return { ...this.state };
  }
}

