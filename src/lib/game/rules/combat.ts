/**
 * Combat validation and resolution rules.
 * Handles battle plan validation, weapon/defense matching, and winner determination.
 */

import {
  Faction,
  TerritoryId,
  TreacheryCardType,
  LeaderLocation,
  type GameState,
  type BattlePlan,
  type Leader,
  type TreacheryCard,
} from '../types';
import {
  getFactionState,
  getForceCountInTerritory,
  getAvailableLeaders,
  hasAvailableLeaders,
  hasCheapHero,
  getWeaponCards,
  getDefenseCards,
} from '../state';
import {
  getTreacheryCardDefinition,
  getLeaderDefinition,
  isWeaponCard,
  isDefenseCard,
  isCheapHero,
  isWorthless,
  GAME_CONSTANTS,
} from '../data';
import {
  type ValidationResult,
  type ValidationError,
  type BattleResult,
  type BattleSideResult,
  validResult,
  invalidResult,
  createError,
} from './types';

// =============================================================================
// BATTLE PLAN VALIDATION
// =============================================================================

export interface BattlePlanSuggestion {
  forcesDialed: number;
  leaderId: string | null;
  weaponCardId: string | null;
  defenseCardId: string | null;
  estimatedStrength: number;
  description: string;
}

/**
 * Validate a battle plan before submission.
 * Ensures all components are legal and available.
 */
