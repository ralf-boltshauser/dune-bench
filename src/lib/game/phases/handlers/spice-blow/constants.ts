/**
 * Spice Blow Phase Constants
 * 
 * Single source of truth for all constants, messages, and configuration values.
 */

export const SPICE_BLOW_CONSTANTS = {
  PHASE_NAME: "Spice Blow",
  LOG_PREFIX: "🌪️",
  CARD_PREFIX: "🎴",
  SPICE_PREFIX: "✅",
  STORM_PREFIX: "❌",
  WORM_PREFIX: "🐛",
  NEXUS_PREFIX: "🤝",
  PROTECTION_PREFIX: "🛡️",
} as const;

/**
 * Event messages - centralized for consistency and easy updates
 */
export const EVENT_MESSAGES = {
  CARD_REVEALED: (card: string, deck: string) =>
    `Spice Card ${deck} revealed: ${card}`,
  SPICE_PLACED: (amount: number, territory: string, sector: number) =>
    `${amount} spice placed in ${territory} (sector ${sector})`,
  SPICE_NOT_PLACED: (territory: string, reason: string) =>
    `${territory}: No spice blow - ${reason}`,
  SHAI_HULUD_APPEARED: (ignored?: boolean) =>
    ignored
      ? "Shai-Hulud appears - ignored on Turn 1 (set aside, not discarded)"
      : "Shai-Hulud appears!",
  FORCES_DEVOURED: (faction: string, count: number) =>
    `${count} ${faction} forces devoured by sandworm`,
  FREMEN_WORM_IMMUNITY: (count: number) =>
    `${count} Fremen forces immune to sandworm devouring`,
  FREMEN_PROTECTED_ALLY: (faction: string, count: number) =>
    `${count} ${faction} forces protected from sandworm by Fremen`,
  LEADER_PROTECTED: (faction: string, count: number) =>
    `${count} ${faction} leader(s) protected from sandworm`,
  NEXUS_STARTED: () => "Nexus! Alliance negotiations may occur.",
  NEXUS_ENDED: () => "Nexus ends.",
  ALLIANCE_FORMED: (faction1: string, faction2: string) =>
    `${faction1} and ${faction2} form an alliance!`,
  ALLIANCE_BROKEN: (faction1: string, faction2: string) =>
    `${faction1} breaks alliance with ${faction2}`,
  SHIELD_WALL_DESTROYED: () => "The Shield Wall is destroyed!",
  FREMEN_RODE_WORM: () => "Fremen chooses to ride the sandworm!",
} as const;

/**
 * Log messages for console output
 */
export const LOG_MESSAGES = {
  PHASE_START: (turn: number) => `SPICE BLOW PHASE (Turn ${turn})`,
  STORM_SECTOR: (sector: number) => `📍 Storm Sector: ${sector}`,
  TURN_1_WARNING_WORMS: () =>
    "⚠️  Turn 1: Shai-Hulud cards will be set aside and reshuffled",
  TURN_1_WARNING_NEXUS: () => "⚠️  Turn 1: No Nexus can occur",
  CARD_REVEALED: (card: string, deck: string) =>
    `Revealing Spice Card ${deck}: ${card}`,
  CARD_TYPE_TERRITORY: () => "   Type: Territory Card",
  CARD_TYPE_WORM: () => "   Type: Shai-Hulud (Sandworm)",
  TERRITORY_DETAILS: (territory: string, sector: number, amount: number) =>
    `   Territory: ${territory}, Sector: ${sector}, Amount: ${amount}`,
  IN_STORM_YES: () => "   In Storm: Yes - No spice placed",
  IN_STORM_NO: () => "   In Storm: No - Spice will be placed",
  SPICE_PLACEMENT_CHECK: (territory: string, sector: number) =>
    `   🔍 Checking spice placement: ${territory} (Sector ${sector})`,
  CURRENT_STORM_SECTOR: (sector: number) =>
    `      Current storm sector: ${sector}`,
  IN_STORM_STATUS: (inStorm: boolean) => `      In storm: ${inStorm}`,
  SPICE_NOT_PLACED: (sector: number) =>
    `   ❌ Spice NOT placed - Sector ${sector} is in storm`,
  SPICE_PLACED: (amount: number, territory: string, sector: number) =>
    `   ✅ ${amount} spice placed in ${territory} (Sector ${sector})`,
  SHAI_HULUD_DEVOURS: (territory: string, sector: number) =>
    `\n   🐛 Shai-Hulud devours in ${territory} (Sector ${sector})`,
  DEVOUR_LOCATION_SOURCE: () =>
    `   📍 Location from topmost Territory Card in discard pile`,
  NO_TERRITORY_CARD: () =>
    `\n   🐛 Shai-Hulud appears but no Territory Card in discard pile - nothing to devour`,
  CONTINUE_DRAWING: () =>
    `   🔄 Continuing to draw cards until a Territory Card appears...\n`,
  TERRITORY_CARD_FOUND: (count: number) =>
    `\n   ✅ Territory Card found after ${count} Shai-Hulud card(s)`,
  NEXUS_WILL_OCCUR: () => `   🔔 Nexus will now occur!\n`,
  FREMEN_IN_GAME: () => `   🏜️  Fremen in game - they may choose to ride the worm\n`,
  FREMEN_PROTECT: () => `   🛡️  Fremen chooses to PROTECT their ally from the sandworm\n`,
  FREMEN_ALLOW: () => `   ⚔️  Fremen allows their ally to be devoured by the sandworm\n`,
  ALLY_FORCES: (ally: string, count: number, territory: string) =>
    `\n   🤝 Fremen's ally ${ally} has ${count} forces in ${territory}`,
  ASK_PROTECTION: () => `   ❓ Asking Fremen if they want to protect their ally from the sandworm\n`,
  LEADER_PROTECTED: (faction: string, count: number, territory: string) =>
    `   🛡️  ${count} ${faction} leader(s) protected from sandworm in ${territory}`,
  ALLY_PROTECTED: (faction: string, count: number) =>
    `   🛡️  ${count} ${faction} forces protected by Fremen`,
  NEXUS_TRIGGERED: () => "🤝 NEXUS TRIGGERED",
  ALLIANCES_AVAILABLE: () => "   Alliances can be formed and broken\n",
  VALIDATION_PASSED: (sector: number) =>
    `\n✅ Validation: No spice in storm sector ${sector} after spice blow phase`,
  VALIDATION_FAILED: (sector: number) =>
    "\n❌ ERROR: Spice found in storm sector after spice blow phase",
  VALIDATION_STORM_SECTOR: (sector: number) => `   Storm Sector: ${sector}`,
  VALIDATION_SPICE_IN_STORM: () =>
    "   This should never happen - spice placement should be blocked by isInStorm() check",
} as const;

