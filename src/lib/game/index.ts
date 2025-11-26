/**
 * Main entry point for the Dune GF9 game library.
 *
 * This library provides:
 * - Type definitions for all game components
 * - Static game data (leaders, cards, territories)
 * - State management (creation, queries, mutations)
 * - Rules validation (movement, combat, revival, bidding, victory)
 *
 * Usage:
 *   import { createGameState, Faction, Phase, validateShipment } from '@/lib/game';
 *
 *   const game = createGameState({
 *     factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
 *   });
 *
 *   const result = validateShipment(game, Faction.ATREIDES, TerritoryId.CARTHAG, 11, 5);
 *   if (result.valid) {
 *     // Apply shipment
 *   } else {
 *     console.log(result.errors); // Agent-friendly error messages
 *     console.log(result.suggestions); // Alternative valid actions
 *   }
 */

// Re-export everything from submodules
export * from './types';
export * from './data';
export * from './state';
export * from './rules';
export * from './phases';
