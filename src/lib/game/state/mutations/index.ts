/**
 * Barrel file for all mutation modules.
 * 
 * Re-exports all mutations from category-based modules.
 * All mutations return new immutable state objects and never mutate the input state.
 * 
 * @module mutations
 */

// =============================================================================
// COMMON UTILITIES
// =============================================================================
// Core utilities used by all mutation modules (updateFactionState, logAction)
export * from './common';

// =============================================================================
// PHASE & TURN MUTATIONS
// =============================================================================
// Phase progression, turn advancement, active faction management
export * from './phase';

// =============================================================================
// RESOURCE MUTATIONS
// =============================================================================
// Spice management (treasury and board)
export * from './spice';

// =============================================================================
// FORCE MUTATIONS
// =============================================================================
// General force operations (ship, move, revive, send to tanks/reserves)
export * from './forces';
// Bene Gesserit-specific force type conversions (advisors ↔ fighters)
export * from './forces-bene-gesserit';

// =============================================================================
// LEADER MUTATIONS
// =============================================================================
// General leader lifecycle (kill, revive, mark used, reset turn state)
export * from './leaders';
// Harkonnen-specific leader capture mechanics
export * from './leaders-harkonnen';

// =============================================================================
// CARD MUTATIONS
// =============================================================================
// Treachery card and traitor card management
export * from './cards';

// =============================================================================
// ALLIANCE MUTATIONS
// =============================================================================
// Alliance formation and breaking
export * from './alliances';

// =============================================================================
// STORM MUTATIONS
// =============================================================================
// Storm movement and order management
export * from './storm';

// =============================================================================
// DEAL MUTATIONS
// =============================================================================
// Pending deal management
export * from './deals';

// =============================================================================
// FACTION-SPECIFIC ABILITY MUTATIONS
// =============================================================================
// Atreides Kwisatz Haderach mutations
export * from './kwisatz-haderach';

// =============================================================================
// VICTORY MUTATIONS
// =============================================================================
// Victory condition tracking
export * from './victory';

// =============================================================================
// KARAMA INTERRUPT MUTATIONS
// =============================================================================
// Karama interrupt creation and clearing
// Note: Query functions are in queries.ts
export * from './karama';

