#!/usr/bin/env npx tsx

/**
 * Full Game Test - 6 Factions
 *
 * Runs a complete 6-faction game and validates each phase.
 * Logs everything to files for review.
 * Continues until all phases are validated and working.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { runDuneGame, type GameRunnerConfig } from "./agent";
import type { PhaseEvent } from "./phases/types";
import { generateSnapshotName, saveStateToFile } from "./state/serialize";
import type { GameState } from "./types";
import { Faction, FACTION_NAMES, Phase } from "./types";

// =============================================================================
// LOGGING
// =============================================================================

interface PhaseValidation {
  phase: Phase;
  passed: boolean;
  errors: string[];
  warnings: string[];
  events: PhaseEvent[];
  startState?: GameState;
  endState?: GameState;
}

class FullGameLogger {
  private logDir: string;
  private logFile: string;
  private gameId: string;
  private validations: PhaseValidation[] = [];
  private allEvents: PhaseEvent[] = [];
  private consoleOutput: string[] = [];

  constructor(gameId: string) {
    this.gameId = gameId;
    this.logDir = path.join(process.cwd(), "test-logs", "full-game");

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFile = path.join(
      this.logDir,
      `full-game-6-factions-${timestamp}.log`
    );
  }

  logConsole(message: string): void {
    this.consoleOutput.push(message);
    console.log(message);
  }

  addValidation(validation: PhaseValidation): void {
    this.validations.push(validation);
  }

  addEvent(event: PhaseEvent): void {
    this.allEvents.push(event);
  }

  writeLog(
    finalState: GameState,
    result: { winner: any; totalTurns: number }
  ): void {
    const lines: string[] = [];

    // Header
    lines.push("=".repeat(100));
    lines.push("FULL GAME TEST - 6 FACTIONS");
    lines.push("=".repeat(100));
    lines.push(`Game ID: ${this.gameId}`);
    lines.push(`Test Date: ${new Date().toISOString()}`);
    lines.push(`Total Turns: ${result.totalTurns}`);
    lines.push(
      `Winner: ${result.winner ? JSON.stringify(result.winner) : "None"}`
    );
    lines.push("");
    lines.push("=".repeat(100));
    lines.push("");

    // Phase Validations
    lines.push("PHASE VALIDATIONS");
    lines.push("=".repeat(100));
    lines.push("");

    for (const validation of this.validations) {
      const status = validation.passed ? "✅ PASS" : "❌ FAIL";
      lines.push(`${status} - ${validation.phase}`);
      lines.push(`  Events: ${validation.events.length}`);

      if (validation.errors.length > 0) {
        lines.push(`  Errors (${validation.errors.length}):`);
        validation.errors.forEach((err) => lines.push(`    - ${err}`));
      }

      if (validation.warnings.length > 0) {
        lines.push(`  Warnings (${validation.warnings.length}):`);
        validation.warnings.forEach((warn) => lines.push(`    - ${warn}`));
      }

      lines.push("");
    }

    // Summary
    lines.push("=".repeat(100));
    lines.push("SUMMARY");
    lines.push("=".repeat(100));
    lines.push("");

    const passed = this.validations.filter((v) => v.passed).length;
    const failed = this.validations.filter((v) => !v.passed).length;
    lines.push(`Total Phases: ${this.validations.length}`);
    lines.push(`Passed: ${passed}`);
    lines.push(`Failed: ${failed}`);
    lines.push("");

    // All Events
    lines.push("=".repeat(100));
    lines.push("ALL EVENTS");
    lines.push("=".repeat(100));
    lines.push("");

    for (const event of this.allEvents) {
      lines.push(`[${event.type}] ${event.message}`);
      if (event.data) {
        lines.push(`  Data: ${JSON.stringify(event.data, null, 2)}`);
      }
      lines.push("");
    }

    // Console Output
    lines.push("=".repeat(100));
    lines.push("CONSOLE OUTPUT");
    lines.push("=".repeat(100));
    lines.push("");
    lines.push(...this.consoleOutput);

    // Final State
    lines.push("");
    lines.push("=".repeat(100));
    lines.push("FINAL STATE");
    lines.push("=".repeat(100));
    lines.push("");
    lines.push(`Turn: ${finalState.turn}`);
    lines.push(`Phase: ${finalState.phase}`);
    lines.push(`Storm Sector: ${finalState.stormSector}`);
    lines.push("");

    for (const [faction, fs] of finalState.factions.entries()) {
      lines.push(`${FACTION_NAMES[faction]}:`);
      lines.push(`  Spice: ${fs.spice}`);
      lines.push(`  Forces on board: ${fs.forces.onBoard.length} stacks`);
      lines.push(
        `  Forces in reserves: ${fs.forces.reserves.regular} regular, ${fs.forces.reserves.elite} elite`
      );
      lines.push(
        `  Forces in tanks: ${fs.forces.tanks.regular} regular, ${fs.forces.tanks.elite} elite`
      );
      lines.push(`  Leaders: ${fs.leaders.length} total`);
      lines.push(`  Hand size: ${fs.hand.length}`);
      lines.push(`  Traitors: ${fs.traitors.length}`);
      lines.push("");
    }

    lines.push("=".repeat(100));
    lines.push("END OF LOG");
    lines.push("=".repeat(100));

    fs.writeFileSync(this.logFile, lines.join("\n"), "utf-8");
    console.log(`\n📝 Full game log written to: ${this.logFile}`);
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

function validatePhase(
  phase: Phase,
  events: PhaseEvent[],
  startState: GameState,
  endState: GameState
): PhaseValidation {
  const validation: PhaseValidation = {
    phase,
    passed: true,
    errors: [],
    warnings: [],
    events,
    startState,
    endState,
  };

  // Phase-specific validations
  switch (phase) {
    case Phase.SETUP:
      validateSetup(validation, startState, endState);
      break;
    case Phase.STORM:
      validateStorm(validation, startState, endState);
      break;
    case Phase.SPICE_BLOW:
      validateSpiceBlow(validation, startState, endState);
      break;
    case Phase.CHOAM_CHARITY:
      validateChoamCharity(validation, startState, endState);
      break;
    case Phase.BIDDING:
      validateBidding(validation, startState, endState);
      break;
    case Phase.REVIVAL:
      validateRevival(validation, startState, endState);
      break;
    case Phase.SHIPMENT_MOVEMENT:
      validateShipmentMovement(validation, startState, endState);
      break;
    case Phase.BATTLE:
      validateBattle(validation, startState, endState);
      break;
    case Phase.SPICE_COLLECTION:
      validateSpiceCollection(validation, startState, endState);
      break;
    case Phase.MENTAT_PAUSE:
      validateMentatPause(validation, startState, endState);
      break;
  }

  validation.passed = validation.errors.length === 0;
  return validation;
}

function validateSetup(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that setup is complete
  if (!endState.setupComplete) {
    validation.errors.push("Setup phase did not complete");
  }

  // Check that all factions have traitors
  for (const [faction, fs] of endState.factions.entries()) {
    if (fs.traitors.length === 0) {
      validation.errors.push(
        `${FACTION_NAMES[faction]} has no traitors selected`
      );
    }
  }

  // Check Bene Gesserit prediction
  const bg = endState.factions.get(Faction.BENE_GESSERIT);
  if (bg && !bg.beneGesseritPrediction) {
    validation.warnings.push("Bene Gesserit did not make a prediction");
  }
}

function validateStorm(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that storm moved
  if (endState.turn === 1) {
    // Turn 1: storm should be placed
    if (endState.stormSector === 0) {
      validation.errors.push("Storm was not placed on Turn 1");
    }
  } else {
    // Other turns: storm should have moved
    if (endState.stormSector === startState.stormSector) {
      validation.errors.push("Storm did not move");
    }
  }

  // Check storm order exists
  if (endState.stormOrder.length === 0) {
    validation.errors.push("Storm order is empty");
  }

  // Check all factions are in storm order
  if (endState.stormOrder.length !== endState.factions.size) {
    validation.warnings.push(
      `Storm order has ${endState.stormOrder.length} factions, expected ${endState.factions.size}`
    );
  }
}

function validateSpiceBlow(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that spice cards were revealed
  const cardsRevealed = validation.events.filter(
    (e) => e.type === "SPICE_CARD_REVEALED"
  ).length;
  if (cardsRevealed === 0) {
    validation.warnings.push("No spice cards were revealed");
  }

  // Check that spice was placed on board
  const spicePlaced = validation.events.filter(
    (e) => e.type === "SPICE_PLACED"
  ).length;
  if (spicePlaced === 0 && cardsRevealed > 0) {
    validation.warnings.push(
      "Spice cards revealed but no spice placed on board"
    );
  }
}

function validateChoamCharity(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that eligible factions received charity
  for (const [faction, fs] of endState.factions.entries()) {
    const startFs = startState.factions.get(faction);
    if (!startFs) continue;

    // Eligible if spice < 2
    if (startFs.spice < 2) {
      const receivedCharity = fs.spice >= 2;
      if (!receivedCharity) {
        validation.errors.push(
          `${FACTION_NAMES[faction]} was eligible for charity but did not receive it`
        );
      }
    }
  }
}

function validateBidding(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that auction started
  const auctionStarted = validation.events.filter(
    (e) => e.type === "AUCTION_STARTED"
  ).length;
  if (auctionStarted === 0) {
    validation.warnings.push("No auction started");
  }

  // Check that bidding occurred
  const bids = validation.events.filter(
    (e) => e.type === "BID_PLACED" || e.type === "BID_PASSED"
  ).length;
  if (bids === 0) {
    validation.warnings.push("No bidding occurred");
  }

  // Check that bidding completed
  const biddingComplete = validation.events.filter(
    (e) => e.type === "BIDDING_COMPLETE"
  ).length;
  if (biddingComplete === 0 && bids > 0) {
    validation.warnings.push("Bidding occurred but did not complete");
  }
}

function validateRevival(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that revival happened (if forces in tanks)
  for (const [faction, fs] of endState.factions.entries()) {
    const startFs = startState.factions.get(faction);
    if (!startFs) continue;

    const totalInTanks =
      startFs.forces.tanks.regular + startFs.forces.tanks.elite;
    if (totalInTanks > 0) {
      const revived = validation.events.filter(
        (e) =>
          e.type === "FORCES_REVIVED" && (e.data as any)?.faction === faction
      ).length;
      if (revived === 0) {
        validation.warnings.push(
          `${FACTION_NAMES[faction]} had forces in tanks but did not revive`
        );
      }
    }
  }
}

function validateShipmentMovement(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that factions acted in storm order
  const shipments = validation.events.filter(
    (e) => e.type === "FORCES_SHIPPED"
  ).length;
  const movements = validation.events.filter(
    (e) => e.type === "FORCES_MOVED"
  ).length;

  if (shipments === 0 && movements === 0) {
    validation.warnings.push("No shipments or movements occurred");
  }
}

function validateBattle(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that battles were identified
  const battles = validation.events.filter(
    (e) => e.type === "BATTLE_STARTED"
  ).length;

  // Check that battles were resolved
  const resolved = validation.events.filter(
    (e) => e.type === "BATTLE_RESOLVED"
  ).length;

  if (battles !== resolved) {
    validation.errors.push(
      `Battles started: ${battles}, resolved: ${resolved}`
    );
  }
}

function validateSpiceCollection(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that spice was collected
  const collections = validation.events.filter(
    (e) => e.type === "SPICE_COLLECTED"
  ).length;

  // Check that spice was removed from board
  const totalSpiceBefore = startState.spiceOnBoard.reduce(
    (sum, s) => sum + s.amount,
    0
  );
  const totalSpiceAfter = endState.spiceOnBoard.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  if (
    totalSpiceBefore > 0 &&
    totalSpiceAfter === totalSpiceBefore &&
    collections === 0
  ) {
    validation.warnings.push("Spice on board but no collection occurred");
  }
}

function validateMentatPause(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Mentat pause is mostly informational, just check it completed
  if (validation.events.length === 0) {
    validation.warnings.push("No events in mentat pause phase");
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
    process.exit(1);
  }

  const allFactions: Faction[] = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
  ];

  console.log("🏜️  FULL GAME TEST - 6 FACTIONS");
  console.log("=".repeat(80));
  console.log(
    `Factions: ${allFactions.map((f) => FACTION_NAMES[f]).join(", ")}`
  );
  console.log("");

  const gameId = `full-game-${Date.now()}`;
  const logger = new FullGameLogger(gameId);

  const startTime = Date.now();

  try {
    // Track phase states
    const phaseStates = new Map<
      Phase,
      { start: GameState | null; end: GameState | null; events: PhaseEvent[] }
    >();
    let currentState: GameState | null = null;
    let currentPhase: Phase | null = null;

    const config: GameRunnerConfig = {
      factions: allFactions,
      maxTurns: 3, // Start with 3 turns for testing
      agentConfig: { verbose: true },
      gameId,
      onEvent: (event) => {
        logger.addEvent(event);

        // Track phase start/end
        if (event.type === "PHASE_STARTED") {
          const phase = (event.data as any)?.phase as Phase;
          if (phase) {
            // Save state before phase starts
            if (currentState) {
              if (!phaseStates.has(phase)) {
                phaseStates.set(phase, {
                  start: JSON.parse(JSON.stringify(currentState)),
                  end: null,
                  events: [],
                });
              } else {
                // Update start state if phase runs multiple times (multiple turns)
                phaseStates.get(phase)!.start = JSON.parse(
                  JSON.stringify(currentState)
                );
                phaseStates.get(phase)!.events = [];
              }
            }
            currentPhase = phase;
          }
        } else if (event.type === "PHASE_ENDED") {
          const phase = (event.data as any)?.phase as Phase;
          if (phase && phaseStates.has(phase)) {
            const phaseData = phaseStates.get(phase)!;
            // Save state after phase ends
            if (currentState) {
              phaseData.end = JSON.parse(JSON.stringify(currentState));
            }
          }
          currentPhase = null;
        }

        // Collect events for current phase
        if (currentPhase && phaseStates.has(currentPhase)) {
          phaseStates.get(currentPhase)!.events.push(event);
        }
      },
      onStateUpdate: (state) => {
        currentState = state;
      },
    };

    logger.logConsole("Starting full game...");
    const result = await runDuneGame(config);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    logger.logConsole(`\nGame completed in ${duration} seconds`);

    // Validate all phases
    logger.logConsole("\nValidating phases...");
    for (const [phase, phaseData] of phaseStates.entries()) {
      if (phaseData.start && phaseData.end) {
        const validation = validatePhase(
          phase,
          phaseData.events,
          phaseData.start,
          phaseData.end
        );
        logger.addValidation(validation);

        const status = validation.passed ? "✅" : "❌";
        logger.logConsole(
          `${status} ${phase}: ${validation.errors.length} errors, ${validation.warnings.length} warnings`
        );
      }
    }

    // Write log
    logger.writeLog(result.finalState, {
      winner: result.winner,
      totalTurns: result.totalTurns,
    });

    // Save state
    const snapshotName = generateSnapshotName(result.finalState);
    const snapshotPath = saveStateToFile(result.finalState, snapshotName);
    logger.logConsole(`\n💾 State saved to: ${snapshotPath}`);

    // Summary
    logger.logConsole("\n" + "=".repeat(80));
    logger.logConsole("TEST SUMMARY");
    logger.logConsole("=".repeat(80));
    const passed = logger["validations"].filter(
      (v: PhaseValidation) => v.passed
    ).length;
    const failed = logger["validations"].filter(
      (v: PhaseValidation) => !v.passed
    ).length;
    logger.logConsole(`Total Phases: ${logger["validations"].length}`);
    logger.logConsole(`Passed: ${passed}`);
    logger.logConsole(`Failed: ${failed}`);

    if (failed > 0) {
      logger.logConsole(
        "\n❌ Some phases failed validation. Check the log file for details."
      );
      process.exit(1);
    } else {
      logger.logConsole("\n✅ All phases passed validation!");
      process.exit(0);
    }
  } catch (error) {
    logger.logConsole(
      `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      logger.logConsole(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
