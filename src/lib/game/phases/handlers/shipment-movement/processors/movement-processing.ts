/**
 * Movement Processing
 *
 * Handles movement action processing:
 * - Validates movement
 * - Applies movement to state
 * - Detects TAKE UP ARMS triggers (for BG)
 */

import { Faction, TerritoryId, type GameState } from "@/lib/game/types";
import { FACTION_NAMES } from "@/lib/game/types";
import { getFactionState, moveForces, logAction } from "@/lib/game/state";
import { validateMovement } from "@/lib/game/rules";
import { type AgentResponse, type PhaseEvent } from "@/lib/game/phases/types";
import { type ProcessingResult, type BGTakeUpArmsTrigger } from "../types";
import { normalizeTerritoryIds } from "../helpers";
import { type BGTakeUpArmsHandler } from "../handlers/bg-abilities/bg-take-up-arms";

export interface MovementData {
  fromTerritoryId: TerritoryId;
  fromSector: number;
  toTerritoryId: TerritoryId;
  toSector: number;
  count: number;
  useElite: boolean;
}

export class MovementProcessor {
  constructor(private bgTakeUpArmsHandler: BGTakeUpArmsHandler) {}

  /**
   * Process movement action from agent response.
   * Delegates rule enforcement to `validateMovement` and applies the move.
   */
  process(
    state: GameState,
    response: AgentResponse,
    ornithopterAccess: Set<Faction>
  ): ProcessingResult & { takeUpArmsTrigger: BGTakeUpArmsTrigger | null } {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId as Faction;

    // Parse movement data
    const movementData = this.parseMovementData(response);
    if (!movementData) {
      return { state, events: newEvents, takeUpArmsTrigger: null };
    }

    // Check if the tool already applied the movement.
    // Tools that mutate state (like move_forces) MUST set response.data.appliedByTool = true.
    const toolAlreadyApplied = response.data.appliedByTool === true;

    if (toolAlreadyApplied) {
      console.log(
        `   ℹ️  Movement already applied by tool for ${FACTION_NAMES[faction]} from ${movementData.fromTerritoryId} to ${movementData.toTerritoryId}, emitting event without additional mutation\n`
      );
      // Still create event to indicate movement happened (tool already applied state change)
      newEvents.push({
        type: "FORCES_MOVED",
        data: {
          faction,
          from: movementData.fromTerritoryId,
          fromSector: movementData.fromSector,
          to: movementData.toTerritoryId,
          toSector: movementData.toSector,
          count: movementData.count,
        },
        message: `${FACTION_NAMES[faction]} moves ${movementData.count} forces from ${movementData.fromTerritoryId} to ${movementData.toTerritoryId}`,
      });
      const newState = logAction(state, "FORCES_MOVED", faction, {
        from: movementData.fromTerritoryId,
        fromSector: movementData.fromSector,
        to: movementData.toTerritoryId,
        toSector: movementData.toSector,
        count: movementData.count,
      });
      return { state: newState, events: newEvents, takeUpArmsTrigger: null };
    }

    // Validate movement before executing (since tools aren't called in tests)
    // Use ornithopter access override if available (from phase start)
    const hasOrnithoptersOverride = ornithopterAccess.has(faction);
    const validation = validateMovement(
      state,
      faction,
      movementData.fromTerritoryId,
      movementData.fromSector,
      movementData.toTerritoryId,
      movementData.toSector,
      movementData.count,
      hasOrnithoptersOverride
    );

    if (!validation.valid) {
      const error = validation.errors[0];
      console.error(`   ❌ Movement rejected: ${error.message}\n`);
      // Still return state (no mutation), but log the error
      // IMPORTANT: Return empty events so caller knows movement failed
      return { state, events: [], takeUpArmsTrigger: null };
    }

    // Check if TAKE UP ARMS should trigger (Rule 2.02.17)
    // Must check BEFORE movement to see if advisors are being moved and if destination is eligible
    const takeUpArmsTrigger = this.checkTakeUpArmsTrigger(
      state,
      faction,
      movementData,
      this.bgTakeUpArmsHandler
    );

    // Actually apply the movement (tool didn't apply it, so we need to)
    // Actually mutate state - call the state mutation function
    // This is needed because in tests, tools aren't called, so state isn't updated
    let newState = moveForces(
      state,
      faction,
      movementData.fromTerritoryId,
      movementData.fromSector,
      movementData.toTerritoryId,
      movementData.toSector,
      movementData.count,
      movementData.useElite
    );

    console.log(
      `   ✅ Moved ${movementData.count} forces from ${movementData.fromTerritoryId} to ${movementData.toTerritoryId}\n`
    );

    newEvents.push({
      type: "FORCES_MOVED",
      data: {
        faction,
        from: movementData.fromTerritoryId,
        fromSector: movementData.fromSector,
        to: movementData.toTerritoryId,
        toSector: movementData.toSector,
        count: movementData.count,
      },
      message: `${FACTION_NAMES[faction]} moves ${movementData.count} forces from ${movementData.fromTerritoryId} to ${movementData.toTerritoryId}`,
    });

    newState = logAction(newState, "FORCES_MOVED", faction, {
      from: movementData.fromTerritoryId,
      fromSector: movementData.fromSector,
      to: movementData.toTerritoryId,
      toSector: movementData.toSector,
      count: movementData.count,
    });

    return { state: newState, events: newEvents, takeUpArmsTrigger };
  }

