/**
 * Force validation logic.
 */

import { createError, type ValidationError } from "../../types";

/**
 * Validate forces dialed in battle plan.
 * @rule 1.07.04.02 - BATTLE WHEEL: Each player picks up a Battle Wheel and secretly dials a number from zero to the number of Forces they have in the disputed Territory. Both players will lose the number of Forces dialed on their Battle Wheel.
 */
export function validateForcesDialed(
  plan: { forcesDialed: number },
  forcesInTerritory: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (plan.forcesDialed < 0) {
    errors.push(
      createError(
        "FORCES_DIALED_EXCEEDS_AVAILABLE",
        "Forces dialed cannot be negative",
        {
          field: "forcesDialed",
          actual: plan.forcesDialed,
          expected: ">= 0",
        }
      )
    );
  } else if (plan.forcesDialed > forcesInTerritory) {
    errors.push(
      createError(
        "FORCES_DIALED_EXCEEDS_AVAILABLE",
        `Cannot dial ${plan.forcesDialed} forces, only ${forcesInTerritory} in territory`,
        {
          field: "forcesDialed",
          actual: plan.forcesDialed,
          expected: `0-${forcesInTerritory}`,
          suggestion: `Dial ${forcesInTerritory} forces (maximum available)`,
        }
      )
    );
  }
  // Note: 0 forces is a valid play - players can choose to dial 0 forces if they want

  return errors;
}

