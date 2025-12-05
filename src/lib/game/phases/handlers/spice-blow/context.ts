import { type SpiceBlowContext } from "./types";

// Re-export for convenience
export type { SpiceBlowContext } from "./types";

// Re-export context helpers
export {
  withContext,
  extractContext,
  updateContext,
} from "./context/helpers";

/**
 * Create initial context with default values
 */
export function createInitialContext(): SpiceBlowContext {
  return {
    cardARevealed: false,
    cardBRevealed: false,
    lastSpiceLocation: null,
    shaiHuludCount: 0,
    nexusTriggered: false,
    nexusResolved: false,
    fremenWormChoice: null,
    factionsActedInNexus: new Set(),
    turnOneWormsSetAside: [],
    fremenProtectionDecision: null,
    pendingDevourLocation: null,
    pendingDevourDeck: null,
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };
}

/**
 * Reset context to initial state
 */
export function resetContext(): SpiceBlowContext {
  return createInitialContext();
}

