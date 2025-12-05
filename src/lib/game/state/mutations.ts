/**
 * State mutation functions.
 * All state changes go through these functions for consistency.
 * Each function returns a new state (immutable updates).
 * 
 * This file now acts as a barrel file, re-exporting all mutations from
 * category-based modules in the mutations/ subdirectory.
 */

// Re-export all mutations from category-based modules
export * from './mutations/index';
