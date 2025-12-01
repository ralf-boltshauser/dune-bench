/**
 * Custom hook for extracting phase-specific information from game events
 * Processes PHASE_EVENT wrapper events to extract structured data for:
 * - Storm phase: dial results, movement, storm order
 * - Spice blow: revealed cards and placements
 * - CHOAM charity: eligibility and recipients
 * - Bidding: auction history and current auction
 */

import { useMemo } from 'react';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';
import { Faction, Phase } from '@/lib/game/types/enums';
import type { PhaseEventType } from '@/lib/game/phases/types';

// =============================================================================
// TYPES
// =============================================================================

export interface StormInfo {
  from: number;
  to: number;
  movement: number;
  dialResults: Map<Faction, number>;
  stormOrder: Faction[];
}

export interface SpiceBlowCard {
  card: string; // Card name (e.g., 'A' or 'B') or full name
  type: string; // Card type (e.g., 'Territory Card', 'Shai-Hulud')
  territoryId?: string;
  sector?: number;
  amount?: number;
  deck?: 'A' | 'B'; // Which deck the card came from
}

export interface SpiceBlowInfo {
  cards: SpiceBlowCard[];
}

export interface ChoamCharityInfo {
  eligibleFactions: Faction[];
  recipients: Array<{ faction: Faction; amount: number }>;
}

export interface Auction {
  number: number;
  card?: string; // Card name (may be secret/unknown)
  bids: Array<{ faction: Faction; amount: number; timestamp: number }>;
  passes: Faction[];
  winner: Faction | null;
  status: 'active' | 'completed';
}

export interface BiddingInfo {
  auctions: Auction[];
  currentAuction: number | null; // Index of currently active auction, or null if none
}

export interface ShipmentAction {
  faction: Faction;
  from?: string; // Territory ID (for cross-ship or off-planet)
  to?: string; // Territory ID (for cross-ship)
  territory?: string; // Territory ID (for normal shipment)
  sector?: number;
  count: number;
  cost?: number;
  type: 'cross-ship' | 'off-planet' | 'normal' | 'spiritual_advisor';
}

export interface MovementAction {
  faction: Faction;
  from: string; // Territory ID
  fromSector?: number;
  to: string; // Territory ID
  toSector?: number;
  count: number;
}

export interface FactionActions {
  faction: Faction;
  shipments: ShipmentAction[];
  movements: MovementAction[];
}

export interface ShipmentMovementInfo {
  stormOrder: Faction[];
  factionActions: FactionActions[]; // Actions grouped by faction, in order they occurred
}

