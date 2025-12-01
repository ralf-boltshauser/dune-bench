/**
 * Zod Schemas for Tool Parameters
 *
 * Defines validation schemas for all tool inputs.
 * These schemas are used by the Vercel AI SDK to:
 * 1. Generate tool descriptions for the LLM
 * 2. Validate tool inputs at runtime
 * 3. Provide type inference for tool implementations
 */

import { z } from "zod";
import { Faction } from "../types";
import {
  getAllTerritoryIds,
  normalizeTerritoryId,
} from "../utils/territory-normalize";

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * Faction identifier schema.
 * Uses the lowercase values from the Faction enum.
 */
export const FactionSchema = z
  .nativeEnum(Faction)
  .describe("Faction identifier");

/**
 * Territory identifier schema WITHOUT transforms (for tool schemas).
 * This version is safe for AI SDK JSON Schema serialization.
 * Normalization is handled in tool execute functions.
 */
export const TerritoryIdSchema = z
  .string()
  .describe(
    'Territory identifier (case-insensitive, will be normalized automatically). Examples: "carthag", "Carthag", "CARTHAG" all work. Valid IDs: arrakeen, carthag, sietch_tabr, tueks_sietch, habbanya_sietch, the_great_flat, etc.'
  );

/**
 * Territory identifier schema WITH transforms (for validation outside tools).
 * Use this for non-tool validation where transforms are acceptable.
 * NOTE: Do NOT use this in tool inputSchema - it will cause JSON Schema serialization errors.
 */
export const TerritoryIdSchemaWithTransform = z
  .string()
  .transform((val, ctx) => {
    const normalized = normalizeTerritoryId(val);
    if (!normalized) {
      const suggestions = getAllTerritoryIds()
        .filter((id) => id.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 3)
        .map((id) => `"${id}"`)
        .join(", ");
      const suggestionText = suggestions
        ? ` Did you mean: ${suggestions}?`
        : "";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid territory ID: "${val}".${suggestionText} Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen").`,
      });
      return z.NEVER;
    }
    return normalized;
  })
  .describe(
    'Territory identifier (case-insensitive). Examples: "carthag", "Carthag", "CARTHAG" all work. Valid IDs: arrakeen, carthag, sietch_tabr, tueks_sietch, habbanya_sietch, the_great_flat, etc.'
  );

/**
 * Sector number schema (0-17).
 */
export const SectorSchema = z
  .number()
  .int()
  .min(0)
  .max(17)
  .describe("Sector number (0-17, counterclockwise from storm start)");

/**
 * Force count schema.
 */
export const ForceCountSchema = z
  .number()
  .int()
  .min(0)
  .max(20)
  .describe("Number of forces");

/**
 * Spice amount schema.
 */
export const SpiceSchema = z.number().int().min(0).describe("Amount of spice");

/**
 * Card identifier schema.
 */
export const CardIdSchema = z
  .string()
  .nullable()
  .describe("Treachery card identifier, or null if not using a card");

/**
 * Leader identifier schema.
 */
export const LeaderIdSchema = z
  .string()
  .nullable()
  .describe("Leader identifier, or null if not using a leader");

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
  faction: FactionSchema.optional().describe(
    "Faction to view (defaults to your own faction)"
  ),
});

// =============================================================================
// STORM PHASE SCHEMAS
// =============================================================================

/**
 * Storm dial parameters.
 * Turn 1: 0-20, Later turns: 1-3
 */
export const StormDialSchema = z.object({
  dial: z
    .number()
    .int()
    .min(0)
    .max(20)
    .describe(
      "Storm dial value. Turn 1: 0-20, Later turns: 1-3. Combined with opponent dial to determine storm movement."
    ),
});

// =============================================================================
// BIDDING PHASE SCHEMAS
// =============================================================================

/**
 * Place bid parameters.
 */
export const PlaceBidSchema = z.object({
  amount: z
    .number()
    .int()
    .min(1)
    .describe(
      "Spice amount to bid. Must be higher than current bid and not exceed your spice."
    ),
});

// =============================================================================
// REVIVAL PHASE SCHEMAS
// =============================================================================

/**
 * Revive forces parameters.
 */
export const ReviveForcesSchema = z.object({
  count: z
    .number()
    .int()
    .min(0)
    .max(3)
    .optional()
    .describe(
      "Number of regular forces to revive (0-3). Free revival varies by faction (usually 2). Additional forces cost 2 spice each. At least one of count or eliteCount must be > 0. Total cannot exceed 3."
    ),
  eliteCount: z
    .number()
    .int()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Number of elite forces (Sardaukar/Fedaykin) to revive (0-1). Maximum 1 per turn for Emperor/Fremen. At least one of count or eliteCount must be > 0. Total cannot exceed 3."
    ),
});
// Note: Validation is done in execute function - .refine() creates transforms that can't be serialized to JSON Schema

/**
 * Revive leader parameters.
 */
export const ReviveLeaderSchema = z.object({
  leaderId: z
    .string()
    .describe(
      "ID of the leader to revive. Leader must be in the Tleilaxu Tanks. Cost equals leader strength in spice."
    ),
});

