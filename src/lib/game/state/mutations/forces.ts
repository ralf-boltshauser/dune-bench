/**
 * General force movement and management mutations.
 */

import { type GameState, type FactionState, Faction, TerritoryId } from '../../types';
import { getFactionState, getFactionsInTerritory } from '../queries';
import {
  addToForceCount,
  subtractFromForceCount,
  addToStack,
  removeFromStackForFaction,
  moveStackForces,
} from '../force-utils';
import { validateAdvisorFlipToFighters } from '../../rules';
import { updateFactionState } from './common';
import { convertBGAdvisorsToFighters, convertBGFightersToAdvisors } from './forces-bene-gesserit';
import { validateStrongholdAfterMutation } from './validation-helpers';

/**
 * Move forces from reserves to a territory.
 * 
 * For Bene Gesserit:
 * - Normal shipment: Forces are shipped as fighters (advisors = 0) - Rule 2.02.14
 * - Spiritual Advisor ability: Forces are shipped as advisors (use isAdvisor=true)
 * 
 * @param isAdvisor - For BG: if true, forces are shipped as advisors (for Spiritual Advisor ability).
 *                    If false or undefined, forces are shipped as fighters (normal shipment).
 */
export function shipForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false,
  isAdvisor: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from reserves, add to board
  const reserves = subtractFromForceCount(forces.reserves, count, isElite);
  
  // For BG: determine advisor count based on isAdvisor flag
  // @rule 2.02.13 FIGHTERS: Normal shipment must be fighters (advisors = 0)
  // Spiritual Advisor ability ships as advisors
  const advisorCount = (faction === Faction.BENE_GESSERIT && isAdvisor) ? count : 0;
  const onBoard = addToStack(forces.onBoard, faction, territoryId, sector, count, isElite, advisorCount);

  const newState = updateFactionState(state, faction, {
    forces: { ...forces, reserves, onBoard },
  });

  // Defensive validation: Check stronghold occupancy limits after mutation
  validateStrongholdAfterMutation(newState, territoryId, 'shipment');

  return newState;
}

/**
 * Move forces between territories.
 */
export function moveForces(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Check if ENLISTMENT rule should trigger (before moving)
  // @rule 2.02.14 ENLISTMENT: "When you Move advisors to an unoccupied Territory, you must flip them to fighters."
  let advisorsToFlip = 0;
  let adaptiveForceWouldFlip = false;
  let advisorsMoved = 0;
  
  if (faction === Faction.BENE_GESSERIT) {
    // Find source stack to check if advisors are being moved
    const sourceStack = forces.onBoard.find(
      (s) => s.territoryId === fromTerritory && s.sector === fromSector
    );
    
    if (sourceStack && sourceStack.advisors !== undefined && sourceStack.advisors > 0) {
      const sourceAdvisors = sourceStack.advisors;
      // removeFromStackForFaction removes advisors first, then fighters
      advisorsMoved = Math.min(count, sourceAdvisors);
      
      // Only proceed if advisors are being moved
      if (advisorsMoved > 0) {
        // Check if destination already has BG fighters (ADAPTIVE FORCE would apply instead)
        const destStack = forces.onBoard.find(
          (s) => s.territoryId === toTerritory && s.sector === toSector
        );
        if (destStack) {
          const destTotalForces = destStack.forces.regular + destStack.forces.elite;
          const destAdvisors = destStack.advisors ?? 0;
          const destFighters = destTotalForces - destAdvisors;
          // If destination has fighters, ADAPTIVE FORCE applies (handled in moveStackForces)
          // ENLISTMENT only applies when destination is unoccupied (no fighters)
          if (destFighters > 0) {
            // ADAPTIVE FORCE would flip advisors to fighters
            adaptiveForceWouldFlip = true;
          }
        }
        
        // Check ENLISTMENT only if ADAPTIVE FORCE doesn't apply
        if (!adaptiveForceWouldFlip) {
          // Check if destination is unoccupied (no other faction forces)
          // getFactionsInTerritory already excludes BG advisors-only
          const occupants = getFactionsInTerritory(state, toTerritory);
          // Territory is unoccupied if no other factions have forces there
          // (BG advisors don't count as "occupying" for this purpose)
          const isUnoccupied = occupants.length === 0 || (occupants.length === 1 && occupants[0] === Faction.BENE_GESSERIT);
          
          if (isUnoccupied) {
            advisorsToFlip = advisorsMoved;
            // Validate restrictions using centralized validation function
            const validation = validateAdvisorFlipToFighters(
              state,
              faction,
              toTerritory,
              toSector
            );
            
            // ENLISTMENT triggers if unoccupied AND no restrictions block it
            if (!validation.canFlip) {
              // Restrictions block ENLISTMENT (PEACETIME or STORMED_IN)
              advisorsToFlip = 0;
            }
          } else {
            // Territory is occupied by other factions - ENLISTMENT doesn't trigger
            advisorsToFlip = 0;
          }
        }
      }
    }
  }

  const onBoard = moveStackForces(
    forces.onBoard,
    faction,
    { territoryId: fromTerritory, sector: fromSector },
    { territoryId: toTerritory, sector: toSector },
    count,
    isElite
  );

  // Apply state update first (movement)
  let newState = updateFactionState(state, faction, {
    forces: { ...forces, onBoard },
  });

  // Apply ENLISTMENT: Flip advisors to fighters if rule triggered
  // Use convertBGAdvisorsToFighters to enforce PEACETIME and STORMED_IN restrictions
  if (advisorsToFlip > 0) {
    try {
      newState = convertBGAdvisorsToFighters(
        newState,
        toTerritory,
        toSector,
        advisorsToFlip
      );
    } catch (error) {
      // Restrictions prevent flipping (PEACETIME or STORMED_IN)
      // Advisors remain as advisors - ENLISTMENT cannot be enforced
      // This is correct per rules: restrictions override ENLISTMENT requirement
    }
  }

  // Handle ADAPTIVE FORCE restriction validation
  // Rule 2.02.21: "When you Move advisors or fighters into a Territory where you have
  // the opposite type they flip to match the type already in the Territory."
  // ADAPTIVE FORCE must respect PEACETIME and STORMED_IN restrictions (Rules 2.02.19, 2.02.20)
  if (faction === Faction.BENE_GESSERIT && adaptiveForceWouldFlip && advisorsMoved > 0) {
    // ADAPTIVE FORCE automatically flipped advisors to fighters in moveStackForces()
    // Check if restrictions block this flip
    const validation = validateAdvisorFlipToFighters(
      newState,
      faction,
      toTerritory,
      toSector
    );
    
    if (!validation.canFlip) {
      // Restrictions block ADAPTIVE FORCE flip - convert fighters back to advisors
      // This enforces PEACETIME and STORMED_IN restrictions on ADAPTIVE FORCE
      newState = convertBGFightersToAdvisors(
        newState,
        toTerritory,
        toSector,
        advisorsMoved
      );
    }
  }

  // Defensive validation: Check stronghold occupancy limits after mutation
  // IMPORTANT: This must happen AFTER all force type conversions (ENLISTMENT, ADAPTIVE FORCE)
  // to ensure we validate the final state
  validateStrongholdAfterMutation(newState, toTerritory, 'movement');

  return newState;
}