export function validateBattlePlan(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  plan: BattlePlan
): ValidationResult<BattlePlanSuggestion> {
  const errors: ValidationError[] = [];
  const factionState = getFactionState(state, faction);
  const forcesInTerritory = getForceCountInTerritory(state, faction, territoryId);
  const availableLeaders = getAvailableLeaders(state, faction);
  const hasLeaders = availableLeaders.length > 0;
  const hasCheapHeroCard = hasCheapHero(state, faction);

  const context = {
    forcesInTerritory,
    availableLeaders: availableLeaders.map((l) => ({
      id: l.definitionId,
      strength: l.strength,
    })),
    hasLeaders,
    hasCheapHero: hasCheapHeroCard,
    weaponCardsInHand: getWeaponCards(state, faction).length,
    defenseCardsInHand: getDefenseCards(state, faction).length,
  };

  // Check: Forces dialed
  if (plan.forcesDialed < 0) {
    errors.push(
      createError('FORCES_DIALED_EXCEEDS_AVAILABLE', 'Forces dialed cannot be negative', {
        field: 'forcesDialed',
        actual: plan.forcesDialed,
        expected: '>= 0',
      })
    );
  } else if (plan.forcesDialed > forcesInTerritory) {
    errors.push(
      createError(
        'FORCES_DIALED_EXCEEDS_AVAILABLE',
        `Cannot dial ${plan.forcesDialed} forces, only ${forcesInTerritory} in territory`,
        {
          field: 'forcesDialed',
          actual: plan.forcesDialed,
          expected: `0-${forcesInTerritory}`,
          suggestion: `Dial ${forcesInTerritory} forces (maximum available)`,
        }
      )
    );
  }

  // Check: Leader or Cheap Hero requirement
  if (!plan.leaderId && !plan.cheapHeroUsed) {
    if (hasLeaders || hasCheapHeroCard) {
      errors.push(
        createError(
          'MUST_PLAY_LEADER_OR_CHEAP_HERO',
          'You must play a leader or Cheap Hero card if available',
          {
            suggestion: hasLeaders
              ? `Play ${availableLeaders[0].definitionId}`
              : 'Play your Cheap Hero card',
          }
        )
      );
    }
    // If no leaders AND no cheap hero, that's legal - just can't play treachery
  }

  // Check: Leader validity
  if (plan.leaderId) {
    const leader = factionState.leaders.find((l) => l.definitionId === plan.leaderId);
    if (!leader) {
      errors.push(
        createError('LEADER_NOT_IN_POOL', `Leader ${plan.leaderId} not found`, {
          field: 'leaderId',
          suggestion: `Choose from: ${availableLeaders.map((l) => l.definitionId).join(', ')}`,
        })
      );
    } else if (leader.location === LeaderLocation.ON_BOARD) {
      // DEDICATED LEADER: Leaders ON_BOARD can fight multiple times in SAME territory
      if (leader.usedThisTurn && leader.usedInTerritoryId !== territoryId) {
        errors.push(
          createError(
            'LEADER_ALREADY_USED',
            `${plan.leaderId} already fought in another territory this turn`,
            {
              field: 'leaderId',
              suggestion: `Choose from: ${availableLeaders.map((l) => l.definitionId).join(', ')}`,
            }
          )
        );
      }
      // If usedInTerritoryId === territoryId, allow it (fighting again in same territory)
    } else {
      // Leader is in TANKS, CAPTURED, or other unavailable location
      errors.push(
        createError(
          'LEADER_NOT_IN_POOL',
          `${plan.leaderId} is not available (in tanks or captured)`,
          {
            field: 'leaderId',
            actual: leader.location,
            expected: LeaderLocation.LEADER_POOL,
          }
        )
      );
    }
  }

  // Check: Cheap Hero card
  if (plan.cheapHeroUsed && !hasCheapHeroCard) {
    errors.push(
      createError('CARD_NOT_IN_HAND', 'You do not have a Cheap Hero card', {
        field: 'cheapHeroUsed',
      })
    );
  }

  // Check: Cannot use both leader and cheap hero
  if (plan.leaderId && plan.cheapHeroUsed) {
    errors.push(
      createError(
        'MUST_PLAY_LEADER_OR_CHEAP_HERO',
        'Cannot play both a leader and Cheap Hero - choose one',
        { suggestion: 'Remove either leaderId or set cheapHeroUsed to false' }
      )
    );
  }

  // Check: Treachery cards require leader or cheap hero
  const hasLeaderOrHero = plan.leaderId || plan.cheapHeroUsed;
  if (!hasLeaderOrHero && (plan.weaponCardId || plan.defenseCardId)) {
    errors.push(
      createError(
        'CANNOT_PLAY_TREACHERY_WITHOUT_LEADER',
        'Cannot play weapon or defense cards without a leader or Cheap Hero',
        { suggestion: 'Add a leader or Cheap Hero to your battle plan' }
      )
    );
  }

  // Check: Weapon card validity
  if (plan.weaponCardId) {
    const weaponError = validateTreacheryCard(
      factionState.hand,
      plan.weaponCardId,
      'weapon',
      'weaponCardId'
    );
    if (weaponError) errors.push(weaponError);
  }

  // Check: Defense card validity
  if (plan.defenseCardId) {
    const defenseError = validateTreacheryCard(
      factionState.hand,
      plan.defenseCardId,
      'defense',
      'defenseCardId'
    );
    if (defenseError) errors.push(defenseError);
  }

  // Check: Same card used twice
  if (plan.weaponCardId && plan.weaponCardId === plan.defenseCardId) {
    errors.push(
      createError(
        'CARD_NOT_IN_HAND',
        'Cannot use the same card as both weapon and defense',
        { field: 'defenseCardId' }
      )
    );
  }

  // Check: Kwisatz Haderach usage (Atreides only)
  if (plan.kwisatzHaderachUsed) {
    if (faction !== Faction.ATREIDES) {
      errors.push(
        createError(
          'ABILITY_NOT_AVAILABLE',
          'Only Atreides can use the Kwisatz Haderach',
          { field: 'kwisatzHaderachUsed' }
        )
      );
    } else {
      const kh = factionState.kwisatzHaderach;
      if (!kh) {
        errors.push(
          createError(
            'ABILITY_NOT_AVAILABLE',
            'Kwisatz Haderach not initialized',
            { field: 'kwisatzHaderachUsed' }
          )
        );
      } else if (!kh.isActive) {
        errors.push(
          createError(
            'KH_NOT_ACTIVE',
            'Kwisatz Haderach is not active yet (need 7+ forces lost)',
            {
              field: 'kwisatzHaderachUsed',
              actual: kh.forcesLostCount,
              expected: '7+',
            }
          )
        );
      } else if (kh.isDead) {
        errors.push(
          createError(
            'KH_NOT_ACTIVE',
            'Kwisatz Haderach is dead',
            { field: 'kwisatzHaderachUsed' }
          )
        );
      } else if (kh.usedInTerritoryThisTurn && kh.usedInTerritoryThisTurn !== territoryId) {
        errors.push(
          createError(
            'KH_ALREADY_USED',
            `Kwisatz Haderach already used in ${kh.usedInTerritoryThisTurn} this turn`,
            {
              field: 'kwisatzHaderachUsed',
              suggestion: 'Can only use Kwisatz Haderach once per turn',
            }
          )
        );
      }
      // If usedInTerritoryThisTurn === territoryId, allow it (re-battle in same territory)
    }
  }

  if (errors.length === 0) {
    const leaderStrength = plan.leaderId
      ? (getLeaderDefinition(plan.leaderId)?.strength ?? 0)
      : 0;
    return validResult({
      ...context,
      estimatedStrength: plan.forcesDialed + leaderStrength,
    });
  }

  // Generate suggestions
  const suggestions = generateBattlePlanSuggestions(
    state,
    faction,
    forcesInTerritory,
    availableLeaders
  );

  return invalidResult(errors, context, suggestions);
}

