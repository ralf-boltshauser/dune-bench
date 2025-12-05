/**
 * Leader and Cheap Hero validation logic.
 */

import { getFactionState } from "../../../state";
import {
  Faction,
  LeaderLocation,
  TerritoryId,
  type BattlePlan,
  type GameState,
  type Leader,
} from "../../../types";
import { createError, type ValidationError } from "../../types";

/**
 * Validate leader or Cheap Hero requirement.
 * @rule 1.07.04.03 - LEADERS: One Leader Disc is selected and put face up in the slot on the wheel. A Cheap Hero Card may be played in lieu of a Leader Disc.
 * @rule 3.01.04
 */
export function validateLeaderOrCheapHero(
  plan: BattlePlan,
  hasLeaders: boolean,
  hasCheapHeroCard: boolean,
  availableLeaders: Leader[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule from battle.md line 12: "A Cheap Hero Card may be played in lieu of a Leader Disc."
  // Rule from battle.md line 14: "A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible."
  if (!plan.leaderId && !plan.cheapHeroUsed) {
    if (hasLeaders || hasCheapHeroCard) {
      // Has leaders OR Cheap Hero available - must play one (player's choice)
      if (hasLeaders && hasCheapHeroCard) {
        errors.push(
          createError(
            "MUST_PLAY_LEADER_OR_CHEAP_HERO",
            "You must play either a leader or Cheap Hero (your choice)",
            {
              field: "leaderId",
              suggestion: `Play ${availableLeaders[0].definitionId} or set cheapHeroUsed to true`,
            }
          )
        );
      } else if (hasLeaders) {
        // Only leaders available - must play a leader
        errors.push(
          createError(
            "MUST_PLAY_LEADER",
            "You must play a leader when you have available leaders",
            {
              field: "leaderId",
              suggestion: `Play ${availableLeaders[0].definitionId}`,
            }
          )
        );
      } else if (hasCheapHeroCard) {
        // Only Cheap Hero available - MUST play it (forced rule)
        errors.push(
          createError(
            "MUST_PLAY_CHEAP_HERO",
            "You must play Cheap Hero when you have no available leaders",
            {
              field: "cheapHeroUsed",
              suggestion: "Set cheapHeroUsed to true",
            }
          )
        );
      }
    } else {
      // @rule 1.07.04.05 - No leaders AND no cheap hero - must announce inability
      // Rule from battle.md line 14: "When it is not possible, a player must
      // announce that they can not play a leader or Cheap Hero."
      if (!plan.announcedNoLeader) {
        errors.push(
          createError(
            "MUST_ANNOUNCE_NO_LEADER",
            "You must announce that you cannot play a leader or Cheap Hero",
            {
              field: "announcedNoLeader",
              suggestion: "Set announcedNoLeader to true",
            }
          )
        );
      }
    }
  }

  return errors;
}

/**
 * Validate leader availability and location.
 *
 * @rule 1.07.04.04 - DEDICATED LEADER: Leaders that survive battles may fight more than once in a single Territory if needed, but no leader may fight in more than one Territory during the same Phase.
 */
export function validateLeaderAvailability(
  plan: BattlePlan,
  factionState: ReturnType<typeof getFactionState>,
  territoryId: TerritoryId,
  availableLeaders: Leader[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!plan.leaderId) return errors;

  const leader = factionState.leaders.find(
    (l) => l.definitionId === plan.leaderId
  );
  if (!leader) {
    errors.push(
      createError("LEADER_NOT_IN_POOL", `Leader ${plan.leaderId} not found`, {
        field: "leaderId",
        suggestion: `Choose from: ${availableLeaders
          .map((l) => l.definitionId)
          .join(", ")}`,
      })
    );
  } else if (leader.location === LeaderLocation.LEADER_POOL) {
    // Leader is in pool - valid for battle
    // No additional checks needed
  } else if (leader.location === LeaderLocation.ON_BOARD) {
    // @rule 1.07.04.04 - DEDICATED LEADER: Leaders ON_BOARD can fight multiple times in SAME territory
    if (leader.usedThisTurn && leader.usedInTerritoryId !== territoryId) {
      errors.push(
        createError(
          "LEADER_ALREADY_USED",
          `${plan.leaderId} already fought in another territory this turn`,
          {
            field: "leaderId",
            suggestion: `Choose from: ${availableLeaders
              .map((l) => l.definitionId)
              .join(", ")}`,
          }
        )
      );
    }
    // If usedInTerritoryId === territoryId, allow it (fighting again in same territory)
  } else {
    // Leader is in TANKS, CAPTURED, or other unavailable location
    errors.push(
      createError(
        "LEADER_NOT_IN_POOL",
        `${plan.leaderId} is not available (in tanks or captured)`,
        {
          field: "leaderId",
          actual: leader.location,
          expected: LeaderLocation.LEADER_POOL,
        }
      )
    );
  }

  return errors;
}

/**
 * Validate Cheap Hero card.
 */
export function validateCheapHero(
  plan: BattlePlan,
  hasCheapHeroCard: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (plan.cheapHeroUsed && !hasCheapHeroCard) {
    errors.push(
      createError("CARD_NOT_IN_HAND", "You do not have a Cheap Hero card", {
        field: "cheapHeroUsed",
      })
    );
  }

  return errors;
}

/**
 * Validate that leader and Cheap Hero are not both used.
 */
export function validateLeaderHeroExclusivity(
  plan: BattlePlan
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (plan.leaderId && plan.cheapHeroUsed) {
    errors.push(
      createError(
        "MUST_PLAY_LEADER_OR_CHEAP_HERO",
        "Cannot play both a leader and Cheap Hero - choose one",
        { suggestion: "Remove either leaderId or set cheapHeroUsed to false" }
      )
    );
  }

  // @rule 1.07.04.06 - NO TREACHERY: Check that treachery cards require leader or cheap hero
  // @rule 1.07.04.07 - TREACHERY CARDS: Players with a leader or Cheap Hero may play a Weapon Treachery Card, Defense Treachery Card, or both
  const hasLeaderOrHero = plan.leaderId || plan.cheapHeroUsed;
  if (!hasLeaderOrHero && (plan.weaponCardId || plan.defenseCardId)) {
    errors.push(
      createError(
        "CANNOT_PLAY_TREACHERY_WITHOUT_LEADER",
        "Cannot play weapon or defense cards without a leader or Cheap Hero",
        { suggestion: "Add a leader or Cheap Hero to your battle plan" }
      )
    );
  }

  return errors;
}

