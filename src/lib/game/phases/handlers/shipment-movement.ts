/**
 * Shipment & Movement Phase Handler
 *
 * Phase 1.06: Shipment & Movement
 *
 * CRITICAL ARCHITECTURE (Rule 1.06.12.01):
 * - Each faction does BOTH ship AND move before next faction acts
 * - NOT separate sub-phases! Process sequentially by faction
 * - Spacing Guild can act out of storm order (SHIP AS IT PLEASES YOU)
 * - Alliance constraint applied AFTER EACH faction completes
 *
 * GUILD HANDLING (Rule 2.06.12):
 * - Guild is NOT in normal storm order iteration
 * - Ask Guild ONCE at phase start: "When do you want to act?"
 * - Options: NOW (act immediately) / LATER (ask before each faction) / DELAY_TO_END (go last)
 * - Once Guild acts (ship+move), they are DONE
 * - Never iterate Guild in storm order loop
 *
 * Rule references:
 * - 1.06.12.01: "First Player conducts Force Shipment action and then Force Movement action"
 * - 2.06.12.01: "SHIP AND MOVE AHEAD OF SCHEDULE" (Guild acts before turn)
 * - 2.06.12.02: "HOLDING PATTERN" (Guild delays to go last)
 * - 1.06.03.08: "CONSTRAINT: At the end of your Shipment and Movement actions..."
 */