/**
 * Validate a treachery card for battle use.
 */
function validateTreacheryCard(
  hand: TreacheryCard[],
  cardId: string,
  expectedType: 'weapon' | 'defense',
  field: string
): ValidationError | null {
  const card = hand.find((c) => c.definitionId === cardId);

  if (!card) {
    return createError('CARD_NOT_IN_HAND', `Card ${cardId} is not in your hand`, {
      field,
    });
  }

  const def = getTreacheryCardDefinition(cardId);
  if (!def) {
    return createError('CARD_NOT_IN_HAND', `Unknown card ${cardId}`, { field });
  }

  // Check card type matches expected
  if (expectedType === 'weapon') {
    if (!isWeaponCard(def) && !isWorthless(def)) {
      return createError(
        'INVALID_WEAPON_CARD',
        `${def.name} cannot be played as a weapon`,
        {
          field,
          actual: def.type,
          expected: 'Weapon or Worthless card',
        }
      );
    }
  } else {
    if (!isDefenseCard(def) && !isWorthless(def)) {
      return createError(
        'INVALID_DEFENSE_CARD',
        `${def.name} cannot be played as a defense`,
        {
          field,
          actual: def.type,
          expected: 'Defense or Worthless card',
        }
      );
    }
  }

  return null;
}

/**
 * Generate battle plan suggestions for the agent.
 */
function generateBattlePlanSuggestions(
  state: GameState,
  faction: Faction,
  forcesAvailable: number,
  leaders: Leader[]
): BattlePlanSuggestion[] {
  const suggestions: BattlePlanSuggestion[] = [];
  const factionState = getFactionState(state, faction);
  const weapons = getWeaponCards(state, faction);
  const defenses = getDefenseCards(state, faction);

  // Best leader + max forces
  if (leaders.length > 0) {
    const bestLeader = leaders.reduce((a, b) => (a.strength > b.strength ? a : b));
    suggestions.push({
      forcesDialed: forcesAvailable,
      leaderId: bestLeader.definitionId,
      weaponCardId: weapons[0]?.definitionId ?? null,
      defenseCardId: defenses[0]?.definitionId ?? null,
      estimatedStrength: forcesAvailable + bestLeader.strength,
      description: `Aggressive: ${bestLeader.definitionId} with ${forcesAvailable} forces`,
    });

    // Conservative - dial fewer forces
    if (forcesAvailable > 2) {
      const conservativeForces = Math.ceil(forcesAvailable / 2);
      suggestions.push({
        forcesDialed: conservativeForces,
        leaderId: bestLeader.definitionId,
        weaponCardId: weapons[0]?.definitionId ?? null,
        defenseCardId: defenses[0]?.definitionId ?? null,
        estimatedStrength: conservativeForces + bestLeader.strength,
        description: `Conservative: ${bestLeader.definitionId} with ${conservativeForces} forces`,
      });
    }
  }

  // Cheap hero fallback
  if (hasCheapHero(state, faction) && leaders.length === 0) {
    suggestions.push({
      forcesDialed: forcesAvailable,
      leaderId: null,
      weaponCardId: weapons[0]?.definitionId ?? null,
      defenseCardId: defenses[0]?.definitionId ?? null,
      estimatedStrength: forcesAvailable,
      description: `Cheap Hero with ${forcesAvailable} forces`,
    });
  }

  return suggestions;
}

