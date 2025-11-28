/**
 * Karama Card Tools
 *
 * Tools for using Karama cards to:
 * - Cancel faction abilities (abilities with ✷ after)
 * - Prevent faction abilities (abilities with ✷ before and after)
 * - Purchase shipment at Guild rates
 * - Bid without having enough spice
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult } from '../types';
import { FactionSchema } from '../schemas';
import { getFactionState } from '../../state';
import { getTreacheryCardDefinition, isKaramaCard, isWorthless } from '../../data/treachery-cards';
import { Faction, CardLocation } from '../../types';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Schema for responding to a Karama interrupt opportunity.
 */
export const KaramaRespondSchema = z.object({
  useKarama: z.boolean().describe('Whether to use a Karama card to interrupt'),
  karamaCardId: z
    .string()
    .optional()
    .describe('The ID of the Karama card to use (or worthless card for Bene Gesserit)'),
});

/**
 * Schema for using Karama to cancel an ability after it was used.
 */
export const KaramaCancelSchema = z.object({
  targetFaction: FactionSchema.describe('The faction whose ability to cancel'),
  abilityName: z
    .string()
    .describe(
      'Name of the ability to cancel (e.g., "PRESCIENCE", "VOICE", "PAYMENT_FOR_TREACHERY")'
    ),
  karamaCardId: z
    .string()
    .describe('The ID of the Karama card to use (or worthless card for Bene Gesserit)'),
});

/**
 * Schema for using Karama to prevent an ability before it is used.
 */
export const KaramaPreventSchema = z.object({
  targetFaction: FactionSchema.describe('The faction whose ability to prevent'),
  abilityName: z
    .string()
    .describe(
      'Name of the ability to prevent (e.g., "KWISATZ_HADERACH", "SARDAUKAR", "HALF_PRICE_SHIPPING")'
    ),
  karamaCardId: z
    .string()
    .describe('The ID of the Karama card to use (or worthless card for Bene Gesserit)'),
});

/**
 * Schema for using Karama to purchase shipment at Guild rates.
 */
export const KaramaGuildShipmentSchema = z.object({
  karamaCardId: z.string().describe('The ID of the Karama card to use'),
});

/**
 * Schema for using Karama to bid without having enough spice.
 */
export const KaramaBidOverSpiceSchema = z.object({
  bidAmount: z.number().int().min(1).describe('The amount to bid (can exceed your spice)'),
  karamaCardId: z.string().describe('The ID of the Karama card to use'),
});

// =============================================================================
// KARAMA TOOLS
// =============================================================================

/**
 * Create Karama tools bound to a context manager.
 */
