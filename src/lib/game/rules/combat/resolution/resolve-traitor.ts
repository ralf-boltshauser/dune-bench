/**
 * Traitor battle resolution.
 */

import { getLeaderDefinition } from "../../../data";
import { getForceCountInTerritory } from "../../../state";
import type { BattlePlan, Faction, GameState, TerritoryId } from "@/lib/game/types";
import type { BattleResult, BattleSideResult } from "@/lib/game/types";
import { getLeaderStrength } from "../strength-calculation";

/**
 * Resolve a battle where a traitor was called.
 *
 * @rule 1.07.06.07 - TRAITORS: When you are in a battle and your opponent uses a leader that matches a Traitor Card in your hand, you may call out "Traitor!" and pause the game. This can be done against any Active Leader your opponent has, even when that leader was not one of their Active Leaders at the start of the game.
 * @rule 1.07.06.07.01 - When a Traitor Card is Revealed the Player who revealed the Traitor Card: immediately wins the battle, loses nothing, regardless of what was played in the Battle Plans (even if a lasgun and shield are Revealed), adds their leader back to their leader pool to be available again this Phase, Places the traitorous leader in the Tleilaxu Tanks, and receives the traitorous leader's fighting strength in spice from the Spice Bank. One time use abilities may be considered not used for this instance (Ex: Kwisatz Haderach, Captured leaders). One time use cards may be kept or discarded by the winner.
 * @rule 1.07.06.07.02 - The Player Whose Traitor Was Revealed: loses all their Forces in the Territory and discards all of the cards they played.
 */
export function resolveTraitorBattle(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan,
  traitorCalledBy: Faction,
  traitorLeaderId: string
): BattleResult {
  const winner = traitorCalledBy;
  const loser = traitorCalledBy === aggressor ? defender : aggressor;
  const loserPlan =
    traitorCalledBy === aggressor ? defenderPlan : aggressorPlan;
  const winnerPlan =
    traitorCalledBy === aggressor ? aggressorPlan : defenderPlan;

  const loserForces = getForceCountInTerritory(state, loser, territoryId);
  const traitorLeader = getLeaderDefinition(traitorLeaderId);

  // Winner loses nothing, loser loses everything
  const winnerResult: BattleSideResult = {
    faction: winner,
    forcesDialed: winnerPlan.forcesDialed,
    forcesLost: 0, // Winner loses nothing
    leaderUsed: winnerPlan.leaderId,
    leaderKilled: false,
    leaderStrength: getLeaderStrength(winnerPlan),
    kwisatzHaderachUsed: winnerPlan.kwisatzHaderachUsed,
    weaponPlayed: winnerPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: winnerPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [], // Winner can keep or discard
    cardsToKeep: [winnerPlan.weaponCardId, winnerPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    total: 0, // Doesn't matter
  };

  const loserResult: BattleSideResult = {
    faction: loser,
    forcesDialed: loserPlan.forcesDialed,
    forcesLost: loserForces, // ALL forces
    leaderUsed: loserPlan.leaderId,
    leaderKilled: true, // Traitor leader is killed
    leaderStrength: 0,
    kwisatzHaderachUsed: false,
    weaponPlayed: loserPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: loserPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [loserPlan.weaponCardId, loserPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  return {
    winner,
    loser,
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: true,
    traitorRevealedBy: traitorCalledBy,
    lasgunjShieldExplosion: false,
    aggressorResult: traitorCalledBy === aggressor ? winnerResult : loserResult,
    defenderResult: traitorCalledBy === defender ? winnerResult : loserResult,
    spicePayouts: [
      {
        faction: winner,
        amount: traitorLeader?.strength ?? 0,
        reason: `Traitor ${traitorLeaderId} revealed`,
      },
    ],
    summary: `TRAITOR! ${winner} reveals ${traitorLeaderId} as traitor. ${loser} loses all forces.`,
  };
}