// =============================================================================
// BATTLE RESOLUTION
// =============================================================================

/**
 * Resolve a complete battle between two factions.
 * Returns detailed results including winner, casualties, and card effects.
 */
export function resolveBattle(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan,
  traitorCalledBy: Faction | null = null,
  traitorTarget: string | null = null
): BattleResult {
  // Check for traitor first - this overrides everything
  if (traitorCalledBy && traitorTarget) {
    return resolveTraitorBattle(
      state,
      territoryId,
      aggressor,
      defender,
      aggressorPlan,
      defenderPlan,
      traitorCalledBy,
      traitorTarget
    );
  }

  // Resolve weapon/defense for each side
  const aggressorWeaponResult = resolveWeaponDefense(
    aggressorPlan.weaponCardId,
    defenderPlan.defenseCardId,
    defenderPlan.leaderId
  );
  const defenderWeaponResult = resolveWeaponDefense(
    defenderPlan.weaponCardId,
    aggressorPlan.defenseCardId,
    aggressorPlan.leaderId
  );

  // Check for lasgun/shield explosion
  const explosion = checkLasgunShieldExplosion(aggressorPlan, defenderPlan);
  if (explosion) {
    return resolveLasgunShieldExplosion(
      state,
      territoryId,
      aggressor,
      defender,
      aggressorPlan,
      defenderPlan
    );
  }

  // Calculate totals
  const aggressorLeaderStrength = aggressorWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(aggressorPlan);
  const defenderLeaderStrength = defenderWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(defenderPlan);

  // Calculate effective force strength (accounts for elite forces worth 2x)
  const aggressorForceStrength = calculateForcesDialedStrength(
    state,
    aggressor,
    territoryId,
    aggressorPlan.forcesDialed,
    defender
  );
  const defenderForceStrength = calculateForcesDialedStrength(
    state,
    defender,
    territoryId,
    defenderPlan.forcesDialed,
    aggressor
  );

  const aggressorTotal = aggressorForceStrength + aggressorLeaderStrength +
    (aggressorPlan.kwisatzHaderachUsed && !aggressorWeaponResult.leaderKilled ? 2 : 0);
  const defenderTotal = defenderForceStrength + defenderLeaderStrength;

  // Determine winner (aggressor wins ties)
  const aggressorWins = aggressorTotal >= defenderTotal;
  const winner = aggressorWins ? aggressor : defender;
  const loser = aggressorWins ? defender : aggressor;

  // Build results
  const aggressorResult = buildSideResult(
    aggressor,
    aggressorPlan,
    aggressorWeaponResult,
    defenderWeaponResult,
    aggressorWins,
    aggressorTotal
  );
  const defenderResult = buildSideResult(
    defender,
    defenderPlan,
    defenderWeaponResult,
    aggressorWeaponResult,
    !aggressorWins,
    defenderTotal
  );

  // Calculate spice payouts for killed leaders
  const spicePayouts = calculateLeaderSpicePayouts(
    aggressorResult,
    defenderResult,
    winner
  );

  return {
    winner,
    loser,
    winnerTotal: aggressorWins ? aggressorTotal : defenderTotal,
    loserTotal: aggressorWins ? defenderTotal : aggressorTotal,
    traitorRevealed: false,
    traitorRevealedBy: null,
    lasgunjShieldExplosion: false,
    aggressorResult,
    defenderResult,
    spicePayouts,
    summary: `${winner} defeats ${loser} (${aggressorWins ? aggressorTotal : defenderTotal} vs ${aggressorWins ? defenderTotal : aggressorTotal})`,
  };
}

/**
 * Get leader strength from a battle plan.
 */
function getLeaderStrength(plan: BattlePlan): number {
  if (plan.cheapHeroUsed) return 0;
  if (!plan.leaderId) return 0;
  return getLeaderDefinition(plan.leaderId)?.strength ?? 0;
}

/**
 * Calculate effective battle strength for forces dialed.
 * Elite forces (Sardaukar/Fedaykin) count as 2x in battle, except Sardaukar vs Fremen.
 *
 * Assumes elite forces are dialed first (they're more valuable), then regular forces.
 */