import {
  Faction,
  Phase,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
  FACTION_NAMES,
} from '../../types';
import {
  shipForces,
  moveForces,
  removeSpice,
  addSpice,
  getFactionState,
  logAction,
  getForceCountInTerritory,
  getFactionsInTerritory,
  sendForcesToTanks,
  sendForcesToReserves,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import { checkOrnithopterAccess, getMovementRange, validateShipment, validateMovement } from '../../rules';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// SHIPMENT & MOVEMENT PHASE HANDLER - SIMPLIFIED ARCHITECTURE
// =============================================================================

/**
 * Current faction's phase within their turn
 */
type FactionPhase = 'SHIP' | 'MOVE' | 'DONE';

export class ShipmentMovementPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SHIPMENT_MOVEMENT;

  // ===== STATE MACHINE - SIMPLIFIED =====

  // Track position in NON-GUILD storm order (Guild handled separately)
  private currentFactionIndex = 0;
  private nonGuildStormOrder: Faction[] = [];
  private currentFactionPhase: FactionPhase = 'SHIP';
  private currentFaction: Faction | null = null; // Track who is currently acting

  // Guild-specific state
  private guildInGame = false;
  private guildCompleted = false;
  private guildWantsToDelayToEnd = false;
  private askGuildBeforeNextFaction = false; // True if Guild said "LATER"

  // BG Spiritual Advisor tracking (Rule 2.02.05)
  private waitingForBGAdvisor = false;
  private bgTriggeringShipment: { territory: TerritoryId; sector: number } | null = null;

  // Ornithopter access tracking (determined at phase START, not dynamically)
  // Rule: Ornithopter access (3-territory movement) requires forces in Arrakeen/Carthag at phase START
  private ornithopterAccessAtPhaseStart: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset all state
    this.currentFactionIndex = 0;
    this.currentFactionPhase = 'SHIP';
    this.currentFaction = null;
    this.waitingForBGAdvisor = false;
    this.bgTriggeringShipment = null;

    // Build storm order WITHOUT Guild (Guild handled separately)
    this.nonGuildStormOrder = state.stormOrder.filter(f => f !== Faction.SPACING_GUILD);

    // Guild state
    this.guildInGame = state.factions.has(Faction.SPACING_GUILD);
    this.guildCompleted = !this.guildInGame; // If not in game, mark as "completed" (skip)
    this.guildWantsToDelayToEnd = false;
    this.askGuildBeforeNextFaction = false;

    // CRITICAL: Record ornithopter access at phase START (not dynamically during phase)
    // Rule: Ornithopter access requires forces in Arrakeen/Carthag at the BEGINNING of this phase
    // Even if you ship into Arrakeen/Carthag during this phase, you don't get ornithopters until NEXT phase
    this.ornithopterAccessAtPhaseStart = new Set();
    for (const faction of state.factions.keys()) {
      if (checkOrnithopterAccess(state, faction)) {
        this.ornithopterAccessAtPhaseStart.add(faction);
        console.log(`   🚁 ${FACTION_NAMES[faction]} has ornithopter access (forces in Arrakeen/Carthag at phase start)`);
      }
    }

    const events: PhaseEvent[] = [];

    console.log('\n' + '='.repeat(80));
    console.log('🚢 SHIPMENT & MOVEMENT PHASE (Turn ' + state.turn + ')');
    console.log('='.repeat(80));
    console.log(`\n📍 Storm Sector: ${state.stormSector}`);
    console.log(`📋 Storm Order: ${state.stormOrder.map(f => FACTION_NAMES[f]).join(' → ')}`);
    console.log(`\n  Rule 1.06.12.01: Each faction does SHIPMENT then MOVEMENT sequentially.`);
    console.log(`  Play proceeds in Storm Order until all players complete.\n`);

    if (this.guildInGame) {
      console.log(`  ⚠️  Spacing Guild: Can act out of order (SHIP AS IT PLEASES YOU)`);
      console.log(`     - NOW: Act immediately before all others`);
      console.log(`     - LATER: Ask before each faction until Guild acts`);
      console.log(`     - DELAY_TO_END: Go after all other factions\n`);
      console.log('='.repeat(80) + '\n');

      // Ask Guild ONCE: "When do you want to act?"
      return this.askGuildInitialTiming(state, events);
    }

    console.log('='.repeat(80) + '\n');

    // No Guild in game - start with first faction
    return this.startNextFaction(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // 1. Handle BG Spiritual Advisor (side quest)
    if (this.waitingForBGAdvisor) {
      const result = this.processBGSpiritualAdvisorDecision(newState, responses, events);
      newState = result.state;
      events.push(...result.events);

      // After BG responds, continue to current faction's movement
      // Set phase to MOVE so the next response is processed correctly
      this.currentFactionPhase = 'MOVE';
      return this.requestMovementDecision(newState, events);
    }

    // 2. Handle Guild asking before next faction (if Guild said "LATER")
    // IMPORTANT: Check this BEFORE initial timing decision to avoid condition overlap
    if (this.askGuildBeforeNextFaction && !this.guildCompleted) {
      const guildResponse = responses.find(r => r.factionId === Faction.SPACING_GUILD);
      if (guildResponse) {
        return this.processGuildBeforeFactionDecision(newState, guildResponse, events);
      }
    }

    // 3. Handle Guild initial timing decision
    if (this.guildInGame && !this.guildCompleted && responses.some(r =>
      r.factionId === Faction.SPACING_GUILD &&
      (r.actionType === 'GUILD_TIMING_DECISION' || r.actionType?.startsWith('GUILD_'))
    )) {
      return this.processGuildTimingDecision(newState, responses, events);
    }

    // 4. Get current faction from non-Guild storm order (or Guild if they're acting)
    const currentFaction = this.getCurrentFaction(state);
    if (!currentFaction) {
      // All factions done - check if Guild needs to go last
      return this.finalizePhase(newState, events);
    }

    const currentResponse = responses.find(r => r.factionId === currentFaction);
    if (!currentResponse) {
      console.error(`⚠️  No response from ${FACTION_NAMES[currentFaction]}`);
      return this.advanceToNextFaction(newState, events);
    }

    // 5. Process current faction's action based on phase
    // Valid shipment action types (different factions use different tools)
    const SHIPMENT_ACTION_TYPES = [
      'SHIP_FORCES',           // Normal shipment
      'FREMEN_SEND_FORCES',    // Fremen native reserves (Rule 2.04.05)
      'GUILD_CROSS_SHIP',      // Guild cross-ship (Rule 2.06.05.01)
      'GUILD_SHIP_OFF_PLANET', // Guild off-planet (Rule 2.06.05.02)
    ];
    const isShipmentAction = !currentResponse.passed &&
      SHIPMENT_ACTION_TYPES.includes(currentResponse.actionType || '');

    if (this.currentFactionPhase === 'SHIP') {
      // Process shipment - check for valid shipment action types
      if (isShipmentAction) {
        const result = this.processShipment(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);

        // Check if we need to ask BG about spiritual advisor
        if (this.shouldAskBGSpiritualAdvisor(newState, currentFaction)) {
          this.waitingForBGAdvisor = true;
          this.bgTriggeringShipment = {
            territory: currentResponse.data.territoryId as TerritoryId,
            sector: currentResponse.data.sector as number
          };
          return this.requestBGSpiritualAdvisor(newState, events);
        }
      } else if (!currentResponse.passed && currentResponse.actionType === 'MOVE_FORCES') {
        // BUG FIX: Agent responded with MOVE during SHIP phase - this means they want to skip shipment
        console.log(`   ⏭️  ${FACTION_NAMES[currentFaction]} passed on shipment (MOVE_FORCES during SHIP phase)\n`);
        // Process the move now instead of requesting it again
        const result = this.processMovement(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);

        // Faction completed - apply alliance constraint
        console.log(`\n   ✅ ${FACTION_NAMES[currentFaction]} completed ship + move`);
        const allianceResult = this.applyAllianceConstraintForFaction(newState, currentFaction, events);
        newState = allianceResult.state;
        events.push(...allianceResult.events);

        // Move to next faction
        this.currentFactionPhase = 'DONE';
        return this.advanceToNextFaction(newState, events);
      } else {
        console.log(`   ⏭️  ${FACTION_NAMES[currentFaction]} passes on shipment\n`);
      }

      // Move to movement phase only if we haven't already processed movement
      if (this.currentFactionPhase === 'SHIP') {
        this.currentFactionPhase = 'MOVE';
        return this.requestMovementDecision(newState, events);
      }
    }
    else if (this.currentFactionPhase === 'MOVE') {
      // Process movement
      if (!currentResponse.passed && currentResponse.actionType === 'MOVE_FORCES') {
        const result = this.processMovement(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);
      } else {
        console.log(`   ⏭️  ${FACTION_NAMES[currentFaction]} passes on movement\n`);
      }

      // Faction completed - apply alliance constraint
      console.log(`\n   ✅ ${FACTION_NAMES[currentFaction]} completed ship + move`);
      const allianceResult = this.applyAllianceConstraintForFaction(newState, currentFaction, events);
      newState = allianceResult.state;
      events.push(...allianceResult.events);

      // Move to next faction
      this.currentFactionPhase = 'DONE';
      return this.advanceToNextFaction(newState, events);
    }

    // Shouldn't reach here
    return this.advanceToNextFaction(newState, events);
  }

  cleanup(state: GameState): GameState {
    // All alliance constraints applied during processStep
    return state;
  }

  // ===========================================================================
  // GUILD TIMING - SIMPLIFIED FLOW
  // ===========================================================================

  /**
   * Ask Guild ONCE at phase start: "When do you want to act?"
   */
  private askGuildInitialTiming(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    console.log(`\n⏰ GUILD TIMING: When do you want to act?`);
    console.log(`   Options: NOW (act immediately) / LATER (ask before each faction) / DELAY_TO_END (go last)\n`);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.SPACING_GUILD,
        requestType: 'GUILD_TIMING_DECISION',
        prompt: `When do you want to act this turn? NOW (act immediately before all others), LATER (you'll be asked before each faction), or DELAY_TO_END (go after all other factions)?`,
        context: {
          isInitialTiming: true,
          canActNow: true,
          canDelay: true,
        },
        availableActions: ['guild_act_now', 'guild_wait_later', 'guild_delay_to_end'],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process Guild's initial timing decision
   */
  private processGuildTimingDecision(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const guildResponse = responses.find(r => r.factionId === Faction.SPACING_GUILD);
    if (!guildResponse) {
      // Default to LATER if no response
      console.log(`\n   ⏸️  Guild: No response, defaulting to LATER\n`);
      this.askGuildBeforeNextFaction = true;
      return this.startNextFaction(state, events);
    }

    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    // Check if Guild wants to act NOW
    if (decision === 'act_now' || actionType === 'GUILD_ACT_NOW') {
      console.log(`\n   ✅ Guild chooses: ACT NOW (ship + move immediately)\n`);
      // Guild will ship and move, then mark as completed
      return this.startGuildShipment(state, events);
    }
    // Check if Guild wants to delay to end
    else if (decision === 'delay_to_end' || actionType === 'GUILD_DELAY_TO_END') {
      console.log(`\n   ⏸️  Guild chooses: DELAY TO END (will go after all other factions)\n`);
      this.guildWantsToDelayToEnd = true;
      this.guildCompleted = true; // Mark as "done" for now, will reset later
      return this.startNextFaction(state, events);
    }
    // Guild wants to be asked LATER
    else {
      console.log(`\n   ⏸️  Guild chooses: LATER (will be asked before each faction)\n`);
      this.askGuildBeforeNextFaction = true;
      return this.startNextFaction(state, events);
    }
  }

  /**
   * Ask Guild before each faction: "Do you want to act now?"
   */
  private askGuildBeforeFaction(
    state: GameState,
    events: PhaseEvent[],
    nextFaction: Faction
  ): PhaseStepResult {
    console.log(`\n⏰ GUILD TIMING: Do you want to act before ${FACTION_NAMES[nextFaction]}?`);
    console.log(`   You can act NOW or continue WAITING\n`);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.SPACING_GUILD,
        requestType: 'GUILD_TIMING_DECISION',
        prompt: `Do you want to act NOW, before ${FACTION_NAMES[nextFaction]}? Or continue WAITING?`,
        context: {
          isBeforeFaction: true,
          nextFaction: FACTION_NAMES[nextFaction],
          canActNow: true,
        },
        availableActions: ['guild_act_now', 'guild_wait'],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process Guild's decision when asked before a faction
   */
  private processGuildBeforeFactionDecision(
    state: GameState,
    guildResponse: AgentResponse,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    if (decision === 'act_now' || actionType === 'GUILD_ACT_NOW') {
      console.log(`\n   ✅ Guild chooses: ACT NOW\n`);
      this.askGuildBeforeNextFaction = false; // Don't ask again
      return this.startGuildShipment(state, events);
    } else {
      console.log(`\n   ⏸️  Guild chooses: WAIT (continue to current faction)\n`);
      // BUG FIX: Temporarily disable Guild check for THIS faction
      // We'll ask Guild again before the NEXT faction
      this.askGuildBeforeNextFaction = false;

      // Get the current faction we're about to start
      const faction = this.nonGuildStormOrder[this.currentFactionIndex];
      this.currentFaction = faction;
      this.currentFactionPhase = 'SHIP';

      return this.requestShipmentDecisionForFaction(state, events, faction);
    }
  }

  /**
   * Start Guild's shipment phase
   */
  private startGuildShipment(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    this.currentFaction = Faction.SPACING_GUILD;
    this.currentFactionPhase = 'SHIP';
    this.askGuildBeforeNextFaction = false; // Don't ask Guild again
    return this.requestShipmentDecisionForFaction(state, events, Faction.SPACING_GUILD);
  }

  // ===========================================================================
  // FACTION SEQUENCING
  // ===========================================================================

  /**
   * Get current faction (tracked explicitly)
   */
  private getCurrentFaction(state: GameState): Faction | null {
    return this.currentFaction;
  }

  /**
   * Start the next faction's turn (ship + move)
   */
  private startNextFaction(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    // Get next faction from non-Guild storm order
    if (this.currentFactionIndex >= this.nonGuildStormOrder.length) {
      // All non-Guild factions done
      return this.finalizePhase(state, events);
    }

    const faction = this.nonGuildStormOrder[this.currentFactionIndex];

    // Check if Guild wants to act before this faction
    if (this.askGuildBeforeNextFaction && !this.guildCompleted) {
      return this.askGuildBeforeFaction(state, events, faction);
    }

    // Start this faction's shipment
    this.currentFaction = faction;
    this.currentFactionPhase = 'SHIP';
    return this.requestShipmentDecisionForFaction(state, events, faction);
  }

  /**
   * Advance to next faction in storm order
   */
  private advanceToNextFaction(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    // If we just completed Guild's turn, mark them as done
    if (this.currentFaction === Faction.SPACING_GUILD && !this.guildCompleted) {
      this.guildCompleted = true;
      console.log(`\n   ✅ Guild completed\n`);
    }

    // Move to next faction in non-Guild storm order (only if not Guild)
    if (this.currentFaction !== Faction.SPACING_GUILD) {
      this.currentFactionIndex++;

      // BUG FIX: Re-enable Guild check for the NEXT faction
      // (if Guild previously chose "LATER" and hasn't acted yet)
      if (this.guildInGame && !this.guildCompleted && !this.guildWantsToDelayToEnd) {
        this.askGuildBeforeNextFaction = true;
      }
    }

    this.currentFaction = null;
    return this.startNextFaction(state, events);
  }

  /**
   * Finalize phase - check if Guild needs to go last
   */
  private finalizePhase(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    // Check if Guild delayed to end and hasn't acted yet
    if (this.guildWantsToDelayToEnd && this.guildCompleted) {
      console.log(`\n🕰️  HOLDING PATTERN: Guild goes last\n`);
      this.guildCompleted = false; // Reset to allow Guild to act
      this.guildWantsToDelayToEnd = false;
      return this.startGuildShipment(state, events);
    }

    // Phase complete!
    console.log(`\n✅ All factions have completed Shipment & Movement\n`);
    console.log('='.repeat(80) + '\n');

    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.BATTLE,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  // ===========================================================================
  // REQUEST METHODS
  // ===========================================================================

  private requestShipmentDecisionForFaction(
    state: GameState,
    events: PhaseEvent[],
    faction: Faction
  ): PhaseStepResult {
    const factionState = getFactionState(state, faction);
    const reserves = factionState.forces.reserves;
    const totalReserves = reserves.regular + reserves.elite;

    const isGuild = faction === Faction.SPACING_GUILD;
    const isFremen = faction === Faction.FREMEN;
    const hasGuild = state.factions.has(Faction.SPACING_GUILD);
    const baseShippingCost = GAME_CONSTANTS.SHIPMENT_COST;

    // Calculate costs
    let costToStronghold: number = baseShippingCost;
    let costElsewhere: number = baseShippingCost * 2;
    if (isGuild) {
      // Guild pays half price (Rule 2.06.07: HALF PRICE SHIPPING)
      costToStronghold = Math.ceil(costToStronghold / 2);
      costElsewhere = Math.ceil(costElsewhere / 2);
    }

    console.log(`\n🚢 SHIPMENT: ${FACTION_NAMES[faction]}`);
    console.log(`   Reserves: ${totalReserves} forces (${reserves.regular} regular, ${reserves.elite} elite)`);
    console.log(`   Spice: ${factionState.spice}`);

    // Fremen have special shipment display
    if (isFremen) {
      console.log(`   Cost: FREE (Fremen native reserves - Rule 2.04.05)`);
      console.log(`   Valid Destinations: Great Flat or within 2 territories of Great Flat`);
      console.log(`   Use 'fremen_send_forces' tool for shipment`);
    } else {
      console.log(`   Cost: ${costToStronghold}/force (strongholds), ${costElsewhere}/force (elsewhere)`);
    }

    const validDestinations = this.getValidShippingDestinations(state, faction);

    // Build prompt based on faction
    let prompt: string;
    let availableActions: string[];

    if (isFremen) {
      prompt = `Shipment: You have ${totalReserves} forces in reserves. As Fremen, you ship for FREE to Great Flat or territories within 2 of Great Flat. Use 'fremen_send_forces' tool (NOT 'ship_forces').`;
      availableActions = ['fremen_send_forces', 'pass_shipment'];
    } else {
      prompt = `Shipment: You have ${totalReserves} forces in reserves. Cost: ${costToStronghold} spice per force to strongholds, ${costElsewhere} elsewhere. Do you want to ship forces?`;
      availableActions = ['ship_forces', 'pass_shipment'];

      // Guild has additional options
      if (isGuild) {
        availableActions.push('guild_cross_ship', 'guild_ship_off_planet');
      }
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: 'SHIP_FORCES',
        prompt,
        context: {
          reservesRegular: reserves.regular,
          reservesElite: reserves.elite,
          totalReserves,
          spiceAvailable: factionState.spice,
          shippingCostToStronghold: isFremen ? 0 : costToStronghold,
          shippingCostElsewhere: isFremen ? 0 : costElsewhere,
          isGuild,
          isFremen,
          guildInGame: hasGuild,
          validDestinations,
          phase: 'shipment',
          willMoveAfter: true,
        },
        availableActions,
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  private requestMovementDecision(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get current faction
    const faction = this.getCurrentFaction(state);
    if (!faction) {
      return this.finalizePhase(state, events);
    }

    const factionState = getFactionState(state, faction);

    // CRITICAL: Use ornithopter access from phase START, not current state
    // This prevents factions from gaining ornithopter access by shipping into Arrakeen/Carthag first
    const hasOrnithopters = this.ornithopterAccessAtPhaseStart.has(faction);
    const movementRange = this.getMovementRangeForFaction(faction, hasOrnithopters);

    console.log(`\n🚶 MOVEMENT: ${FACTION_NAMES[faction]}`);
    console.log(`   Movement Range: ${movementRange} territory${movementRange !== 1 ? 'ies' : ''}${hasOrnithopters ? ' (Ornithopters)' : ''}`);

    const movableForces = factionState.forces.onBoard.map((stack) => ({
      territoryId: stack.territoryId,
      sector: stack.sector,
      regular: stack.forces.regular,
      elite: stack.forces.elite,
      total: stack.forces.regular + stack.forces.elite,
    }));

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: 'MOVE_FORCES',
        prompt: `Movement: You have ${movableForces.length} force stacks. Movement range: ${movementRange} territories${hasOrnithopters ? ' (ornithopters)' : ''}.`,
        context: {
          movableForces,
          movementRange,
          hasOrnithopters,
          hasOrnithoptersFromPhaseStart: hasOrnithopters, // Pass phase-start ornithopter access
          stormSector: state.stormSector,
          phase: 'movement',
        },
        availableActions: ['MOVE_FORCES', 'PASS'],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Calculate movement range for a faction based on ornithopter access (from phase start).
   * Fremen get 2 territories base, all others get 1. Ornithopters add +2 (making it 3).
   */
  private getMovementRangeForFaction(faction: Faction, hasOrnithopters: boolean): number {
    // Ornithopters grant 3 territories to ANY faction (including Fremen)
    if (hasOrnithopters) return 3;

    // Fremen base movement is 2 territories (without ornithopters)
    if (faction === Faction.FREMEN) return 2;

    // All other factions: 1 territory without ornithopters
    return 1;
  }

  // ===========================================================================
  // PROCESSING METHODS
  // ===========================================================================

  private processShipment(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId;
    const actionType = response.actionType;

    let newState = state;

    // Handle different shipment types
    if (actionType === 'GUILD_CROSS_SHIP') {
      // Guild cross-ship: Move forces between territories (Rule 2.06.05.01)
      const fromTerritoryId = response.data.fromTerritoryId as TerritoryId | undefined;
      const fromSector = response.data.fromSector as number | undefined;
      const toTerritoryId = response.data.toTerritoryId as TerritoryId | undefined;
      const toSector = response.data.toSector as number | undefined;
      const count = response.data.count as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;
      const cost = response.data.cost as number | undefined;

      if (fromTerritoryId && toTerritoryId && count !== undefined && fromSector !== undefined && toSector !== undefined) {
        newState = moveForces(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          toTerritoryId,
          toSector,
          count,
          useElite ?? false
        );

        // Handle spice cost
        if (cost !== undefined && cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }

        console.log(`   ✅ Cross-shipped ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${cost ?? 0} spice\n`);

        newEvents.push({
          type: 'FORCES_SHIPPED',
          data: { faction, from: fromTerritoryId, to: toTerritoryId, count, cost },
          message: `${FACTION_NAMES[faction]} cross-ships ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${cost ?? 0} spice`,
        });
      }
    } else if (actionType === 'GUILD_SHIP_OFF_PLANET') {
      // Guild off-planet: Ship forces from board back to reserves (Rule 2.06.05.02)
      const fromTerritoryId = response.data.fromTerritoryId as TerritoryId | undefined;
      const fromSector = response.data.fromSector as number | undefined;
      const count = response.data.count as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;
      const cost = response.data.cost as number | undefined;

      if (fromTerritoryId && count !== undefined && fromSector !== undefined) {
        newState = sendForcesToReserves(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          count,
          useElite ?? false
        );

        // Handle spice cost
        if (cost !== undefined && cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }

        console.log(`   ✅ Shipped ${count} forces off-planet from ${fromTerritoryId} for ${cost ?? 0} spice\n`);

        newEvents.push({
          type: 'FORCES_SHIPPED',
          data: { faction, from: fromTerritoryId, count, cost },
          message: `${FACTION_NAMES[faction]} ships ${count} forces off-planet from ${fromTerritoryId} for ${cost ?? 0} spice`,
        });
      }
    } else {
      // Normal shipment or Fremen shipment: Ship from reserves to board
      const territoryId = response.data.territoryId as TerritoryId | undefined;
      const sector = response.data.sector as number | undefined;
      const count = response.data.count as number | undefined;
      const cost = response.data.cost as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;

      if (territoryId && count !== undefined && sector !== undefined) {
        // Actually mutate state - call the state mutation function
        // This is needed because in tests, tools aren't called, so state isn't updated
        newState = shipForces(
          state,
          faction,
          territoryId,
          sector,
          count,
          useElite ?? false
        );

        // Handle spice cost (if any)
        if (cost !== undefined && cost > 0) {
          // Check if Guild is in game - they receive payment
          const hasGuild = newState.factions.has(Faction.SPACING_GUILD);
          if (hasGuild && faction !== Faction.SPACING_GUILD) {
            // Guild receives payment (Rule 2.06.04)
            newState = removeSpice(newState, faction, cost);
            newState = addSpice(newState, Faction.SPACING_GUILD, cost);
          } else {
            // Spice goes to bank
            newState = removeSpice(newState, faction, cost);
          }
        }

        console.log(`   ✅ Shipped ${count} forces to ${territoryId} (sector ${sector}) for ${cost ?? 0} spice\n`);

        newEvents.push({
          type: 'FORCES_SHIPPED',
          data: { faction, territory: territoryId, sector, count, cost },
          message: `${FACTION_NAMES[faction]} ships ${count} forces to ${territoryId} (sector ${sector}) for ${cost ?? 0} spice`,
        });
      }
    }

    // Log action for all shipment types
    if (newState !== state) {
      newState = logAction(newState, 'FORCES_SHIPPED', faction, response.data);
    }

    return { state: newState, events: newEvents };
  }

  private processMovement(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId;

    // Tool returns: { fromTerritoryId, fromSector, toTerritoryId, toSector, count, useElite }
    // OR legacy format: { from: { territory, sector }, to: { territory, sector }, count }
    let fromTerritoryId: TerritoryId | undefined;
    let fromSector: number | undefined;
    let toTerritoryId: TerritoryId | undefined;
    let toSector: number | undefined;
    let count: number | undefined;
    let useElite: boolean | undefined;

    // Check for new format first
    if (response.data.fromTerritoryId && response.data.toTerritoryId) {
      fromTerritoryId = response.data.fromTerritoryId as TerritoryId;
      fromSector = response.data.fromSector as number | undefined;
      toTerritoryId = response.data.toTerritoryId as TerritoryId;
      toSector = response.data.toSector as number | undefined;
      count = response.data.count as number | undefined;
      useElite = response.data.useElite as boolean | undefined;
    } else {
      // Legacy format
      const fromData = response.data.from as { territory?: string; sector?: number } | undefined;
      const toData = response.data.to as { territory?: string; sector?: number } | undefined;
      count = response.data.count as number | undefined;

      if (fromData?.territory && toData?.territory) {
        fromTerritoryId = fromData.territory as TerritoryId;
        fromSector = fromData.sector;
        toTerritoryId = toData.territory as TerritoryId;
        toSector = toData.sector;
      }
    }

    if (!fromTerritoryId || !toTerritoryId || count === undefined || fromSector === undefined || toSector === undefined) {
      return { state, events: newEvents };
    }

    // Validate movement before executing (since tools aren't called in tests)
    // Use ornithopter access override if available (from phase start)
    const hasOrnithoptersOverride = this.ornithopterAccessAtPhaseStart.has(faction);
    const validation = validateMovement(
      state,
      faction,
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      hasOrnithoptersOverride
    );

    if (!validation.valid) {
      const error = validation.errors[0];
      console.error(`   ❌ Movement rejected: ${error.message}\n`);
      // Still return state (no mutation), but log the error
      return { state, events: newEvents };
    }

    // Actually mutate state - call the state mutation function
    // This is needed because in tests, tools aren't called, so state isn't updated
    let newState = moveForces(
      state,
      faction,
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      useElite ?? false
    );

    console.log(`   ✅ Moved ${count} forces from ${fromTerritoryId} to ${toTerritoryId}\n`);

    newEvents.push({
      type: 'FORCES_MOVED',
      data: {
        faction,
        from: fromTerritoryId,
        fromSector,
        to: toTerritoryId,
        toSector,
        count,
      },
      message: `${FACTION_NAMES[faction]} moves ${count} forces from ${fromTerritoryId} to ${toTerritoryId}`,
    });

    newState = logAction(newState, 'FORCES_MOVED', faction, {
      from: fromTerritoryId,
      fromSector,
      to: toTerritoryId,
      toSector,
      count,
    });

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // ALLIANCE CONSTRAINT (Rule 1.06.03.08)
  // ===========================================================================

  /**
   * Apply alliance constraint for a specific faction that just completed actions.
   *
   * Rule 1.06.03.08: "At the end of your Shipment and Movement actions,
   * Place all your Forces that are in the same Territory (except the Polar Sink)
   * as your Ally's Forces in the Tleilaxu Tanks."
   *
   * CRITICAL: Applied AFTER EACH faction completes, not at end of phase!
   */
  private applyAllianceConstraintForFaction(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const factionState = state.factions.get(faction);
    if (!factionState) return { state, events: newEvents };

    const allyId = factionState.allyId;
    if (!allyId) {
      // No ally, no constraint
      return { state, events: newEvents };
    }

    const allyState = state.factions.get(allyId);
    if (!allyState) return { state, events: newEvents };

    // Get all territories where this faction has forces
    const factionTerritories = new Set<TerritoryId>();
    for (const stack of factionState.forces.onBoard) {
      factionTerritories.add(stack.territoryId);
    }

    // Check each territory for ally presence
    for (const territoryId of Array.from(factionTerritories)) {
      // Rule: Except Polar Sink
      if (territoryId === TerritoryId.POLAR_SINK) continue;

      const occupants = getFactionsInTerritory(newState, territoryId);
      if (occupants.includes(allyId)) {
        // Ally is in this territory - send all forces to tanks
        const forcesInTerritory = factionState.forces.onBoard.filter(
          (s) => s.territoryId === territoryId
        );

        let totalForces = 0;
        for (const stack of forcesInTerritory) {
          totalForces += stack.forces.regular + stack.forces.elite;
        }

        if (totalForces > 0) {
          console.log(
            `\n   ⚠️  ALLIANCE CONSTRAINT: ${FACTION_NAMES[faction]} has ${totalForces} forces in ${territoryId} with ally ${FACTION_NAMES[allyId]}`
          );
          console.log(`   🗑️  Sending ${totalForces} forces to Tleilaxu Tanks (Rule 1.06.03.08)\n`);

          // Send all forces in this territory to tanks
          for (const stack of forcesInTerritory) {
            const count = stack.forces.regular + stack.forces.elite;
            newState = sendForcesToTanks(
              newState,
              faction,
              territoryId,
              stack.sector,
              count
            );
          }

          newEvents.push({
            type: 'FORCES_SHIPPED',
            data: {
              faction,
              territory: territoryId,
              count: totalForces,
              reason: 'alliance_constraint',
            },
            message: `${FACTION_NAMES[faction]} sends ${totalForces} forces to tanks (alliance constraint: same territory as ${FACTION_NAMES[allyId]})`,
          });

          newState = logAction(newState, 'FORCES_SHIPPED', faction, {
            territory: territoryId,
            count: totalForces,
            reason: 'alliance_constraint',
          });
        }
      }
    }

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private getValidShippingDestinations(
    state: GameState,
    faction: Faction
  ): { territoryId: TerritoryId; sector: number; isStronghold: boolean; costMultiplier: number }[] {
    const destinations: { territoryId: TerritoryId; sector: number; isStronghold: boolean; costMultiplier: number }[] = [];

    for (const [id, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      const territoryId = id as TerritoryId;

      // Can't ship to polar sink
      if (territory.type === TerritoryType.POLAR_SINK) continue;

      // Check each sector (can't ship into storm)
      for (const sector of territory.sectors) {
        if (sector === state.stormSector) continue;

        destinations.push({
          territoryId,
          sector,
          isStronghold: territory.type === TerritoryType.STRONGHOLD,
          costMultiplier: territory.type === TerritoryType.STRONGHOLD ? 1 : 2,
        });
      }
    }

    return destinations;
  }

  // ===========================================================================
  // BG SPIRITUAL ADVISOR (Rule 2.02.05)
  // ===========================================================================

  /**
   * Check if we should ask BG about spiritual advisor after a shipment
   *
   * Rule 2.02.05: "Whenever any other faction Ships Forces onto Dune from off-planet"
   * Rule 2.04.03: Fremen reserves are "on Dune (the far side)" - NOT off-planet
   *
   * CRITICAL: Fremen "Send" forces (not "Ship from off-planet") - does NOT trigger BG
   */
  private shouldAskBGSpiritualAdvisor(state: GameState, shippingFaction: Faction): boolean {
    // Only trigger for non-BG factions
    if (shippingFaction === Faction.BENE_GESSERIT) return false;

    // Fremen "Send" forces from on-planet reserves, not "Ship from off-planet"
    // Rule 2.04.03: Fremen reserves are on Dune, not off-planet
    // Rule 2.02.05: BG ability only triggers for "Ships Forces onto Dune from off-planet"
    if (shippingFaction === Faction.FREMEN) return false;

    // BG must be in game and have reserves
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves = bgState.forces.reserves.regular + bgState.forces.reserves.elite;
    if (reserves === 0) return false;

    return true;
  }

  /**
   * Request BG spiritual advisor decision after another faction ships.
   * Rule 2.02.05: BG may send 1 force for free when any other faction ships.
   */
  private requestBGSpiritualAdvisor(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    if (!this.bgTriggeringShipment) {
      // Shouldn't happen, but handle gracefully
      this.waitingForBGAdvisor = false;
      return this.requestMovementDecision(state, events);
    }

    const { territory, sector } = this.bgTriggeringShipment;
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves = bgState.forces.reserves.regular + bgState.forces.reserves.elite;

    // Check if BG has any fighters in the triggering territory (for advanced rules)
    const forcesInTerritory = bgState.forces.onBoard.filter(
      (s) => s.territoryId === territory
    );
    const hasFightersInTerritory = forcesInTerritory.length > 0;

    console.log(`\n🧘 BG SPIRITUAL ADVISORS: Another faction shipped to ${territory}`);
    console.log(`   You may send 1 force for FREE to Polar Sink or same territory\n`);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: 'SEND_ADVISOR',
        prompt: `Spiritual Advisors: Another faction just shipped to ${territory} (sector ${sector}). You may send 1 force for FREE. Options: (1) Send to Polar Sink (basic), (2) Send to same territory ${hasFightersInTerritory ? '(NOT AVAILABLE - you have fighters there)' : '(advanced)'}, (3) Pass.`,
        context: {
          reserves,
          triggeringTerritory: territory,
          triggeringSector: sector,
          canUseSameTerritory: !hasFightersInTerritory,
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ['bg_send_spiritual_advisor', 'pass'],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process BG's spiritual advisor decision.
   */
  private processBGSpiritualAdvisorDecision(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    this.waitingForBGAdvisor = false;
    const bgResponse = responses.find(r => r.factionId === Faction.BENE_GESSERIT);

    const newEvents: PhaseEvent[] = [];
    let newState = state;

    if (bgResponse && !bgResponse.passed && bgResponse.actionType === 'BG_SPIRITUAL_ADVISOR') {
      // BG used the ability - state was already updated by the tool
      const choice = bgResponse.data.choice as string;
      const count = bgResponse.data.count as number || 1;
      const territory = (bgResponse.data.territoryId || (bgResponse.data.choice === 'polar_sink' ? 'POLAR_SINK' : this.bgTriggeringShipment?.territory)) as TerritoryId;

      console.log(`   ✅ Bene Gesserit sends 1 spiritual advisor to ${territory} for FREE\n`);

      newEvents.push({
        type: 'FORCES_SHIPPED',
        data: {
          faction: Faction.BENE_GESSERIT,
          territory,
          count,
          cost: 0,
          reason: 'spiritual_advisor',
        },
        message: `Bene Gesserit sends 1 spiritual advisor to ${territory} for FREE (Rule 2.02.05)`,
      });
    } else {
      console.log(`   ⏭️  Bene Gesserit passes on spiritual advisor\n`);
    }

    // Clear tracking
    this.bgTriggeringShipment = null;

    return { state: newState, events: newEvents };
  }
}
