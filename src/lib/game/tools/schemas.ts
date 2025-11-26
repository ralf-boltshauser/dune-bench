/**
 * Zod Schemas for Tool Parameters
 *
 * Defines validation schemas for all tool inputs.
 * These schemas are used by the Vercel AI SDK to:
 * 1. Generate tool descriptions for the LLM
 * 2. Validate tool inputs at runtime
 * 3. Provide type inference for tool implementations
 */

import { z } from 'zod';
import { Faction, Phase, TerritoryId } from '../types';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * Faction identifier schema.
 * Uses the lowercase values from the Faction enum.
 */
export const FactionSchema = z.nativeEnum(Faction).describe('Faction identifier');

/**
 * Territory identifier schema.
 */
export const TerritoryIdSchema = z.string()
  .describe('Territory identifier (e.g., ARRAKEEN, CARTHAG, SIETCH_TABR)');

/**
 * Sector number schema (0-17).
 */
export const SectorSchema = z.number()
  .int()
  .min(0)
  .max(17)
  .describe('Sector number (0-17, counterclockwise from storm start)');

/**
 * Force count schema.
 */
export const ForceCountSchema = z.number()
  .int()
  .min(0)
  .max(20)
  .describe('Number of forces');

/**
 * Spice amount schema.
 */
export const SpiceSchema = z.number()
  .int()
  .min(0)
  .describe('Amount of spice');

/**
 * Card identifier schema.
 */
export const CardIdSchema = z.string()
  .nullable()
  .describe('Treachery card identifier, or null if not using a card');

/**
 * Leader identifier schema.
 */
export const LeaderIdSchema = z.string()
  .nullable()
  .describe('Leader identifier, or null if not using a leader');

// =============================================================================
// INFORMATION TOOL SCHEMAS
// =============================================================================

/**
 * View territory parameters.
 */
export const ViewTerritorySchema = z.object({
  territoryId: TerritoryIdSchema,
});

/**
 * View faction parameters.
 */
export const ViewFactionSchema = z.object({
  faction: FactionSchema.optional()
    .describe('Faction to view (defaults to your own faction)'),
});

// =============================================================================
// STORM PHASE SCHEMAS
// =============================================================================

/**
 * Storm dial parameters.
 * Turn 1: 0-20, Later turns: 1-3
 */
export const StormDialSchema = z.object({
  dial: z.number()
    .int()
    .min(0)
    .max(20)
    .describe('Storm dial value. Turn 1: 0-20, Later turns: 1-3. Combined with opponent dial to determine storm movement.'),
});

// =============================================================================
// BIDDING PHASE SCHEMAS
// =============================================================================

/**
 * Place bid parameters.
 */
export const PlaceBidSchema = z.object({
  amount: z.number()
    .int()
    .min(1)
    .describe('Spice amount to bid. Must be higher than current bid and not exceed your spice.'),
});

// =============================================================================
// REVIVAL PHASE SCHEMAS
// =============================================================================

/**
 * Revive forces parameters.
 */
export const ReviveForcesSchema = z.object({
  count: z.number()
    .int()
    .min(1)
    .max(3)
    .describe('Number of forces to revive. Free revival varies by faction (usually 2). Additional forces cost 2 spice each.'),
});

/**
 * Revive leader parameters.
 */
export const ReviveLeaderSchema = z.object({
  leaderId: z.string()
    .describe('ID of the leader to revive. Leader must be in the Tleilaxu Tanks. Cost equals leader strength in spice.'),
});

// =============================================================================
// SHIPMENT PHASE SCHEMAS
// =============================================================================

/**
 * Ship forces parameters.
 */
export const ShipForcesSchema = z.object({
  territoryId: TerritoryIdSchema
    .describe('Target territory to ship forces to'),
  sector: SectorSchema
    .describe('Sector within the territory to land in'),
  count: z.number()
    .int()
    .min(1)
    .max(20)
    .describe('Number of forces to ship from reserves'),
  useElite: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to use elite forces (Sardaukar/Fedaykin) if available'),
});

// =============================================================================
// MOVEMENT PHASE SCHEMAS
// =============================================================================

/**
 * Move forces parameters.
 */