function calculateForcesDialedStrength(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  forcesDialed: number,
  opponentFaction: Faction
): number {
  // Get the force stack in this territory
  const forceStack = state.factions.get(faction)?.forces.onBoard.find(
    (f) => f.territoryId === territoryId
  );

  if (!forceStack || forcesDialed === 0) return forcesDialed;

  const { elite } = forceStack.forces;

  // If no elite forces, all dialed forces are regular (1x each)
  if (elite === 0) return forcesDialed;

  // Assume elite forces are dialed first
  const eliteDialed = Math.min(forcesDialed, elite);
  const regularDialed = forcesDialed - eliteDialed;

  // Check for special case: Emperor Sardaukar vs Fremen (only worth 1x)
  const isSardaukarVsFremen = faction === Faction.EMPEROR && opponentFaction === Faction.FREMEN;
  const eliteMultiplier = isSardaukarVsFremen ? 1 : 2;

  return regularDialed + (eliteDialed * eliteMultiplier);
}

/**
 * Resolve weapon vs defense interaction.
 */
interface WeaponDefenseResult {
  leaderKilled: boolean;
  weaponEffective: boolean;
  defenseEffective: boolean;
}

function resolveWeaponDefense(
  weaponCardId: string | null,
  defenseCardId: string | null,
  targetLeaderId: string | null
): WeaponDefenseResult {
  if (!weaponCardId || !targetLeaderId) {
    return { leaderKilled: false, weaponEffective: false, defenseEffective: false };
  }

  const weapon = getTreacheryCardDefinition(weaponCardId);
  const defense = defenseCardId ? getTreacheryCardDefinition(defenseCardId) : null;

  if (!weapon || isWorthless(weapon)) {
    return { leaderKilled: false, weaponEffective: false, defenseEffective: false };
  }

  // Lasgun has no defense (except causes explosion with shield)
  if (weapon.type === TreacheryCardType.WEAPON_SPECIAL) {
    return { leaderKilled: true, weaponEffective: true, defenseEffective: false };
  }

  // Check if defense matches weapon type
  // Special case: Ellaca Drug is a poison weapon but defended by projectile defense
  const isEllacaDrug = weaponCardId === 'ellaca_drug';
  const isProjectileWeapon = weapon.type === TreacheryCardType.WEAPON_PROJECTILE || isEllacaDrug;
  const isPoisonWeapon = weapon.type === TreacheryCardType.WEAPON_POISON && !isEllacaDrug;

  let defenseEffective = false;
  if (defense && !isWorthless(defense)) {
    if (isProjectileWeapon && defense.type === TreacheryCardType.DEFENSE_PROJECTILE) {
      defenseEffective = true;
    }
    if (isPoisonWeapon && defense.type === TreacheryCardType.DEFENSE_POISON) {
      defenseEffective = true;
    }
  }

  return {
    leaderKilled: !defenseEffective,
    weaponEffective: !defenseEffective,
    defenseEffective,
  };
}

/**
 * Check for lasgun/shield explosion.
 */
function checkLasgunShieldExplosion(plan1: BattlePlan, plan2: BattlePlan): boolean {
  const hasLasgun = (id: string | null): boolean =>
    !!id && getTreacheryCardDefinition(id)?.type === TreacheryCardType.WEAPON_SPECIAL;
  const hasShield = (id: string | null): boolean =>
    !!id && getTreacheryCardDefinition(id)?.type === TreacheryCardType.DEFENSE_PROJECTILE;

  // Lasgun + any shield in the battle = explosion
  const lasgunPresent = hasLasgun(plan1.weaponCardId) || hasLasgun(plan2.weaponCardId);
  const shieldPresent =
    hasShield(plan1.defenseCardId) ||
    hasShield(plan2.defenseCardId);

  return lasgunPresent && shieldPresent;
}

/**
 * Resolve a lasgun/shield explosion - both sides lose everything.
 */