  /**
   * Parse movement data from agent response
   * Supports both new format and legacy format
   */
  parseMovementData(response: AgentResponse): MovementData | null {
    const normalized = normalizeTerritoryIds(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;

    let fromTerritoryId: TerritoryId | undefined;
    let fromSector: number | undefined;
    let toTerritoryId: TerritoryId | undefined;
    let toSector: number | undefined;
    let count: number | undefined;
    let useElite: boolean | undefined;

    // Check for new format first
    if (normalizedData.fromTerritoryId && normalizedData.toTerritoryId) {
      fromTerritoryId = normalizedData.fromTerritoryId as TerritoryId;
      fromSector = normalizedData.fromSector as number | undefined;
      toTerritoryId = normalizedData.toTerritoryId as TerritoryId;
      toSector = normalizedData.toSector as number | undefined;
      count = normalizedData.count as number | undefined;
      useElite = normalizedData.useElite as boolean | undefined;
    } else {
      // Legacy format
      const fromData = normalizedData.from as
        | { territory?: TerritoryId; sector?: number }
        | undefined;
      const toData = normalizedData.to as
        | { territory?: TerritoryId; sector?: number }
        | undefined;
      count = normalizedData.count as number | undefined;

      if (fromData?.territory && toData?.territory) {
        fromTerritoryId = fromData.territory;
        fromSector = fromData.sector;
        toTerritoryId = toData.territory;
        toSector = toData.sector;
      }
    }

    // @rule 1.06.05.08 When ending a Move in a Territory lying in several Sectors, a player must make clear in which Sector of the Territory they choose to leave their Forces.
    // Enforced by requiring toSector parameter
    if (
      !fromTerritoryId ||
      !toTerritoryId ||
      count === undefined ||
      fromSector === undefined ||
      toSector === undefined
    ) {
      return null;
    }

    return {
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      useElite: useElite ?? false,
    };
  }

  /**
   * Check if TAKE UP ARMS should trigger (Rule 2.02.17)
   * Must check BEFORE movement to see if advisors are being moved and if destination is eligible
   *
   * This method detects if advisors are being moved and the destination might be eligible.
   * Full validation (occupancy, restrictions) is done by bg-take-up-arms.shouldTrigger().
   */
  private checkTakeUpArmsTrigger(
    state: GameState,
    faction: Faction,
    movementData: MovementData,
    bgTakeUpArmsHandler: BGTakeUpArmsHandler
  ): BGTakeUpArmsTrigger | null {
    if (faction !== Faction.BENE_GESSERIT) {
      return null;
    }

    // Check source stack to see if advisors are being moved
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const sourceStack = bgState.forces.onBoard.find(
      (s) =>
        s.territoryId === movementData.fromTerritoryId &&
        s.sector === movementData.fromSector
    );

    if (!sourceStack || (sourceStack.advisors ?? 0) === 0) {
      console.log(`   🔍 DEBUG: MovementProcessor.checkTakeUpArmsTrigger - No source stack or no advisors in ${movementData.fromTerritoryId}`);
      return null;
    }

    const sourceAdvisors = sourceStack.advisors ?? 0;
    // removeFromStackForFaction removes advisors first, so advisors being moved = min(count, sourceAdvisors)
    const advisorsToMove = Math.min(movementData.count, sourceAdvisors);
    console.log(`   🔍 DEBUG: MovementProcessor.checkTakeUpArmsTrigger - sourceAdvisors=${sourceAdvisors}, movementData.count=${movementData.count}, advisorsToMove=${advisorsToMove}`);

    if (advisorsToMove === 0) {
      return null;
    }

    // Need to check if the destination stack (if it exists) is in the same sector
    const destStack = bgState.forces.onBoard.find(
      (s) =>
        s.territoryId === movementData.toTerritoryId &&
        s.sector === movementData.toSector
    );
    const destAdvisors = destStack ? destStack.advisors ?? 0 : 0;

    // Rule: "if you do not already have advisors present"
    // This means BEFORE the move, so check existing advisors (excluding the ones being moved)
    if (destAdvisors === 0) {
      // Validate destination eligibility using bg-take-up-arms handler
      // Must use state BEFORE movement to check eligibility correctly
      const shouldTrigger = bgTakeUpArmsHandler.shouldTrigger(
        state,
        movementData.toTerritoryId,
        movementData.toSector
      );
      console.log(`   🔍 DEBUG: MovementProcessor.checkTakeUpArmsTrigger - shouldTrigger=${shouldTrigger} for ${movementData.toTerritoryId} (sector ${movementData.toSector})`);
      if (shouldTrigger) {
        console.log(`   🔍 DEBUG: MovementProcessor.checkTakeUpArmsTrigger - Returning trigger: territory=${movementData.toTerritoryId}, sector=${movementData.toSector}, advisorCount=${advisorsToMove}`);
        return {
          territory: movementData.toTerritoryId,
          sector: movementData.toSector,
          advisorCount: advisorsToMove,
        };
      }
    }

    return null;
  }
}