/**
 * Revive Kwisatz Haderach parameters (no parameters needed, but schema required).
 */
export const ReviveKwisatzHaderachSchema = z.object({});

/**
 * Emperor pays for ally revival parameters.
 */
export const EmperorPayAllyRevivalSchema = z.object({
  forceCount: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe(
      "Number of ally forces to revive (1-3). Emperor pays 2 spice per force. Only available when Emperor is allied and ally has forces in tanks."
    ),
});

/**
 * Fremen grants ally 3 free revivals (no parameters needed).
 */
export const GrantFremenRevivalBoostSchema = z.object({});

/**
 * Fremen denies ally the revival boost (no parameters needed).
 */
export const DenyFremenRevivalBoostSchema = z.object({});

/**
 * Use Tleilaxu Ghola card for extra revival.
 */
export const UseTleilaxuGholaSchema = z.object({
  reviveType: z
    .enum(["leader", "forces"])
    .describe("Type of revival: revive a leader OR revive forces"),
  leaderId: z
    .string()
    .optional()
    .describe('Leader ID to revive (required if reviveType is "leader")'),
  forceCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe(
      'Number of forces to revive (1-5, required if reviveType is "forces")'
    ),
});

// =============================================================================
// SHIPMENT PHASE SCHEMAS
// =============================================================================

/**
 * Ship forces parameters.
 */
export const ShipForcesSchema = z.object({
  territoryId: TerritoryIdSchema.describe("Target territory to ship forces to"),
  sector: SectorSchema.describe("Sector within the territory to land in"),
  regularCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0)
    .describe("Number of regular forces to ship from reserves (can be 0)"),
  eliteCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0)
    .describe(
      "Number of elite forces (Sardaukar/Fedaykin) to ship from reserves (can be 0)"
    ),
});

/**
 * Fremen send forces parameters (special free shipment).
 */
export const FremenSendForcesSchema = z.object({
  territoryId: TerritoryIdSchema.describe(
    "Target territory (must be Great Flat or within 2 territories of Great Flat)"
  ),
  sector: SectorSchema.describe("Sector within the territory to land in"),
  regularCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0)
    .describe("Number of regular forces to send from reserves (can be 0)"),
  eliteCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0)
    .describe(
      "Number of elite forces (Fedaykin) to send from reserves (can be 0)"
    ),
  allowStormMigration: z
    .boolean()
    .optional()
    .default(false)
    .describe("Allow sending into storm (half forces destroyed upon arrival)"),
});

/**
 * Guild cross-ship parameters (territory to territory).
 */
export const GuildCrossShipSchema = z.object({
  fromTerritoryId: TerritoryIdSchema.describe("Territory to ship forces from"),
  fromSector: SectorSchema.describe("Sector to ship forces from"),
  toTerritoryId: TerritoryIdSchema.describe("Territory to ship forces to"),
  toSector: SectorSchema.describe("Sector to ship forces to"),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Number of forces to cross-ship"),
  useElite: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to use elite forces if available"),
});

/**
 * Guild off-planet shipment parameters (territory to reserves).
 */
export const GuildOffPlanetSchema = z.object({
  fromTerritoryId: TerritoryIdSchema.describe("Territory to ship forces from"),
  fromSector: SectorSchema.describe("Sector to ship forces from"),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Number of forces to ship back to reserves"),
  useElite: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to use elite forces if available"),
});

/**
 * Bene Gesserit spiritual advisor parameters.
 * Rule 2.02.05: Whenever any other faction ships, BG may send 1 force for free.
 * Rule 2.02.11 (Advanced): Can send advisor to same territory instead of Polar Sink.
 */
export const BGSpiritualAdvisorSchema = z.object({
  choice: z
    .enum(["polar_sink", "same_territory", "pass"])
    .describe(
      "Where to send the spiritual advisor: polar_sink (basic), same_territory (advanced), or pass"
    ),
  // These are only needed if choice is 'same_territory'
  territoryId: TerritoryIdSchema.optional().describe(
    "Territory to send advisor to (required if choice is same_territory)"
  ),
  sector: SectorSchema.optional().describe(
    "Sector to send advisor to (required if choice is same_territory)"
  ),
});

/**
 * Schema for BG INTRUSION ability (Rule 2.02.16).
 * When a non-ally enters a territory where BG has fighters, BG may flip them to advisors.
 */
export const BGIntrusionSchema = z.object({
  choice: z
    .enum(["flip", "pass"])
    .describe(
      "Whether to flip fighters to advisors (flip) or pass on the opportunity (pass)"
    ),
  territoryId: TerritoryIdSchema.describe(
    "Territory where fighters should be flipped to advisors"
  ),
  sector: SectorSchema.describe(
    "Sector where fighters should be flipped to advisors"
  ),
  count: ForceCountSchema.optional().describe(
    "Number of fighters to flip to advisors (defaults to all fighters in territory/sector)"
  ),
});

/**
 * Schema for BG TAKE UP ARMS ability (Rule 2.02.17).
 * When moving advisors to occupied territory, BG may flip them to fighters.
 */
