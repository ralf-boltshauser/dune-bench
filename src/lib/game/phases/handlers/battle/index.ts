/**
 * Battle Phase Modules
 * 
 * Modular battle phase implementation split into logical components:
 * - identification: Battle detection
 * - aggressor-selection: Aggressor selection and battle choice (with critical fix)
 * - plans: Battle plan creation and utilities
 * - pending-battles: Pending battle management
 */

export * from "./identification";
export * from "./aggressor-selection";
export * from "./plans";
export * from "./pending-battles";

