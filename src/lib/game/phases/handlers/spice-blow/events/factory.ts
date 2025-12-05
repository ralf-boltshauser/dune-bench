import { Faction, TerritoryId, type GameState } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type DeckType, type Location } from "../types";
import { EVENT_MESSAGES } from "../constants";

/**
 * Event Factory for Spice Blow Phase
 * 
 * Single source of truth for all event creation.
 * Ensures consistent event structure and data.
 */

export const SpiceBlowEvents = {
  /**
   * Emitted when a spice card is revealed
   */
  cardRevealed: (
    cardName: string,
    cardType: string,
    deck: DeckType,
    inStorm?: boolean
  ): PhaseEvent => ({
    type: "SPICE_CARD_REVEALED",
    data: {
      card: cardName,
      type: cardType,
      deck,
      ...(inStorm !== undefined && { inStorm }),
    },
    message: EVENT_MESSAGES.CARD_REVEALED(cardName, deck),
  }),

  /**
   * Emitted when spice is placed on a territory
   */
  spicePlaced: (
    territory: TerritoryId,
    sector: number,
    amount: number
  ): PhaseEvent => ({
    type: "SPICE_PLACED",
    data: { territory, sector, amount },
    message: EVENT_MESSAGES.SPICE_PLACED(amount, territory, sector),
  }),

  /**
   * Emitted when spice is not placed (e.g., in storm)
   */
  spiceNotPlaced: (
    territory: TerritoryId,
    sector: number,
    amount: number,
    reason: string
  ): PhaseEvent => ({
    type: "SPICE_CARD_REVEALED",
    data: { territory, sector, amount, inStorm: true },
    message: EVENT_MESSAGES.SPICE_NOT_PLACED(territory, reason),
  }),

  /**
   * Emitted when Shai-Hulud (sandworm) appears
   */
  shaiHuludAppeared: (
    wormNumber: number,
    ignoredTurnOne?: boolean
  ): PhaseEvent => ({
    type: "SHAI_HULUD_APPEARED",
    data: {
      wormNumber,
      ...(ignoredTurnOne !== undefined && { ignoredTurnOne }),
    },
    message: EVENT_MESSAGES.SHAI_HULUD_APPEARED(ignoredTurnOne),
  }),

  /**
   * Emitted when forces are devoured by sandworm
   */
  forcesDevoured: (
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    count: number
  ): PhaseEvent => ({
    type: "FORCES_DEVOURED",
    data: { faction, territory, sector, count },
    message: EVENT_MESSAGES.FORCES_DEVOURED(faction, count),
  }),

  /**
   * Emitted when Fremen forces are immune to sandworm
   */
  fremenWormImmunity: (
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    count: number
  ): PhaseEvent => ({
    type: "FREMEN_WORM_IMMUNITY",
    data: { faction, territory, sector, count },
    message: EVENT_MESSAGES.FREMEN_WORM_IMMUNITY(count),
  }),

  /**
   * Emitted when Fremen protects an ally from sandworm
   */
  fremenProtectedAlly: (
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    count: number
  ): PhaseEvent => ({
    type: "FREMEN_PROTECTED_ALLY",
    data: { faction, territory, sector, count },
    message: EVENT_MESSAGES.FREMEN_PROTECTED_ALLY(faction, count),
  }),

  /**
   * Emitted when a leader is protected from sandworm
   */
  leaderProtectedFromWorm: (
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    count: number
  ): PhaseEvent => ({
    type: "LEADER_PROTECTED_FROM_WORM",
    data: { faction, territory, sector, count },
    message: EVENT_MESSAGES.LEADER_PROTECTED(faction, count),
  }),

  /**
   * Emitted when spice is destroyed by sandworm
   */
  spiceDestroyedByWorm: (
    territory: TerritoryId,
    sector: number,
    amount: number
  ): PhaseEvent => ({
    type: "SPICE_DESTROYED_BY_WORM",
    data: { territory, sector, amount },
    message: `${amount} spice destroyed by sandworm in ${territory}`,
  }),

  /**
   * Emitted when Nexus starts
   */
  nexusStarted: (): PhaseEvent => ({
    type: "NEXUS_STARTED",
    data: {},
    message: EVENT_MESSAGES.NEXUS_STARTED(),
  }),

  /**
   * Emitted when Nexus ends
   */
  nexusEnded: (): PhaseEvent => ({
    type: "NEXUS_ENDED",
    data: {},
    message: EVENT_MESSAGES.NEXUS_ENDED(),
  }),

  /**
   * Emitted when an alliance is formed
   */
  allianceFormed: (faction1: Faction, faction2: Faction): PhaseEvent => ({
    type: "ALLIANCE_FORMED",
    data: { faction1, faction2 },
    message: EVENT_MESSAGES.ALLIANCE_FORMED(faction1, faction2),
  }),

  /**
   * Emitted when an alliance is broken
   */
  allianceBroken: (faction1: Faction, faction2: Faction): PhaseEvent => ({
    type: "ALLIANCE_BROKEN",
    data: { faction1, faction2 },
    message: EVENT_MESSAGES.ALLIANCE_BROKEN(faction1, faction2),
  }),

  /**
   * Emitted when Shield Wall is destroyed
   */
  shieldWallDestroyed: (): PhaseEvent => ({
    type: "SPICE_CARD_REVEALED",
    data: { shieldWallDestroyed: true },
    message: EVENT_MESSAGES.SHIELD_WALL_DESTROYED(),
  }),

  /**
   * Emitted when Fremen rides the worm
   */
  fremenRodeWorm: (): PhaseEvent => ({
    type: "SPICE_CARD_REVEALED",
    data: { fremenRode: true },
    message: EVENT_MESSAGES.FREMEN_RODE_WORM(),
  }),
};

