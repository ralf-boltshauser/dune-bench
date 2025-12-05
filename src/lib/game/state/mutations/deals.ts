/**
 * Deal management mutations.
 */

import { type GameState, type Deal } from '../../types';

/**
 * Add a pending deal.
 */
export function addDeal(state: GameState, deal: Deal): GameState {
  return {
    ...state,
    pendingDeals: [...state.pendingDeals, deal],
  };
}

/**
 * Remove a pending deal (accepted/rejected).
 */
export function removeDeal(state: GameState, dealId: string): GameState {
  const deal = state.pendingDeals.find((d) => d.id === dealId);
  if (!deal) return state;

  return {
    ...state,
    pendingDeals: state.pendingDeals.filter((d) => d.id !== dealId),
    dealHistory: [...state.dealHistory, deal],
  };
}