export const BGTakeUpArmsSchema = z.object({
  choice: z
    .enum(["flip", "pass"])
    .describe(
      "Whether to flip advisors to fighters (flip) or pass on the opportunity (pass)"
    ),
});

// =============================================================================
// MOVEMENT PHASE SCHEMAS
// =============================================================================

/**
 * Move forces parameters.
 */
export const MoveForcesSchema = z.object({
  fromTerritoryId: TerritoryIdSchema.describe("Territory to move forces from"),
  fromSector: SectorSchema.describe("Sector to move forces from"),
  toTerritoryId: TerritoryIdSchema.describe("Territory to move forces to"),
  toSector: SectorSchema.describe("Sector to move forces to"),
  count: z.number().int().min(1).max(20).describe("Number of forces to move"),
});

// =============================================================================
// BATTLE PHASE SCHEMAS
// =============================================================================

/**
 * Choose battle parameters (aggressor only).
 */
export const ChooseBattleSchema = z.object({
  territoryId: TerritoryIdSchema.describe("Territory where battle will occur"),
  opponentFaction: FactionSchema.describe("Faction to battle against"),
});

/**
 * Battle plan parameters.
 */
export const BattlePlanSchema = z.object({
  leaderId: LeaderIdSchema.describe(
    "Leader to use in battle. Required if you have available leaders."
  ),
  forcesDialed: z
    .number()
    .int()
    .min(0)
    .max(20)
    .describe(
      "Number of forces to dial on battle wheel. These forces are lost regardless of outcome."
    ),
  weaponCardId: CardIdSchema.describe("Weapon treachery card to use, or null"),
  defenseCardId: CardIdSchema.describe(
    "Defense treachery card to use, or null"
  ),
  useKwisatzHaderach: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to use Kwisatz Haderach (Atreides only, if active)"),
  useCheapHero: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to use Cheap Hero card instead of a leader"),
  announcedNoLeader: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set to true to announce you cannot play a leader or Cheap Hero. Only required when you have no available leaders and no Cheap Hero card."
    ),
  spiceDialed: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(0)
    .describe(
      "Spice to pay for full-strength forces (advanced rules only). Each force needs 1 spice to count at full strength. Unspiced forces count at half strength. Fremen do not need spice (BATTLE HARDENED). When traitor is revealed, winner keeps spice paid."
    ),
});

/**
 * Call traitor parameters.
 */
export const CallTraitorSchema = z.object({
  leaderId: z
    .string()
    .describe(
      "ID of the opponent leader to call as traitor. Must match a traitor card in your hand."
    ),
});

/**
 * Choose cards to discard after winning a battle.
 * Rule: "The winning player may discard any of the cards they played"
 */
export const ChooseCardsToDiscardSchema = z.object({
  cardsToDiscard: z
    .array(CardIdSchema)
    .describe(
      'Array of card IDs to discard. Can be empty (keep all), partial (discard some), or full (discard all). Cards that say "Discard after use" are automatically discarded and not included in this choice.'
    ),
});

// =============================================================================
// NEXUS/ALLIANCE SCHEMAS
// =============================================================================

/**
 * Propose alliance parameters.
 */
export const ProposeAllianceSchema = z.object({
  targetFaction: FactionSchema.describe("Faction to propose alliance to"),
});

/**
 * Respond to alliance parameters.
 */
export const RespondAllianceSchema = z.object({
  proposingFaction: FactionSchema.describe(
    "The faction that proposed the alliance"
  ),
  accept: z.boolean().describe("Whether to accept the alliance proposal"),
});

/**
 * Break alliance parameters.
 */
export const BreakAllianceSchema = z.object({
  allyFaction: FactionSchema.describe("The faction to break alliance with"),
});

// =============================================================================
// CHOAM CHARITY SCHEMA
// =============================================================================

/**
 * Claim charity parameters (no input needed).
 */
export const ClaimCharitySchema = z
  .object({})
  .describe("Claim CHOAM charity (available if you have 0-1 spice)");

// =============================================================================
// PASS ACTION SCHEMA
// =============================================================================

/**
 * Pass action parameters (no input needed).
 */
export const PassActionSchema = z.object({}).describe("Pass on this action");

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
  reviveKwisatzHaderach: ReviveKwisatzHaderachSchema,
  emperorPayAllyRevival: EmperorPayAllyRevivalSchema,
  grantFremenRevivalBoost: GrantFremenRevivalBoostSchema,
  denyFremenRevivalBoost: DenyFremenRevivalBoostSchema,
  useTleilaxuGhola: UseTleilaxuGholaSchema,
  pass: PassActionSchema,
};

export const ShipmentSchemas = {
  shipForces: ShipForcesSchema,
  bgTakeUpArms: BGTakeUpArmsSchema,
  fremenSendForces: FremenSendForcesSchema,
  bgSpiritualAdvisor: BGSpiritualAdvisorSchema,
  bgIntrusion: BGIntrusionSchema,
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
  chooseCardsToDiscard: ChooseCardsToDiscardSchema,
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