export function createKaramaTools(ctx: ToolContextManager) {
  return {
    /**
     * Respond to a Karama interrupt opportunity.
     * Used when another faction uses an ability that can be cancelled/prevented.
     */
    respond_to_karama_opportunity: tool({
      description: `Respond to a Karama interrupt opportunity.

When another faction uses an ability marked with ✷, you have the opportunity to:
- Cancel it (if marked with ✷ after the ability)
- Prevent it (if marked with ✷ before and after the ability)

If you use Karama, the ability is cancelled and the faction may recalculate and
retake their action without the ability.

Bene Gesserit special: You may use any worthless card as if it were a Karama card.`,
      inputSchema: KaramaRespondSchema,
      execute: async (params) => {
        const { useKarama, karamaCardId } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Check if there's an active Karama interrupt opportunity
        if (!state.karamaState) {
          return failureResult('No active Karama interrupt opportunity', {
            code: 'NO_KARAMA_OPPORTUNITY',
            message: 'There is no active Karama interrupt opportunity',
            suggestion: 'Wait for another faction to use an ability marked with ✷',
          });
        }

        // Check if faction is eligible to respond
        if (!state.karamaState.eligibleFactions.includes(faction)) {
          return failureResult('You are not eligible to respond to this Karama opportunity', {
            code: 'NOT_ELIGIBLE',
            message: 'You are not eligible to respond (you are the target faction)',
          });
        }

        // Check if faction already responded
        if (state.karamaState.responses.has(faction)) {
          return failureResult('You have already responded to this Karama opportunity', {
            code: 'ALREADY_RESPONDED',
            message: 'You have already provided a response to this interrupt',
          });
        }

        if (!useKarama) {
          // Pass on the opportunity
          const newState = {
            ...state,
            karamaState: state.karamaState
              ? {
                  ...state.karamaState,
                  responses: new Map(state.karamaState.responses).set(faction, {
                    faction,
                    useKarama: false,
                  }),
                }
              : null,
          };
          ctx.updateState(newState);

          return successResult('Passed on Karama opportunity', { faction, useKarama: false });
        }

        // Validate card
        if (!karamaCardId) {
          return failureResult('Must specify karamaCardId when using Karama', {
            code: 'MISSING_CARD_ID',
            message: 'You must specify which card to use',
            field: 'karamaCardId',
          });
        }

        const card = factionState.hand.find((c) => c.definitionId === karamaCardId);
        if (!card) {
          return failureResult(`Card ${karamaCardId} not in your hand`, {
            code: 'CARD_NOT_IN_HAND',
            message: `Card ${karamaCardId} is not in your hand`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        const cardDef = getTreacheryCardDefinition(karamaCardId);
        if (!cardDef) {
          return failureResult(`Unknown card: ${karamaCardId}`, {
            code: 'UNKNOWN_CARD',
            message: `Card definition not found: ${karamaCardId}`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        // Validate it's a Karama or worthless (for BG)
        const isValidKarama = isKaramaCard(cardDef);
        const isBGWorthless = faction === Faction.BENE_GESSERIT && isWorthless(cardDef);

        if (!isValidKarama && !isBGWorthless) {
          return failureResult(
            'Card is not a Karama card' +
              (faction === Faction.BENE_GESSERIT ? ' or worthless card' : ''),
            {
              code: 'INVALID_CARD_TYPE',
              message:
                'Card must be a Karama card' +
                (faction === Faction.BENE_GESSERIT ? ' or worthless card (BG ability)' : ''),
              field: 'karamaCardId',
              providedValue: karamaCardId,
            }
          );
        }

        // Use the Karama card - discard it and mark interrupt
        const interruptType = state.karamaState.interruptType;
        const targetFaction = state.karamaState.targetFaction;
        const abilityName = state.karamaState.abilityName;

        let newState = { ...state };

        // Update karama state with response
        if (newState.karamaState) {
          newState.karamaState = {
            ...newState.karamaState,
            responses: new Map(newState.karamaState.responses).set(faction, {
              faction,
              useKarama: true,
              karamaCardId,
            }),
            interrupted: true,
            interruptor: faction,
          };
        }

        // Discard the card
        const cardIndex = factionState.hand.findIndex((c) => c.definitionId === karamaCardId);
        if (cardIndex !== -1) {
          const updatedFactionState = { ...factionState };
          const removedCard = updatedFactionState.hand[cardIndex];
          updatedFactionState.hand = [
            ...updatedFactionState.hand.slice(0, cardIndex),
            ...updatedFactionState.hand.slice(cardIndex + 1),
          ];

          newState.factions = new Map(newState.factions);
          newState.factions.set(faction, updatedFactionState);

          newState.treacheryDiscard = [
            ...newState.treacheryDiscard,
            {
              ...removedCard,
              location: CardLocation.DISCARD,
              ownerId: null,
            },
          ];
        }

        ctx.updateState(newState);

        return successResult(
          `Used Karama to ${interruptType} ${targetFaction}'s ${abilityName}`,
          {
            faction,
            interruptType,
            targetFaction,
            abilityName,
            karamaCardId,
          }
        );
      },
    }),

    /**
     * Use Karama to purchase shipment at Guild rates (1 spice per 2 forces).
     * This is a proactive use, not an interrupt.
     */
    use_karama_guild_shipment: tool({
      description: `Use Karama card to purchase shipment at Guild rates.

Instead of paying normal shipment costs:
- Strongholds: 1 spice per force
- Non-strongholds: 2 spice per force

You pay Guild rates (half price):
- All territories: 1 spice per 2 forces (rounded up)

This is paid to the Spice Bank, not to the Guild player.`,
      inputSchema: KaramaGuildShipmentSchema,
      execute: async (params) => {
        const { karamaCardId } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Validate card
        const card = factionState.hand.find((c) => c.definitionId === karamaCardId);
        if (!card) {
          return failureResult(`Card ${karamaCardId} not in your hand`, {
            code: 'CARD_NOT_IN_HAND',
            message: `Card ${karamaCardId} is not in your hand`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        const cardDef = getTreacheryCardDefinition(karamaCardId);
        if (!cardDef) {
          return failureResult(`Unknown card: ${karamaCardId}`, {
            code: 'UNKNOWN_CARD',
            message: `Card definition not found: ${karamaCardId}`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        const isValidKarama = isKaramaCard(cardDef);
        const isBGWorthless = faction === Faction.BENE_GESSERIT && isWorthless(cardDef);

        if (!isValidKarama && !isBGWorthless) {
          return failureResult(
            'Card is not a Karama card' +
              (faction === Faction.BENE_GESSERIT ? ' or worthless card' : ''),
            {
              code: 'INVALID_CARD_TYPE',
              message:
                'Card must be a Karama card' +
                (faction === Faction.BENE_GESSERIT ? ' or worthless card (BG ability)' : ''),
              field: 'karamaCardId',
              providedValue: karamaCardId,
            }
          );
        }

        // Mark Karama as being used for Guild shipment this turn
        // This will be checked by the shipment tool
        let newState = { ...state };
        const updatedFactionState = { ...factionState };
        (updatedFactionState as any).karamaGuildShipmentActive = true;

        // Discard the card
        const cardIndex = factionState.hand.findIndex((c) => c.definitionId === karamaCardId);
        if (cardIndex !== -1) {
          const removedCard = updatedFactionState.hand[cardIndex];
          updatedFactionState.hand = [
            ...updatedFactionState.hand.slice(0, cardIndex),
            ...updatedFactionState.hand.slice(cardIndex + 1),
          ];

          newState.treacheryDiscard = [
            ...newState.treacheryDiscard,
            {
              ...removedCard,
              location: CardLocation.DISCARD,
              ownerId: null,
            },
          ];
        }

        newState.factions = new Map(newState.factions);
        newState.factions.set(faction, updatedFactionState);
        ctx.updateState(newState);

        return successResult(
          'Karama card used - next shipment will be at Guild rates (1 spice per 2 forces)',
          {
            faction,
            karamaCardId,
            guildRatesActive: true,
          }
        );
      },
    }),

    /**
     * Use Karama to bid more spice than you have.
     * This is used during bidding phase.
     */
    use_karama_bid_over_spice: tool({
      description: `Use Karama card to bid more spice than you have.

You may bid any amount without revealing that you don't have enough spice.
If you win the bid, you must still pay (you cannot use Karama to avoid payment).

This can also be used to buy a card without paying spice for it (if your hand isn't full).`,
      inputSchema: KaramaBidOverSpiceSchema,
      execute: async (params) => {
        const { bidAmount, karamaCardId } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Validate card
        const card = factionState.hand.find((c) => c.definitionId === karamaCardId);
        if (!card) {
          return failureResult(`Card ${karamaCardId} not in your hand`, {
            code: 'CARD_NOT_IN_HAND',
            message: `Card ${karamaCardId} is not in your hand`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        const cardDef = getTreacheryCardDefinition(karamaCardId);
        if (!cardDef) {
          return failureResult(`Unknown card: ${karamaCardId}`, {
            code: 'UNKNOWN_CARD',
            message: `Card definition not found: ${karamaCardId}`,
            field: 'karamaCardId',
            providedValue: karamaCardId,
          });
        }

        const isValidKarama = isKaramaCard(cardDef);
        const isBGWorthless = faction === Faction.BENE_GESSERIT && isWorthless(cardDef);

        if (!isValidKarama && !isBGWorthless) {
          return failureResult(
            'Card is not a Karama card' +
              (faction === Faction.BENE_GESSERIT ? ' or worthless card' : ''),
            {
              code: 'INVALID_CARD_TYPE',
              message:
                'Card must be a Karama card' +
                (faction === Faction.BENE_GESSERIT ? ' or worthless card (BG ability)' : ''),
              field: 'karamaCardId',
              providedValue: karamaCardId,
            }
          );
        }

        // Mark Karama as being used for bidding
        let newState = { ...state };
        const updatedFactionState = { ...factionState };
        (updatedFactionState as any).karamaBiddingActive = true;

        // Discard the card
        const cardIndex = factionState.hand.findIndex((c) => c.definitionId === karamaCardId);
        if (cardIndex !== -1) {
          const removedCard = updatedFactionState.hand[cardIndex];
          updatedFactionState.hand = [
            ...updatedFactionState.hand.slice(0, cardIndex),
            ...updatedFactionState.hand.slice(cardIndex + 1),
          ];

          newState.treacheryDiscard = [
            ...newState.treacheryDiscard,
            {
              ...removedCard,
              location: CardLocation.DISCARD,
              ownerId: null,
            },
          ];
        }

        newState.factions = new Map(newState.factions);
        newState.factions.set(faction, updatedFactionState);
        ctx.updateState(newState);

        return successResult('Karama card used - you may bid without spice restrictions', {
          faction,
          karamaCardId,
          bidAmount,
          overbidEnabled: true,
        });
      },
    }),
  };
}

// =============================================================================
// TOOL NAMES
// =============================================================================

export const KARAMA_TOOL_NAMES = [
  'respond_to_karama_opportunity',
  'use_karama_guild_shipment',
  'use_karama_bid_over_spice',
] as const;

export type KaramaToolName = (typeof KARAMA_TOOL_NAMES)[number];

// =============================================================================
// ABILITY METADATA
// =============================================================================

/**
 * Metadata about which abilities can be cancelled/prevented with Karama.
 * Based on the ✷ symbol in the rules.
 */
export const KARAMA_CANCELLABLE_ABILITIES = {
  // Cancel only (✷ after) - can be cancelled after use
  CANCEL_ONLY: [
    'BIDDING', // Atreides: look at card before bidding
    'WORMSIGN', // Atreides: look at spice deck
    'PRESCIENCE', // Atreides: see opponent's battle plan element
    'VOICE', // Bene Gesserit: command opponent's battle plan
    'PAYMENT_FOR_TREACHERY', // Emperor: receive payment for cards
    'SARDAUKAR', // Emperor: elite forces worth 2x
    'MOVEMENT', // Fremen: move 2 territories
    'SHAI_HULUD', // Fremen: protected from sandworms
    'PAYMENT_FOR_SHIPMENT', // Guild: receive payment for shipments
    'CROSS_SHIP', // Guild: ship forces between territories
    'OFF_PLANET_SHIPMENT', // Guild: ship forces to reserves
    'HALF_PRICE_SHIPPING', // Guild: pay half for shipment
    'CAPTURE_LEADER', // Harkonnen: capture leaders
    'SPIRITUAL_ADVISORS', // Bene Gesserit: free forces when others ship
    'INTRUSION', // Bene Gesserit: flip to advisors on intrusion
    'TAKE_UP_ARMS', // Bene Gesserit: flip to fighters when moving
    'WARTIME', // Bene Gesserit: flip all advisors to fighters
  ] as const,

  // Prevent (✷ before and after) - must be prevented before use
  PREVENT: [
    'KWISATZ_HADERACH', // Atreides: +2 to leader strength
    'ALLIANCE_PRESCIENCE', // Atreides ally: use prescience
    'ALLIANCE_VOICE', // Bene Gesserit ally: use voice
    'CHARITY', // Bene Gesserit: always get 2 spice minimum
    'ALLIANCE_REVIVAL', // Emperor ally: revive 3 extra forces
    'ALLIANCE_PROTECT_FROM_WORMS', // Fremen ally: protect from sandworms
    'ALLIANCE_HALF_PRICE', // Guild ally: half price shipping
    'ALLIANCE_CROSS_SHIP', // Guild ally: cross-ship
    'KARAMA_AS_WORTHLESS', // Bene Gesserit: use worthless as Karama
  ] as const,
} as const;

/**
 * Check if an ability can be cancelled with Karama (after use).
 */
export function isKaramaCancellable(abilityName: string): boolean {
  return KARAMA_CANCELLABLE_ABILITIES.CANCEL_ONLY.includes(abilityName as any);
}

/**
 * Check if an ability can be prevented with Karama (before use).
 */
export function isKaramaPreventable(abilityName: string): boolean {
  return KARAMA_CANCELLABLE_ABILITIES.PREVENT.includes(abilityName as any);
}