export interface PhaseInfo {
  stormInfo: StormInfo | null;
  spiceBlowInfo: SpiceBlowInfo | null;
  choamCharityInfo: ChoamCharityInfo | null;
  biddingInfo: BiddingInfo | null;
  shipmentMovementInfo: ShipmentMovementInfo | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Extract phase-specific information from game events
 * Processes events chronologically to build up state over time
 */
export function usePhaseInfo(
  events: StreamEvent[],
  currentPhase: Phase | null,
  stormOrder: Faction[] = []
): PhaseInfo {
  return useMemo(() => {
    // Initialize result structures
    let stormInfo: StormInfo | null = null;
    let spiceBlowInfo: SpiceBlowInfo | null = null;
    let choamCharityInfo: ChoamCharityInfo | null = null;
    let biddingInfo: BiddingInfo | null = null;
    let shipmentMovementInfo: ShipmentMovementInfo | null = null;

    // Temporary state for accumulating data
    const stormDialResults = new Map<Faction, number>();
    const spiceBlowCards: SpiceBlowCard[] = [];
    let choamEligibleFactions: Faction[] = [];
    const choamRecipients: Array<{ faction: Faction; amount: number }> = [];
    const auctions: Auction[] = [];
    let currentAuctionIndex: number | null = null;
    let currentAuction: Auction | null = null;
    let auctionCounter = 0;
    
    // Shipment/Movement tracking
    const factionActionsMap = new Map<Faction, FactionActions>();

    // Process events in chronological order
    for (const event of events) {
      // Only process PHASE_EVENT wrapper events
      if (event.type !== WrapperEvent.PHASE_EVENT) continue;

      const phaseEventData = event.data as {
        event: {
          type: PhaseEventType;
          data: Record<string, unknown>;
          message: string;
        };
      };

      const phaseEvent = phaseEventData.event;

      // =======================================================================
      // STORM PHASE EVENTS
      // =======================================================================
      if (phaseEvent.type === 'STORM_DIAL_REVEALED') {
        const data = phaseEvent.data as { faction: Faction; value: number };
        stormDialResults.set(data.faction, data.value);
      }

      if (phaseEvent.type === 'STORM_MOVED') {
        const data = phaseEvent.data as {
          from: number;
          to: number;
          movement: number;
          sectorsAffected?: number[];
        };

        // Convert dial results Map to a new Map (since Maps are mutable)
        const dialResultsMap = new Map<Faction, number>(stormDialResults);

        stormInfo = {
          from: data.from,
          to: data.to,
          movement: data.movement,
          dialResults: dialResultsMap,
          stormOrder: stormOrder.length > 0 ? [...stormOrder] : [],
        };

        // Clear dial results after storm moves (they're specific to this movement)
        stormDialResults.clear();
      }

      // =======================================================================
      // SPICE BLOW PHASE EVENTS
      // =======================================================================
      if (phaseEvent.type === 'SPICE_CARD_REVEALED') {
        const data = phaseEvent.data as {
          card?: string;
          type?: string;
          deck?: 'A' | 'B';
          territory?: string;
          sector?: number;
          amount?: number;
          inStorm?: boolean;
        };

        // Track card reveal - we'll add full details when SPICE_PLACED is received
        // Only track Territory Cards (not Shai-Hulud) that aren't in storm
        if (data.type && data.type !== 'Shai-Hulud' && !data.inStorm) {
          // Store as a placeholder - will be filled in by SPICE_PLACED
          // Use deck type as card identifier if card name not available
          const cardIdentifier = data.card || (data.deck || 'Unknown');
          spiceBlowCards.push({
            card: cardIdentifier,
            type: data.type,
            deck: data.deck,
            // territoryId, sector, amount will be set by SPICE_PLACED
          });
        }
      }

      if (phaseEvent.type === 'SPICE_PLACED') {
        const data = phaseEvent.data as {
          territory: string;
          sector: number;
          amount: number;
        };

        // Find the most recent card without placement info and update it
        // (Cards are processed in order, so the last incomplete card is the one being placed)
        let found = false;
        for (let i = spiceBlowCards.length - 1; i >= 0; i--) {
          const card = spiceBlowCards[i];
          if (card && !card.territoryId) {
            // Update this card with placement info
            spiceBlowCards[i] = {
              ...card,
              territoryId: data.territory,
              sector: data.sector,
              amount: data.amount,
            };
            found = true;
            break;
          }
        }

        // If no incomplete card found, create a new entry
        if (!found) {
          spiceBlowCards.push({
            card: 'Unknown',
            type: 'Territory Card',
            territoryId: data.territory,
            sector: data.sector,
            amount: data.amount,
          });
        }
      }

      // Initialize spice blow info if we have any cards
      if (spiceBlowCards.length > 0) {
        spiceBlowInfo = {
          cards: [...spiceBlowCards],
        };
      }

      // =======================================================================
      // CHOAM CHARITY PHASE EVENTS
      // =======================================================================
      if (phaseEvent.type === 'CHOAM_ELIGIBLE') {
        const data = phaseEvent.data as { eligibleFactions: Faction[] };
        choamEligibleFactions = Array.isArray(data.eligibleFactions)
          ? [...data.eligibleFactions]
          : [];
      }

      if (phaseEvent.type === 'CHARITY_CLAIMED') {
        const data = phaseEvent.data as {
          faction: Faction;
          amount: number;
          newTotal?: number;
        };

        choamRecipients.push({
          faction: data.faction,
          amount: data.amount,
        });
      }

      // Initialize CHOAM charity info if we have data
      if (choamEligibleFactions.length > 0 || choamRecipients.length > 0) {
        choamCharityInfo = {
          eligibleFactions: [...choamEligibleFactions],
          recipients: [...choamRecipients],
        };
      }

      // =======================================================================
      // BIDDING PHASE EVENTS
      // =======================================================================
      if (phaseEvent.type === 'AUCTION_STARTED') {
        // If we have an active auction, mark it as completed first
        if (currentAuction) {
          currentAuction.status = 'completed';
          auctions.push(currentAuction);
        }

        // Start new auction
        auctionCounter++;
        currentAuction = {
          number: auctionCounter,
          bids: [],
          passes: [],
          winner: null,
          status: 'active',
        };

        currentAuctionIndex = auctions.length; // Will be the index after we push
      }

      if (phaseEvent.type === 'BID_PLACED' && currentAuction) {
        const data = phaseEvent.data as { faction: Faction; amount: number };
        currentAuction.bids.push({
          faction: data.faction,
          amount: data.amount,
          timestamp: event.timestamp, // Use event timestamp
        });
      }

      if (phaseEvent.type === 'BID_PASSED' && currentAuction) {
        const data = phaseEvent.data as { faction: Faction };
        if (!currentAuction.passes.includes(data.faction)) {
          currentAuction.passes.push(data.faction);
        }
      }

      if (phaseEvent.type === 'CARD_WON' && currentAuction) {
        const data = phaseEvent.data as {
          winner: Faction;
          amount: number;
          cardIndex?: number;
        };
        currentAuction.winner = data.winner;
        currentAuction.status = 'completed';
        auctions.push(currentAuction);
        currentAuction = null;
        currentAuctionIndex = null;
      }

      if (phaseEvent.type === 'BIDDING_COMPLETE') {
        // Mark any active auction as completed
        if (currentAuction) {
          currentAuction.status = 'completed';
          auctions.push(currentAuction);
          currentAuction = null;
          currentAuctionIndex = null;
        }

        // Initialize bidding info
        biddingInfo = {
          auctions: [...auctions],
          currentAuction: null,
        };
      }

      // =======================================================================
      // SHIPMENT & MOVEMENT PHASE EVENTS
      // =======================================================================
      if (phaseEvent.type === 'FORCES_SHIPPED') {
        const data = phaseEvent.data as {
          faction: Faction;
          from?: string;
          to?: string;
          territory?: string;
          sector?: number;
          count: number;
          cost?: number;
          reason?: string;
        };

        // Get or create faction actions
        if (!factionActionsMap.has(data.faction)) {
          factionActionsMap.set(data.faction, {
            faction: data.faction,
            shipments: [],
            movements: [],
          });
        }
        const factionActions = factionActionsMap.get(data.faction)!;

        // Determine shipment type
        let type: ShipmentAction['type'] = 'normal';
        if (data.from && data.to) {
          type = 'cross-ship';
        } else if (data.from && !data.to) {
          type = 'off-planet';
        } else if (data.reason === 'spiritual_advisor') {
          type = 'spiritual_advisor';
        }

        const shipment: ShipmentAction = {
          faction: data.faction,
          count: data.count,
          cost: data.cost,
          type,
        };

        if (type === 'cross-ship') {
          shipment.from = data.from;
          shipment.to = data.to;
        } else if (type === 'off-planet') {
          shipment.from = data.from;
        } else {
          shipment.territory = data.territory;
          shipment.sector = data.sector;
        }

        factionActions.shipments.push(shipment);
      }

      if (phaseEvent.type === 'FORCES_MOVED') {
        const data = phaseEvent.data as {
          faction: Faction;
          from: string;
          fromSector?: number;
          to: string;
          toSector?: number;
          count: number;
        };

        // Get or create faction actions
        if (!factionActionsMap.has(data.faction)) {
          factionActionsMap.set(data.faction, {
            faction: data.faction,
            shipments: [],
            movements: [],
          });
        }
        const factionActions = factionActionsMap.get(data.faction)!;

        factionActions.movements.push({
          faction: data.faction,
          from: data.from,
          fromSector: data.fromSector,
          to: data.to,
          toSector: data.toSector,
          count: data.count,
        });
      }
    }

    // Finalize bidding info if we have any auctions or an active auction
    if (auctions.length > 0 || currentAuction) {
      biddingInfo = {
        auctions: currentAuction ? [...auctions, currentAuction] : [...auctions],
        currentAuction: currentAuctionIndex,
      };
    }

    // Finalize shipment/movement info
    if (factionActionsMap.size > 0 || stormOrder.length > 0) {
      // Convert map to array, preserving order based on storm order
      const factionActions: FactionActions[] = [];
      
      // First, add actions in storm order
      for (const faction of stormOrder) {
        const actions = factionActionsMap.get(faction);
        if (actions) {
          factionActions.push(actions);
        }
      }
      
      // Then add any factions that acted but aren't in storm order (e.g., Guild acting out of order)
      for (const [faction, actions] of factionActionsMap.entries()) {
        if (!stormOrder.includes(faction)) {
          factionActions.push(actions);
        }
      }

      shipmentMovementInfo = {
        stormOrder: stormOrder.length > 0 ? [...stormOrder] : [],
        factionActions,
      };
    }

    // Return null for phases that don't have data available
    return {
      stormInfo: currentPhase === Phase.STORM ? stormInfo : null,
      spiceBlowInfo: currentPhase === Phase.SPICE_BLOW ? spiceBlowInfo : null,
      choamCharityInfo: currentPhase === Phase.CHOAM_CHARITY ? choamCharityInfo : null,
      biddingInfo: currentPhase === Phase.BIDDING ? biddingInfo : null,
      shipmentMovementInfo: currentPhase === Phase.SHIPMENT_MOVEMENT ? shipmentMovementInfo : null,
    };
  }, [events, currentPhase, stormOrder]);
}

