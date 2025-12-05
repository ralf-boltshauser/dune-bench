/**
 * Battle Phase Modules
 * 
 * Modular battle phase implementation split into logical components:
 * - identification: Battle detection
 * - aggressor-selection: Aggressor selection and battle choice
 * - plans: Battle plan creation and utilities
 * - pending-battles: Pending battle management
 * - initialization: Phase initialization and Universal Stewards
 * - sub-phases: Sub-phase handling (Prescience, Voice, Battle Plans, Reveal, Traitor)
 * - resolution: Battle resolution and result application
 * - post-resolution: Winner card discard and Harkonnen capture
 * - cleanup: Phase cleanup
 * - helpers: Helper functions (Prison Break, End Phase)
 */

export * from "./identification";
export * from "./aggressor-selection";
export * from "./plans";
export * from "./pending-battles";
export * from "./initialization";
export * from "./sub-phases";
export * from "./resolution";
export * from "./post-resolution";
export * from "./cleanup";
export * from "./helpers";
export { BattlePhaseHandler } from "./battle-handler";