/**
 * Send forces to the Tleilaxu Tanks (death).
 *
 * This function has two call signatures:
 * 1. Legacy: sendForcesToTanks(state, faction, territoryId, sector, count, isElite)
 * 2. New: sendForcesToTanks(state, faction, territoryId, sector, regularCount, eliteCount)
 *
 * When called with 5 parameters or with boolean 6th param, uses legacy mode (single type).
 * When called with 6 numeric parameters, uses new mode (separate regular/elite counts).
 *
 * The new mode properly handles elite forces that are worth 2x in taking losses.
 */
export function sendForcesToTanks(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  countOrRegular: number,
  isEliteOrEliteCount?: boolean | number
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  let onBoard = forces.onBoard;
  let tanks = forces.tanks;

  // Determine which calling convention is being used
  if (typeof isEliteOrEliteCount === 'boolean' || isEliteOrEliteCount === undefined) {
    // Legacy mode: single force type
    const count = countOrRegular;
    const isElite = isEliteOrEliteCount ?? false;

    // Use faction-specific version to prevent accidentally removing wrong faction's forces
    onBoard = removeFromStackForFaction(onBoard, faction, territoryId, sector, count, isElite);
    tanks = addToForceCount(tanks, count, isElite);
  } else {
    // New mode: separate regular and elite counts
    const regularCount = countOrRegular;
    const eliteCount = isEliteOrEliteCount;

    // Remove regular forces
    if (regularCount > 0) {
      // Use faction-specific version to prevent accidentally removing wrong faction's forces
      onBoard = removeFromStackForFaction(onBoard, faction, territoryId, sector, regularCount, false);
      tanks = addToForceCount(tanks, regularCount, false);
    }

    // Remove elite forces
    if (eliteCount > 0) {
      // Use faction-specific version to prevent accidentally removing wrong faction's forces
      onBoard = removeFromStackForFaction(onBoard, faction, territoryId, sector, eliteCount, true);
      tanks = addToForceCount(tanks, eliteCount, true);
    }
  }

  return updateFactionState(state, faction, {
    forces: { ...forces, onBoard, tanks },
  });
}

/**
 * Revive forces from tanks to reserves.
 *
 * @rule 1.05.02 FORCE REVIVAL: Revived forces are moved from the Tleilaxu Tanks to off-planet reserves.
 * The number of forces and whether they are elite is determined by the caller (phase handler / rules).
 */
export function reviveForces(
  state: GameState,
  faction: Faction,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from tanks, add to reserves
  const tanks = subtractFromForceCount(forces.tanks, count, isElite);
  const reserves = addToForceCount(forces.reserves, count, isElite);

  // Track elite forces revived this turn (for Fedaykin/Sardaukar limit)
  const updatedState: Partial<FactionState> = {
    forces: { ...forces, tanks, reserves },
  };

  if (isElite && (faction === Faction.FREMEN || faction === Faction.EMPEROR)) {
    const currentEliteRevived = factionState.eliteForcesRevivedThisTurn ?? 0;
    updatedState.eliteForcesRevivedThisTurn = currentEliteRevived + count;
  }

  return updateFactionState(state, faction, updatedState);
}

/**
 * Send forces from board back to reserves (Guild off-planet shipment).
 */
export function sendForcesToReserves(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from board, add to reserves
  // Use faction-specific version to prevent accidentally removing wrong faction's forces
  const onBoard = removeFromStackForFaction(forces.onBoard, faction, territoryId, sector, count, isElite);
  const reserves = addToForceCount(forces.reserves, count, isElite);

  return updateFactionState(state, faction, {
    forces: { ...forces, onBoard, reserves },
  });
}

