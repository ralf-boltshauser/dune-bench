/**
 * Phase Logging Service
 * 
 * Centralized logging for the Shipment & Movement phase.
 * Provides consistent logging format and easy enable/disable.
 */

import { Faction, type GameState } from "../../../../types";
import { FACTION_NAMES } from "../../../../types";

/**
 * Phase logger for consistent logging throughout the phase
 */
export class PhaseLogger {
  private enabled: boolean = true;

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log phase start
   */
  logPhaseStart(state: GameState, stormOrder: Faction[]): void {
    if (!this.enabled) return;

    console.log("\n" + "=".repeat(80));
    console.log("🚢 SHIPMENT & MOVEMENT PHASE (Turn " + state.turn + ")");
    console.log("=".repeat(80));
    console.log(`\n📍 Storm Sector: ${state.stormSector}`);
    console.log(
      `📋 Storm Order: ${stormOrder
        .map((f) => FACTION_NAMES[f])
        .join(" → ")}`
    );
    console.log(
      `\n  Rule 1.06.12.01: Each faction does SHIPMENT then MOVEMENT sequentially.`
    );
    console.log(`  Play proceeds in Storm Order until all players complete.\n`);
  }

  /**
   * Log ornithopter access
   */
  logOrnithopterAccess(factions: Faction[]): void {
    if (!this.enabled) return;

    for (const faction of factions) {
      console.log(
        `   🚁 ${FACTION_NAMES[faction]} has ornithopter access (forces in Arrakeen/Carthag at phase start)`
      );
    }
  }

  /**
   * Log Guild timing options
   */
  logGuildTimingOptions(): void {
    if (!this.enabled) return;

    console.log(
      `  ⚠️  Spacing Guild: Can act out of order (SHIP AS IT PLEASES YOU)`
    );
    console.log(`     - NOW: Act immediately before all others`);
    console.log(`     - LATER: Ask before each faction until Guild acts`);
    console.log(`     - DELAY_TO_END: Go after all other factions\n`);
    console.log("=".repeat(80) + "\n");
  }

  /**
   * Log phase separator
   */
  logPhaseSeparator(): void {
    if (!this.enabled) return;
    console.log("=".repeat(80) + "\n");
  }

  /**
   * Log faction action
   */
  logFactionAction(faction: Faction, action: string, details?: string): void {
    if (!this.enabled) return;
    const detailsStr = details ? ` ${details}` : "";
    console.log(`\n${action}: ${FACTION_NAMES[faction]}${detailsStr}`);
  }

  /**
   * Log shipment details
   */
  logShipmentDetails(
    faction: Faction,
    reserves: { regular: number; elite: number },
    spice: number,
    costInfo: string
  ): void {
    if (!this.enabled) return;
    const totalReserves = reserves.regular + reserves.elite;
    console.log(
      `   Reserves: ${totalReserves} forces (${reserves.regular} regular, ${reserves.elite} elite)`
    );
    console.log(`   Spice: ${spice}`);
    console.log(`   ${costInfo}`);
  }

  /**
   * Log movement details
   */
  logMovementDetails(faction: Faction, range: number, hasOrnithopters: boolean): void {
    if (!this.enabled) return;
    console.log(
      `   Movement Range: ${range} territory${range !== 1 ? "ies" : ""}${hasOrnithopters ? " (Ornithopters)" : ""}`
    );
  }

  /**
   * Log action result
   */
  logActionResult(message: string): void {
    if (!this.enabled) return;
    console.log(`   ${message}\n`);
  }

  /**
   * Log pass action
   */
  logPass(faction: Faction, action: string): void {
    if (!this.enabled) return;
    console.log(`   ⏭️  ${FACTION_NAMES[faction]} passes on ${action}\n`);
  }

  /**
   * Log completion
   */
  logCompletion(faction: Faction): void {
    if (!this.enabled) return;
    console.log(`\n   ✅ ${FACTION_NAMES[faction]} completed ship + move`);
  }

  /**
   * Log error
   */
  logError(message: string): void {
    if (!this.enabled) return;
    console.error(`   ❌ ${message}\n`);
  }

  /**
   * Log warning
   */
  logWarning(message: string): void {
    if (!this.enabled) return;
    console.log(`   ⚠️  ${message}\n`);
  }

  /**
   * Log info
   */
  logInfo(message: string): void {
    if (!this.enabled) return;
    console.log(`   ℹ️  ${message}\n`);
  }

  /**
   * Log BG ability
   */
  logBGAbility(ability: string, message: string): void {
    if (!this.enabled) return;
    console.log(`\n${ability}: ${message}\n`);
  }

  /**
   * Log Guild timing decision
   */
  logGuildTiming(decision: string): void {
    if (!this.enabled) return;
    console.log(`\n⏰ GUILD TIMING: ${decision}`);
  }

  /**
   * Log phase complete
   */
  logPhaseComplete(): void {
    if (!this.enabled) return;
    console.log(`\n✅ All factions have completed Shipment & Movement\n`);
    console.log("=".repeat(80) + "\n");
  }
}