function resolveLasgunShieldExplosion(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan
): BattleResult {
  const aggressorForces = getForceCountInTerritory(state, aggressor, territoryId);
  const defenderForces = getForceCountInTerritory(state, defender, territoryId);

  const aggressorResult: BattleSideResult = {
    faction: aggressor,
    forcesDialed: aggressorPlan.forcesDialed,
    forcesLost: aggressorForces, // ALL forces lost
    leaderUsed: aggressorPlan.leaderId,
    leaderKilled: !!aggressorPlan.leaderId,
    leaderStrength: 0,
    kwisatzHaderachUsed: aggressorPlan.kwisatzHaderachUsed,
    weaponPlayed: aggressorPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: aggressorPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [aggressorPlan.weaponCardId, aggressorPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  const defenderResult: BattleSideResult = {
    faction: defender,
    forcesDialed: defenderPlan.forcesDialed,
    forcesLost: defenderForces, // ALL forces lost
    leaderUsed: defenderPlan.leaderId,
    leaderKilled: !!defenderPlan.leaderId,
    leaderStrength: 0,
    kwisatzHaderachUsed: false,
    weaponPlayed: defenderPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: defenderPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [defenderPlan.weaponCardId, defenderPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  return {
    winner: aggressor, // Technically no winner, but aggressor listed
    loser: defender,
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: false,
    traitorRevealedBy: null,
    lasgunjShieldExplosion: true,
    aggressorResult,
    defenderResult,
    spicePayouts: [], // No spice paid for leaders in explosion
    summary: 'LASGUN/SHIELD EXPLOSION! Both sides lose all forces and leaders. No spice paid.',
  };
}

/**
 * Resolve a battle where a traitor was called.
 */
function resolveTraitorBattle(
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
  const loserPlan = traitorCalledBy === aggressor ? defenderPlan : aggressorPlan;
  const winnerPlan = traitorCalledBy === aggressor ? aggressorPlan : defenderPlan;

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

/**
 * Resolve a battle where BOTH leaders are traitors (TWO TRAITORS rule).
 * Both players lose everything, neither receives spice.
 *
 * Rule from battle.md line 29:
 * "When both leaders are traitors (each a traitor for the opponent), both players'
 * Forces in the Territory, their cards played, and their leaders, are lost.
 * Neither player receives any spice."
 */
export function resolveTwoTraitorsBattle(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan
): BattleResult {
  const aggressorForces = getForceCountInTerritory(state, aggressor, territoryId);
  const defenderForces = getForceCountInTerritory(state, defender, territoryId);

  // Both sides lose ALL forces
  const aggressorResult: BattleSideResult = {
    faction: aggressor,
    forcesDialed: aggressorPlan.forcesDialed,
    forcesLost: aggressorForces, // ALL forces lost
    leaderUsed: aggressorPlan.leaderId,
    leaderKilled: !!aggressorPlan.leaderId, // Both leaders are killed
    leaderStrength: 0,
    kwisatzHaderachUsed: aggressorPlan.kwisatzHaderachUsed,
    weaponPlayed: aggressorPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: aggressorPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [aggressorPlan.weaponCardId, aggressorPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  const defenderResult: BattleSideResult = {
    faction: defender,
    forcesDialed: defenderPlan.forcesDialed,
    forcesLost: defenderForces, // ALL forces lost
    leaderUsed: defenderPlan.leaderId,
    leaderKilled: !!defenderPlan.leaderId, // Both leaders are killed
    leaderStrength: 0,
    kwisatzHaderachUsed: false,
    weaponPlayed: defenderPlan.weaponCardId,
    weaponEffective: false,
    defensePlayed: defenderPlan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [defenderPlan.weaponCardId, defenderPlan.defenseCardId].filter(
      (c): c is string => !!c
    ),
    cardsToKeep: [],
    total: 0,
  };

  return {
    winner: null, // Special case - no winner
    loser: null, // Special case - no loser
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: true,
    traitorRevealedBy: null, // Both revealed, so null
    lasgunjShieldExplosion: false,
    twoTraitors: true, // New flag to indicate TWO TRAITORS scenario
    aggressorResult,
    defenderResult,
    spicePayouts: [], // NO spice for anyone
    summary: 'TWO TRAITORS! Both leaders are traitors. Both sides lose all forces and leaders. No spice paid.',
  };
}

/**
 * Build the result for one side of the battle.
 */
function buildSideResult(
  faction: Faction,
  plan: BattlePlan,
  myWeaponResult: WeaponDefenseResult,
  opponentWeaponResult: WeaponDefenseResult,
  isWinner: boolean,
  total: number
): BattleSideResult {
  const leaderKilled = opponentWeaponResult.leaderKilled;
  const forcesLost = isWinner ? plan.forcesDialed : getForceCountForLoss(plan);

  // Determine which cards to keep/discard
  const cardsToDiscard: string[] = [];
  const cardsToKeep: string[] = [];

  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (!isWinner || weaponDef?.discardAfterUse) {
      cardsToDiscard.push(plan.weaponCardId);
    } else {
      cardsToKeep.push(plan.weaponCardId);
    }
  }

  if (plan.defenseCardId) {
    const defenseDef = getTreacheryCardDefinition(plan.defenseCardId);
    if (!isWinner || defenseDef?.discardAfterUse) {
      cardsToDiscard.push(plan.defenseCardId);
    } else {
      cardsToKeep.push(plan.defenseCardId);
    }
  }

  return {
    faction,
    forcesDialed: plan.forcesDialed,
    forcesLost,
    leaderUsed: plan.leaderId,
    leaderKilled,
    leaderStrength: leaderKilled ? 0 : getLeaderStrength(plan),
    kwisatzHaderachUsed: plan.kwisatzHaderachUsed,
    weaponPlayed: plan.weaponCardId,
    weaponEffective: myWeaponResult.weaponEffective,
    defensePlayed: plan.defenseCardId,
    defenseEffective: opponentWeaponResult.defenseEffective,
    cardsToDiscard,
    cardsToKeep,
    total,
  };
}

/**
 * Get force count for a losing side (all forces in territory).
 * Note: This is a placeholder - actual implementation needs territory forces.
 */
function getForceCountForLoss(plan: BattlePlan): number {
  // Loser loses all forces in territory
  // This would need the actual territory force count
  return plan.forcesDialed; // Minimum - actual is all forces
}

/**
 * Calculate spice payouts for killed leaders.
 */
function calculateLeaderSpicePayouts(
  aggressorResult: BattleSideResult,
  defenderResult: BattleSideResult,
  winner: Faction
): { faction: Faction; amount: number; reason: string }[] {
  const payouts: { faction: Faction; amount: number; reason: string }[] = [];

  // Winner receives spice for all killed leaders (including their own)
  if (aggressorResult.leaderKilled && aggressorResult.leaderUsed) {
    const leader = getLeaderDefinition(aggressorResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  if (defenderResult.leaderKilled && defenderResult.leaderUsed) {
    const leader = getLeaderDefinition(defenderResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  return payouts;
}

// =============================================================================
// TRAITOR VALIDATION
// =============================================================================

/**
 * Check if a faction can call traitor on an opponent's leader.
 */
export function canCallTraitor(
  state: GameState,
  callingFaction: Faction,
  targetLeaderId: string
): ValidationResult<never> {
  const factionState = getFactionState(state, callingFaction);
  const hasTraitor = factionState.traitors.some(
    (t) => t.leaderId === targetLeaderId
  );

  if (!hasTraitor) {
    return invalidResult(
      [
        createError(
          'ABILITY_NOT_AVAILABLE',
          `You do not have a traitor card for ${targetLeaderId}`,
          { field: 'targetLeaderId' }
        ),
      ],
      { traitorCardsHeld: factionState.traitors.length }
    );
  }

  return validResult({ canCallTraitor: true, targetLeaderId });
}

// =============================================================================
// VOICE COMMAND VALIDATION (Bene Gesserit)
// =============================================================================

/**
 * Check if a faction has a card of a specific type in their hand.
 */
function checkHasCardOfType(
  state: GameState,
  faction: Faction,
  cardType: 'poison_weapon' | 'projectile_weapon' | 'poison_defense' | 'projectile_defense' | 'worthless' | 'cheap_hero'
): boolean {
  const factionState = getFactionState(state, faction);

  for (const card of factionState.hand) {
    const def = getTreacheryCardDefinition(card.definitionId);
    if (!def) continue;

    switch (cardType) {
      case 'poison_weapon':
        if (def.type === TreacheryCardType.WEAPON_POISON) return true;
        break;
      case 'projectile_weapon':
        // Lasgun counts as projectile weapon for Voice purposes
        if (def.type === TreacheryCardType.WEAPON_PROJECTILE || def.type === TreacheryCardType.WEAPON_SPECIAL) return true;
        break;
      case 'poison_defense':
        if (def.type === TreacheryCardType.DEFENSE_POISON) return true;
        break;
      case 'projectile_defense':
        if (def.type === TreacheryCardType.DEFENSE_PROJECTILE) return true;
        break;
      case 'worthless':
        if (isWorthless(def)) return true;
        break;
      case 'cheap_hero':
        if (isCheapHero(def)) return true;
        break;
    }
  }

  return false;
}

/**
 * Check if a battle plan uses a card of a specific type.
 */
function planUsesCardType(
  plan: BattlePlan,
  cardType: 'poison_weapon' | 'projectile_weapon' | 'poison_defense' | 'projectile_defense' | 'worthless' | 'cheap_hero'
): boolean {
  // Check weapon card
  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (weaponDef) {
      switch (cardType) {
        case 'poison_weapon':
          if (weaponDef.type === TreacheryCardType.WEAPON_POISON) return true;
          break;
        case 'projectile_weapon':
          if (weaponDef.type === TreacheryCardType.WEAPON_PROJECTILE || weaponDef.type === TreacheryCardType.WEAPON_SPECIAL) return true;
          break;
        case 'worthless':
          if (isWorthless(weaponDef)) return true;
          break;
      }
    }
  }

  // Check defense card
  if (plan.defenseCardId) {
    const defenseDef = getTreacheryCardDefinition(plan.defenseCardId);
    if (defenseDef) {
      switch (cardType) {
        case 'poison_defense':
          if (defenseDef.type === TreacheryCardType.DEFENSE_POISON) return true;
          break;
        case 'projectile_defense':
          if (defenseDef.type === TreacheryCardType.DEFENSE_PROJECTILE) return true;
          break;
        case 'worthless':
          if (isWorthless(defenseDef)) return true;
          break;
      }
    }
  }

  // Check cheap hero
  if (cardType === 'cheap_hero' && plan.cheapHeroUsed) {
    return true;
  }

  return false;
}

/**
 * Validate that a battle plan complies with a Voice command.
 * Returns errors if the plan violates the Voice command when compliance is possible.
 *
 * Rule from battle.md line 72: "VOICE: ...Your opponent must comply with your command
 * as well as they are able to."
 */
export function validateVoiceCompliance(
  state: GameState,
  plan: BattlePlan,
  voiceCommand: { type: 'play' | 'not_play'; cardType: string } | null
): ValidationError[] {
  if (!voiceCommand) return [];

  const errors: ValidationError[] = [];

  // Parse the cardType from voice command
  const cardType = voiceCommand.cardType as
    'poison_weapon' | 'projectile_weapon' | 'poison_defense' | 'projectile_defense' | 'worthless' | 'cheap_hero';

  if (voiceCommand.type === 'play') {
    // Must play this type if able
    const hasCardOfType = checkHasCardOfType(state, plan.factionId, cardType);
    if (hasCardOfType && !planUsesCardType(plan, cardType)) {
      errors.push(
        createError(
          'VOICE_VIOLATION',
          `Voice commands you to play ${cardType.replace('_', ' ')}`,
          {
            field: cardType.includes('weapon') ? 'weaponCardId' :
                   cardType.includes('defense') ? 'defenseCardId' :
                   'cheapHeroUsed',
            suggestion: `You must play a ${cardType.replace('_', ' ')} card if you have one`,
          }
        )
      );
    }
  } else if (voiceCommand.type === 'not_play') {
    // Must NOT play this type
    if (planUsesCardType(plan, cardType)) {
      errors.push(
        createError(
          'VOICE_VIOLATION',
          `Voice commands you to NOT play ${cardType.replace('_', ' ')}`,
          {
            field: cardType.includes('weapon') ? 'weaponCardId' :
                   cardType.includes('defense') ? 'defenseCardId' :
                   'cheapHeroUsed',
            suggestion: `You must NOT play a ${cardType.replace('_', ' ')} card`,
          }
        )
      );
    }
  }

  return errors;
}
