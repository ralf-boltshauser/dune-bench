/**
 * Combat rules module - public API.
 * Re-exports all public functions and types from combat submodules.
 */

// Types
export type { BattlePlanSuggestion } from "./types";

// Validation
export { validateBattlePlan } from "./validation";
export { validateVoiceCompliance } from "./voice";
export { canCallTraitor } from "./traitor";

// Resolution
export { resolveBattle, resolveTwoTraitorsBattle } from "./resolution";

// Strength calculations (public API)
export { calculateSpicedForceStrength } from "./strength-calculation";

