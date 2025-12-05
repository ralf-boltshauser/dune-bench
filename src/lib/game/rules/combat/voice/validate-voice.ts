/**
 * Voice command validation logic.
 */

import type { BattlePlan, GameState } from "../../../types";
import { createError, type ValidationError } from "../../types";
import { hasCardTypeInHand, planUsesCardType, type CardType } from "./card-type-checker";

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
  voiceCommand: {
    type: "play" | "not_play";
    cardType: string;
    specificCardName?: string;
  } | null
): ValidationError[] {
  if (!voiceCommand) return [];

  const errors: ValidationError[] = [];

  // Parse the cardType from voice command
  const cardType = voiceCommand.cardType as CardType;
  const specificCardName = voiceCommand.specificCardName;

  if (voiceCommand.type === "play") {
    // Must play this type if able
    const hasCardOfType = hasCardTypeInHand(
      state,
      plan.factionId,
      cardType,
      specificCardName
    );
    if (hasCardOfType && !planUsesCardType(plan, cardType, specificCardName)) {
      const cardDescription = specificCardName
        ? `${specificCardName}`
        : cardType.replace(/_/g, " ");
      errors.push(
        createError(
          "VOICE_VIOLATION",
          `Voice commands you to play ${cardDescription}`,
          {
            field:
              cardType.includes("weapon") || cardType === "specific_weapon"
                ? "weaponCardId"
                : cardType.includes("defense") ||
                  cardType === "specific_defense"
                ? "defenseCardId"
                : "cheapHeroUsed",
            suggestion: `You must play ${cardDescription} if you have it`,
          }
        )
      );
    }
  } else if (voiceCommand.type === "not_play") {
    // Must NOT play this type
    if (planUsesCardType(plan, cardType, specificCardName)) {
      const cardDescription = specificCardName
        ? `${specificCardName}`
        : cardType.replace(/_/g, " ");
      errors.push(
        createError(
          "VOICE_VIOLATION",
          `Voice commands you to NOT play ${cardDescription}`,
          {
            field:
              cardType.includes("weapon") || cardType === "specific_weapon"
                ? "weaponCardId"
                : cardType.includes("defense") ||
                  cardType === "specific_defense"
                ? "defenseCardId"
                : "cheapHeroUsed",
            suggestion: `You must NOT play ${cardDescription}`,
          }
        )
      );
    }
  }

  return errors;
}