export const MoveForcesSchema = z.object({
  fromTerritoryId: TerritoryIdSchema
    .describe('Territory to move forces from'),
  fromSector: SectorSchema
    .describe('Sector to move forces from'),
  toTerritoryId: TerritoryIdSchema
    .describe('Territory to move forces to'),
  toSector: SectorSchema
    .describe('Sector to move forces to'),
  count: z.number()
    .int()
    .min(1)
    .max(20)
    .describe('Number of forces to move'),
});

// =============================================================================
// BATTLE PHASE SCHEMAS
// =============================================================================

/**
 * Choose battle parameters (aggressor only).
 */
export const ChooseBattleSchema = z.object({
  territoryId: TerritoryIdSchema
    .describe('Territory where battle will occur'),
  opponentFaction: FactionSchema
    .describe('Faction to battle against'),
});

/**
 * Battle plan parameters.
 */
export const BattlePlanSchema = z.object({
  leaderId: LeaderIdSchema
    .describe('Leader to use in battle. Required if you have available leaders.'),
  forcesDialed: z.number()
    .int()
    .min(0)
    .max(20)
    .describe('Number of forces to dial on battle wheel. These forces are lost regardless of outcome.'),
  weaponCardId: CardIdSchema
    .describe('Weapon treachery card to use, or null'),
  defenseCardId: CardIdSchema
    .describe('Defense treachery card to use, or null'),
  useKwisatzHaderach: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to use Kwisatz Haderach (Atreides only, if active)'),
  useCheapHero: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to use Cheap Hero card instead of a leader'),
});

/**
 * Call traitor parameters.
 */
export const CallTraitorSchema = z.object({
  leaderId: z.string()
    .describe('ID of the opponent leader to call as traitor. Must match a traitor card in your hand.'),
});

// =============================================================================
// NEXUS/ALLIANCE SCHEMAS
// =============================================================================

/**
 * Propose alliance parameters.
 */
export const ProposeAllianceSchema = z.object({
  targetFaction: FactionSchema
    .describe('Faction to propose alliance to'),
});

/**
 * Respond to alliance parameters.
 */
export const RespondAllianceSchema = z.object({
  proposingFaction: FactionSchema
    .describe('The faction that proposed the alliance'),
  accept: z.boolean()
    .describe('Whether to accept the alliance proposal'),
});

/**
 * Break alliance parameters.
 */
export const BreakAllianceSchema = z.object({
  allyFaction: FactionSchema
    .describe('The faction to break alliance with'),
});

// =============================================================================
// CHOAM CHARITY SCHEMA
// =============================================================================

/**
 * Claim charity parameters (no input needed).
 */
export const ClaimCharitySchema = z.object({}).describe('Claim CHOAM charity (available if you have 0-1 spice)');

// =============================================================================
// PASS ACTION SCHEMA
// =============================================================================

/**
 * Pass action parameters (no input needed).
 */
export const PassActionSchema = z.object({}).describe('Pass on this action');

// =============================================================================
// SCHEMA EXPORTS BY CATEGORY
// =============================================================================

export const InformationSchemas = {
  viewTerritory: ViewTerritorySchema,
  viewFaction: ViewFactionSchema,
};

export const StormSchemas = {
  dialStorm: StormDialSchema,
};

export const BiddingSchemas = {
  placeBid: PlaceBidSchema,
  pass: PassActionSchema,
};

export const RevivalSchemas = {
  reviveForces: ReviveForcesSchema,
  reviveLeader: ReviveLeaderSchema,
  pass: PassActionSchema,
};

export const ShipmentSchemas = {
  shipForces: ShipForcesSchema,
  pass: PassActionSchema,
};

export const MovementSchemas = {
  moveForces: MoveForcesSchema,
  pass: PassActionSchema,
};

export const BattleSchemas = {
  chooseBattle: ChooseBattleSchema,
  submitBattlePlan: BattlePlanSchema,
  callTraitor: CallTraitorSchema,
  pass: PassActionSchema,
};

export const NexusSchemas = {
  proposeAlliance: ProposeAllianceSchema,
  respondAlliance: RespondAllianceSchema,
  breakAlliance: BreakAllianceSchema,
};

export const ChoamSchemas = {
  claimCharity: ClaimCharitySchema,
  pass: PassActionSchema,
};
