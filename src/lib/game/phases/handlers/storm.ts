/**
 * Storm Phase Handler
 *
 * Phase 1.01: Storm Movement
 * - Two players dial storm movement (1-3, or 0-20 on turn 1)
 * - Storm moves counterclockwise
 * - Forces in sand territories under storm are destroyed
 * - Spice in storm path is destroyed
 * - Storm order is determined for the turn
 */

import {
  Faction,
  Phase,
  TerritoryType,
  TerritoryId,
  type GameState,
  TERRITORY_DEFINITIONS,
} from '../../types';
import {
  moveStorm,
  updateStormOrder,
  sendForcesToTanks,
  destroySpiceInTerritory,
  logAction,
  getFactionState,
  getFactionsInTerritory,
  getPlayerPositions,
  getFactionAtPosition,
} from '../../state';
import { FACTION_NAMES } from '../../types';
import { GAME_CONSTANTS } from '../../data';
import { calculateStormOrder } from '../../state/factory';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type StormPhaseContext,
} from '../types';

// =============================================================================
// STORM PHASE HANDLER
// =============================================================================

export class StormPhaseHandler implements PhaseHandler {
  readonly phase = Phase.STORM;

  private context: StormPhaseContext = {
    dialingFactions: null,
    dials: new Map(),
    stormMovement: null,
    weatherControlUsed: false,
    weatherControlBy: null,
  };

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
      dialingFactions: null,
      dials: new Map(),
      stormMovement: null,
      weatherControlUsed: false,
      weatherControlBy: null,
    };

    const events: PhaseEvent[] = [];
    const pendingRequests: AgentRequest[] = [];

    // Determine who dials the storm
    // Turn 1: Two players nearest storm start sector
    // Later turns: Two players who last used battle wheels
    const dialers = this.getStormDialers(state);
    this.context.dialingFactions = dialers;

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Fremen special: They control storm movement in advanced rules
    // In advanced rules with Fremen, they use storm deck instead of dials
    // The PHASE_STARTED event already indicates storm phase is active

    // Request dial values from the two players
    for (const faction of dialers) {
      const maxDial = state.turn === 1
        ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
        : GAME_CONSTANTS.MAX_STORM_DIAL;

      const startingSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)
      
      pendingRequests.push({
        factionId: faction,
        requestType: 'DIAL_STORM',
        prompt: state.turn === 1
          ? `Initial Storm Placement: Dial a number from 0 to ${maxDial}. The total will determine where the storm starts on the board (moves from Storm Start Sector 0 counterclockwise).`
          : `Dial a number for storm movement (1-${maxDial}). The total will determine how many sectors the storm moves.`,
        context: {
          turn: state.turn,
          currentStormSector: startingSector,
          maxDial,
          isFirstTurn: state.turn === 1,
          stormStartSector: state.turn === 1 ? 0 : undefined,
        },
        availableActions: ['DIAL_STORM'],
      });
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // Both players dial simultaneously
      actions: [],
      events,
    };
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const actions: GameAction[] = [];

    // Process dial responses
    if (this.context.stormMovement === null) {
      return this.processDialResponses(state, responses);
    }

    // Storm has been dialed - now apply movement
    return this.applyStormMovement(state);
  }

  cleanup(state: GameState): GameState {
    // Reset context for next turn
    this.context = {
      dialingFactions: null,
      dials: new Map(),
      stormMovement: null,
      weatherControlUsed: false,
      weatherControlBy: null,
    };
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private getStormDialers(state: GameState): [Faction, Faction] {
    const factions = Array.from(state.factions.keys());
    const playerPositions = getPlayerPositions(state);

    if (state.turn === 1) {
      // First turn: two players nearest Storm Start Sector (sector 0) on either side
      const stormStartSector = 0;
      
      // Find all factions with their distances from storm start
      // We need to find the nearest on EITHER side (before and after sector 0)
      const factionsWithInfo = factions.map((faction) => {
        const position = playerPositions.get(faction) ?? 0;
        // Calculate counterclockwise distance from storm start (forward/after)
        const distanceForward = (position - stormStartSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
        // Calculate clockwise distance (backward/before) - going the other way around
        // If position is 0, backward distance is 0. Otherwise, it's 18 - forward distance
        const distanceBackward = position === stormStartSector 
          ? GAME_CONSTANTS.TOTAL_SECTORS // At start, treat as far
          : (stormStartSector - position + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
        return { 
          faction, 
          position, 
          distanceForward, 
          distanceBackward,
          // If at sector 0, treat as very far (not a dialer)
          isAtStart: position === stormStartSector
        };
      });

      // Filter out faction at sector 0 (if any), then find nearest forward and backward
      const notAtStart = factionsWithInfo.filter(f => !f.isAtStart);
      
      // Find nearest forward (after sector 0, counterclockwise)
      const nearestForward = notAtStart.reduce((min, curr) => 
        curr.distanceForward < min.distanceForward ? curr : min, 
        notAtStart[0] || factionsWithInfo[0]
      );
      
      // Find nearest backward (before sector 0, clockwise)
      const nearestBackward = notAtStart.reduce((min, curr) => 
        curr.distanceBackward < min.distanceBackward ? curr : min, 
        notAtStart[0] || factionsWithInfo[0]
      );

      // If we have both, use them. Otherwise fall back to two nearest overall
      let dialer1: Faction;
      let dialer2: Faction;
      
      if (nearestForward && nearestBackward && nearestForward.faction !== nearestBackward.faction) {
        dialer1 = nearestForward.faction;
        dialer2 = nearestBackward.faction;
      } else {
        // Fallback: two nearest overall (excluding any at sector 0)
        const sorted = notAtStart.length > 0 
          ? [...notAtStart].sort((a, b) => a.distanceForward - b.distanceForward)
          : [...factionsWithInfo].sort((a, b) => a.distanceForward - b.distanceForward);
        dialer1 = sorted[0]?.faction ?? factions[0];
        dialer2 = sorted[1]?.faction ?? sorted[0]?.faction ?? factions[0];
      }

      // Log for debugging
      console.log('\n' + '='.repeat(80));
      console.log('🌪️  INITIAL STORM PLACEMENT (Turn 1)');
      console.log('='.repeat(80));
      console.log(`\n📍 Storm Start Sector: ${stormStartSector}`);
      console.log('\n📊 Player Positions (relative to Storm Start Sector 0):');
      factionsWithInfo.forEach(({ faction, position, distanceForward, distanceBackward, isAtStart }) => {
        if (isAtStart) {
          console.log(`  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (AT Storm Start - not a dialer)`);
        } else {
          const direction = distanceForward < distanceBackward ? 'forward' : 'backward';
          const dist = Math.min(distanceForward, distanceBackward);
          console.log(`  ${FACTION_NAMES[faction]}: Sector ${position} (${dist} sectors ${direction === 'forward' ? 'after' : 'before'} storm start)`);
        }
      });
      console.log(`\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`);
      console.log('   (Two players nearest to Storm Start Sector on either side)');
      console.log('='.repeat(80) + '\n');

      return [dialer1, dialer2];
    }

    // Later turns: players who last used battle wheels
    // Since we don't track battle participation, we use the two players whose
    // markers are nearest to the storm position on either side:
    // 1. The player marker at or immediately after the storm (counterclockwise)
    // 2. The player marker closest before the storm (clockwise from storm)

    const currentStormSector = state.stormSector;

    // Find all factions with their distances from storm
    const factionsWithInfo = factions.map((faction) => {
      const position = playerPositions.get(faction) ?? 0;
      // Calculate counterclockwise distance from storm (after/ahead)
      const distanceForward = (position - currentStormSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
      // Calculate clockwise distance (before/behind)
      const distanceBackward = (currentStormSector - position + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
      return {
        faction,
        position,
        distanceForward,
        distanceBackward,
        isOnStorm: distanceForward === 0
      };
    });

    // Find nearest forward (at or after storm, counterclockwise)
    // This is the player marker the storm "approaches next" or is on top of
    const nearestForward = factionsWithInfo.reduce((min, curr) =>
      curr.distanceForward < min.distanceForward ? curr : min
    );

    // Find nearest backward (before storm, clockwise)
    // This is the player marker closest to storm going the other direction
    const nearestBackward = factionsWithInfo.reduce((min, curr) =>
      curr.distanceBackward < min.distanceBackward ? curr : min
    );

    const dialer1 = nearestForward.faction;
    const dialer2 = nearestBackward.faction;

    console.log('\n' + '='.repeat(80));
    console.log('🌪️  STORM MOVEMENT (Turn ' + state.turn + ')');
    console.log('='.repeat(80));
    console.log(`\n📍 Current Storm Sector: ${currentStormSector}`);
    console.log('\n📊 Player Positions (relative to Storm):');
    factionsWithInfo.forEach(({ faction, position, distanceForward, distanceBackward, isOnStorm }) => {
      if (isOnStorm) {
        console.log(`  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (ON STORM)`);
      } else {
        console.log(`  ${FACTION_NAMES[faction]}: Sector ${position} (${distanceForward} sectors ahead, ${distanceBackward} sectors behind)`);
      }
    });
    console.log(`\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`);
    console.log(`   ${FACTION_NAMES[dialer1]}: Nearest at/after storm (${nearestForward.distanceForward} sectors ahead)`);
    console.log(`   ${FACTION_NAMES[dialer2]}: Nearest before storm (${nearestBackward.distanceBackward} sectors behind)`);
    console.log('   (Two players whose markers are nearest to storm on either side)');
    console.log('='.repeat(80) + '\n');

    return [dialer1, dialer2];
  }

  private processDialResponses(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const maxDial = state.turn === 1
      ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
      : GAME_CONSTANTS.MAX_STORM_DIAL;

    console.log('\n' + '='.repeat(80));
    console.log('🎲 STORM DIAL REVEAL');
    console.log('='.repeat(80));

    // Collect dial values
    for (const response of responses) {
      // Tool name 'dial_storm' becomes 'DIAL_STORM' actionType
      if (response.actionType === 'DIAL_STORM') {
        // Tool returns 'dial' property
        let dialValue = Number(response.data.dial ?? 0);

        // Clamp to valid range
        if (state.turn === 1) {
          dialValue = Math.max(0, Math.min(maxDial, dialValue));
        } else {
          dialValue = Math.max(1, Math.min(maxDial, dialValue));
        }

        this.context.dials.set(response.factionId, dialValue);

        console.log(`\n  ${FACTION_NAMES[response.factionId]}: ${dialValue} (range: ${state.turn === 1 ? '0-20' : '1-3'})`);

        events.push({
          type: 'STORM_DIAL_REVEALED',
          data: { faction: response.factionId, value: dialValue },
          message: `${response.factionId} dials ${dialValue}`,
        });
      }
    }

    // Calculate total movement
    let totalMovement = 0;
    for (const value of this.context.dials.values()) {
      totalMovement += value;
    }
    this.context.stormMovement = totalMovement;

    console.log(`\n  📊 Total: ${totalMovement} sectors`);
    console.log('='.repeat(80) + '\n');

    // Now apply the movement
    return this.applyStormMovement(state);
  }

  private applyStormMovement(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    const movement = this.context.stormMovement ?? 0;
    const oldSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)

    console.log('\n' + '='.repeat(80));
    console.log('🌪️  STORM MOVEMENT CALCULATION');
    console.log('='.repeat(80));
    console.log(`\n  Starting Sector: ${oldSector}${state.turn === 1 ? ' (Storm Start Sector)' : ''}`);
    console.log(`  Movement: ${movement} sectors counterclockwise`);
    
    // Move storm
    const newSector = (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
    console.log(`  Ending Sector: ${newSector}`);
    
    // Update state with new sector (if not turn 1, or if turn 1 and we're actually moving)
    if (state.turn === 1) {
      // Turn 1: storm starts at 0, then moves
      newState = moveStorm(newState, newSector);
    } else {
      newState = moveStorm(newState, newSector);
    }

    events.push({
      type: 'STORM_MOVED',
      data: {
        from: oldSector,
        to: newSector,
        movement,
        sectorsAffected: this.getSectorsBetween(oldSector, newSector),
      },
      message: `Storm moves ${movement} sectors (${oldSector} → ${newSector})`,
    });

    // Destroy forces and spice in storm path
    const destroyedForces = this.destroyForcesInStorm(newState, oldSector, newSector);
    const destroyedSpice = this.destroySpiceInStorm(newState, oldSector, newSector);

    // Apply destruction
    for (const destruction of destroyedForces) {
      newState = sendForcesToTanks(
        newState,
        destruction.faction,
        destruction.territoryId,
        destruction.sector,
        destruction.count
      );

      events.push({
        type: 'FORCES_KILLED_BY_STORM',
        data: destruction,
        message: `${destruction.count} ${destruction.faction} forces destroyed by storm in ${destruction.territoryId}`,
      });
    }

    for (const destruction of destroyedSpice) {
      newState = destroySpiceInTerritory(
        newState,
        destruction.territoryId,
        destruction.sector
      );

      events.push({
        type: 'SPICE_DESTROYED_BY_STORM',
        data: destruction,
        message: `${destruction.amount} spice destroyed by storm in ${destruction.territoryId}`,
      });
    }

    // Update storm order based on new storm position
    // Note: calculateStormOrder now uses state.playerPositions internally
    const newOrder = calculateStormOrder(newState);
    newState = updateStormOrder(newState, newOrder);

    // Log storm order calculation
    console.log('\n' + '='.repeat(80));
    console.log('📋 STORM ORDER DETERMINATION');
    console.log('='.repeat(80));
    console.log(`\n  Storm Position: Sector ${newSector}`);
    console.log('\n  Player Positions:');
    const playerPositions = getPlayerPositions(newState);
    const factions = Array.from(newState.factions.keys());
    factions.forEach((faction) => {
      const position = playerPositions.get(faction) ?? 0;
      const distance = (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
      const isOnStorm = distance === 0;
      const marker = isOnStorm ? ' ⚠️  (ON STORM - goes last)' : '';
      console.log(`    ${FACTION_NAMES[faction]}: Sector ${position} (distance: ${distance}${marker})`);
    });
    console.log('\n  Storm Order (First → Last):');
    newOrder.forEach((faction, index) => {
      const position = playerPositions.get(faction) ?? 0;
      const distance = (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
      console.log(`    ${index + 1}. ${FACTION_NAMES[faction]} (Sector ${position}, distance: ${distance})`);
    });
    console.log(`\n  ✅ First Player: ${FACTION_NAMES[newOrder[0]]}`);
    console.log('='.repeat(80) + '\n');

    // Log the action
    newState = logAction(newState, 'STORM_MOVED', null, {
      from: oldSector,
      to: newSector,
      movement,
    });

    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.SPICE_BLOW,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  private getSectorsBetween(from: number, to: number): number[] {
    const sectors: number[] = [];
    let current = from;
    while (current !== to) {
      current = (current + 1) % GAME_CONSTANTS.TOTAL_SECTORS;
      sectors.push(current);
    }
    return sectors;
  }

  private destroyForcesInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
  ): { faction: Faction; territoryId: TerritoryId; sector: number; count: number }[] {
    const destroyed: { faction: Faction; territoryId: TerritoryId; sector: number; count: number }[] = [];
    const affectedSectors = new Set([fromSector, ...this.getSectorsBetween(fromSector, toSector)]);

    // Check each territory
    for (const [territoryId, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      // Skip protected territories (rock, polar sink, imperial basin)
      if (territory.protectedFromStorm) continue;
      if (territory.type !== TerritoryType.SAND) continue;

      // Check if any sector of this territory is in the storm
      for (const sector of territory.sectors) {
        if (!affectedSectors.has(sector)) continue;

        // Find forces in this sector
        for (const [faction, factionState] of state.factions) {
          // Fremen lose half forces (rounded up) in storm
          const forceStack = factionState.forces.onBoard.find(
            (f) => f.territoryId === territoryId && f.sector === sector
          );

          if (forceStack) {
            const totalForces = forceStack.forces.regular + forceStack.forces.elite;
            let lostForces = totalForces;

            // Fremen only lose half
            if (faction === Faction.FREMEN) {
              lostForces = Math.ceil(totalForces / 2);
            }

            if (lostForces > 0) {
              destroyed.push({
                faction,
                territoryId: territoryId as TerritoryId,
                sector,
                count: lostForces,
              });
            }
          }
        }
      }
    }

    return destroyed;
  }

  private destroySpiceInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
  ): { territoryId: TerritoryId; sector: number; amount: number }[] {
    const destroyed: { territoryId: TerritoryId; sector: number; amount: number }[] = [];
    const affectedSectors = new Set(this.getSectorsBetween(fromSector, toSector));

    // Note: Spice is destroyed only in sectors the storm PASSES THROUGH, not where it starts
    for (const spice of state.spiceOnBoard) {
      if (affectedSectors.has(spice.sector)) {
        destroyed.push({
          territoryId: spice.territoryId,
          sector: spice.sector,
          amount: spice.amount,
        });
      }
    }

    return destroyed;
  }
}

// Type for action logging
type GameAction = {
  type: string;
  data: Record<string, unknown>;
};
