#!/usr/bin/env tsx
/**
 * Game Log Investigation Utility
 *
 * Helps investigate game events and state changes by parsing events.jsonl files
 * and providing useful queries and visualizations.
 *
 * Usage:
 *   pnpm tsx scripts/investigate-game-logs.ts <gameId> [options]
 *
 * Examples:
 *   pnpm tsx scripts/investigate-game-logs.ts game_mikdxknf_0a765d56
 *   pnpm tsx scripts/investigate-game-logs.ts game_mikdxknf_0a765d56 --faction fremen
 *   pnpm tsx scripts/investigate-game-logs.ts game_mikdxknf_0a765d56 --forces
 *   pnpm tsx scripts/investigate-game-logs.ts game_mikdxknf_0a765d56 --phase storm --turn 2
 *   pnpm tsx scripts/investigate-game-logs.ts game_mikdxknf_0a765d56 --phase setup
 */

import * as fs from "fs";
import * as path from "path";

interface GameEvent {
  id: string;
  type: string;
  gameId: string;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // Utility script - accept any data structure
  seq: number;
}

interface ForceStack {
  factionId: string;
  territoryId: string;
  sector: number;
  forces: {
    regular: number;
    elite: number;
  };
}

interface FactionState {
  factionId: string;
  forces: {
    reserves: { regular: number; elite: number };
    onBoard: ForceStack[];
    tanks: { regular: number; elite: number };
  };
}

const VALID_FREMEN_TERRITORIES = [
  "sietch_tabr",
  "false_wall_south",
  "false_wall_west",
];

function loadEvents(gameId: string): GameEvent[] {
  const eventsPath = path.join(
    process.cwd(),
    "data",
    "games",
    gameId,
    "events.jsonl"
  );
  if (!fs.existsSync(eventsPath)) {
    throw new Error(`Events file not found: ${eventsPath}`);
  }

  const content = fs.readFileSync(eventsPath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        const parsed = JSON.parse(line);
        // Use the event's own seq field if it exists, otherwise use line number
        return { ...parsed, seq: parsed.seq ?? index + 1 };
      } catch (e) {
        console.error(`Failed to parse line ${index + 1}:`, e);
        return null;
      }
    })
    .filter((e): e is GameEvent => e !== null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFremenForces(state: any): ForceStack[] {
  const factions = state?.factions;
  if (!factions || !factions.entries) return [];

  for (const [factionId, factionState] of factions.entries) {
    if (factionId === "fremen") {
      return (factionState as FactionState).forces?.onBoard || [];
    }
  }
  return [];
}

function analyzeFremenForces(events: GameEvent[]) {
  console.log("\n" + "=".repeat(80));
  console.log("FREMEN FORCES ANALYSIS");
  console.log("=".repeat(80));

  const stateUpdates = events.filter((e) => e.type === "GAME_STATE_UPDATE");

  for (const event of stateUpdates) {
    const state = event.data?.state;
    if (!state) continue;

    const fremenForces = getFremenForces(state);
    if (fremenForces.length === 0) continue;

    const phase = state.phase || "unknown";
    const turn = state.turn || 0;

    console.log(`\nSeq ${event.seq} (Turn ${turn}, Phase ${phase}):`);

    let hasInvalid = false;
    for (const stack of fremenForces) {
      const isValid = VALID_FREMEN_TERRITORIES.includes(stack.territoryId);
      const status = isValid ? "✅" : "❌ INVALID";
      const total = stack.forces.regular + stack.forces.elite;

      if (!isValid) hasInvalid = true;

      console.log(
        `  ${status} ${stack.territoryId} sector ${stack.sector}: ${total} forces ` +
          `(${stack.forces.regular} regular, ${stack.forces.elite} elite)`
      );
    }

    if (hasInvalid) {
      console.log(`  ⚠️  WARNING: Invalid territories detected!`);
      console.log(
        `     Valid territories: ${VALID_FREMEN_TERRITORIES.join(", ")}`
      );
    }
  }
}

function showForcePlacement(events: GameEvent[]) {
  console.log("\n" + "=".repeat(80));
  console.log("FORCE PLACEMENT EVENTS");
  console.log("=".repeat(80));

  const placements = events.filter(
    (e) => e.type === "PHASE_EVENT" && e.data?.event?.type === "FORCES_PLACED"
  );

  for (const event of placements) {
    const phaseEvent = event.data?.event;
    const faction = phaseEvent?.data?.faction;
    const distribution = phaseEvent?.data?.distribution;

    console.log(
      `\nSeq ${event.seq}: ${faction?.toUpperCase()} force placement`
    );
    console.log(`  Message: ${phaseEvent?.message || "N/A"}`);

    if (distribution) {
      console.log("  Distribution:");
      for (const [territory, data] of Object.entries(distribution)) {
        if (typeof data === "object" && data !== null && "count" in data) {
          const d = data as { count: number; sector: number };
          const isValid =
            faction === "fremen"
              ? VALID_FREMEN_TERRITORIES.includes(territory)
              : true;
          const status = isValid ? "✅" : "❌";
          console.log(
            `    ${status} ${territory}: ${d.count} forces in sector ${d.sector}`
          );
        }
      }
    }
  }
}

function showPhaseTransitions(events: GameEvent[]) {
  console.log("\n" + "=".repeat(80));
  console.log("PHASE TRANSITIONS");
  console.log("=".repeat(80));

  const transitions: Array<{
    seq: number;
    from: string;
    to: string;
    turn: number;
  }> = [];
  let lastPhase = "unknown";
  let lastTurn = 0;

  for (const event of events) {
    if (event.type === "GAME_STATE_UPDATE") {
      const state = event.data?.state;
      if (state) {
        const currentPhase = state.phase || "unknown";
        const currentTurn = state.turn || 0;

        if (currentPhase !== lastPhase || currentTurn !== lastTurn) {
          transitions.push({
            seq: event.seq,
            from: lastPhase,
            to: currentPhase,
            turn: currentTurn,
          });
          lastPhase = currentPhase;
          lastTurn = currentTurn;
        }
      }
    }
  }

  for (const transition of transitions) {
    console.log(
      `Seq ${transition.seq}: Turn ${transition.turn} - ` +
        `${transition.from} → ${transition.to}`
    );
  }
}

function showFactionForcesTimeline(events: GameEvent[], faction?: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`FORCES TIMELINE${faction ? ` (${faction.toUpperCase()})` : ""}`);
  console.log("=".repeat(80));

  const stateUpdates = events.filter((e) => e.type === "GAME_STATE_UPDATE");

  for (const event of stateUpdates) {
    const state = event.data?.state;
    if (!state) continue;

    const factions = state?.factions?.entries || [];
    const phase = state.phase || "unknown";
    const turn = state.turn || 0;

    for (const [factionId, factionState] of factions) {
      if (faction && factionId !== faction) continue;

      const fs = factionState as FactionState;
      const onBoard = fs.forces?.onBoard || [];
      const reserves = fs.forces?.reserves || { regular: 0, elite: 0 };
      const totalOnBoard = onBoard.reduce(
        (sum, stack) => sum + stack.forces.regular + stack.forces.elite,
        0
      );

      if (onBoard.length > 0 || totalOnBoard > 0) {
        console.log(
          `\nSeq ${
            event.seq
          } (Turn ${turn}, Phase ${phase}) - ${factionId.toUpperCase()}:`
        );
        console.log(
          `  Reserves: ${reserves.regular} regular, ${reserves.elite} elite`
        );
        console.log(
          `  On Board: ${totalOnBoard} total forces in ${onBoard.length} stacks`
        );

        if (onBoard.length > 0) {
          for (const stack of onBoard) {
            const total = stack.forces.regular + stack.forces.elite;
            console.log(
              `    - ${stack.territoryId} sector ${stack.sector}: ${total} forces`
            );
          }
        }
      }
    }
  }
}

function showEventSummary(events: GameEvent[]) {
  console.log("\n" + "=".repeat(80));
  console.log("EVENT SUMMARY");
  console.log("=".repeat(80));

  const byType = new Map<string, number>();
  for (const event of events) {
    const count = byType.get(event.type) || 0;
    byType.set(event.type, count + 1);
  }

  console.log(`\nTotal events: ${events.length}`);
  console.log("\nEvents by type:");
  for (const [type, count] of Array.from(byType.entries()).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${type}: ${count}`);
  }
}

/**
 * Filter events by phase and/or turn.
 * Tracks phase/turn from state updates and includes all events that occurred during that phase/turn.
 */
function filterEventsByPhaseAndTurn(
  events: GameEvent[],
  targetPhase?: string,
  targetTurn?: number
): GameEvent[] {
  if (!targetPhase && !targetTurn) {
    return events;
  }

  // Build a map of sequence numbers to phase/turn
  const phaseTurnMap = new Map<number, { phase: string; turn: number }>();
  let currentPhase = "unknown";
  let currentTurn = 0;

  // First pass: track phase/turn from state updates AND phase/turn events
  for (const event of events) {
    if (event.type === "GAME_STATE_UPDATE") {
      const state = event.data?.state;
      if (state) {
        currentPhase = state.phase || "unknown";
        currentTurn = state.turn || 0;
        phaseTurnMap.set(event.seq, { phase: currentPhase, turn: currentTurn });
      }
    } else if (event.type === "PHASE_EVENT") {
      // Also track from PHASE_STARTED and TURN_STARTED events
      const phaseEvent = event.data?.event;
      if (phaseEvent) {
        if (phaseEvent.type === "TURN_STARTED") {
          const turn = phaseEvent.data?.turn || phaseEvent.data?.nextTurn;
          if (turn) {
            currentTurn = turn;
          }
        } else if (phaseEvent.type === "PHASE_STARTED") {
          const phase = phaseEvent.data?.phase;
          if (phase) {
            currentPhase = phase;
          }
        }
      }
    } else if (event.type === "TURN_STARTED") {
      const turn = event.data?.turn || event.data?.nextTurn;
      if (turn) {
        currentTurn = turn;
      }
    } else if (event.type === "PHASE_STARTED") {
      const phase = event.data?.phase;
      if (phase) {
        currentPhase = phase;
      }
    }
  }

  // Second pass: assign phase/turn to all events based on the last known state/event
  const filtered: GameEvent[] = [];
  let lastKnownPhase = "unknown";
  let lastKnownTurn = 0;

  for (const event of events) {
    // Update from state updates
    if (event.type === "GAME_STATE_UPDATE") {
      const state = event.data?.state;
      if (state) {
        lastKnownPhase = state.phase || "unknown";
        lastKnownTurn = state.turn || 0;
      }
    } else if (event.type === "PHASE_EVENT") {
      // Also update from PHASE_STARTED and TURN_STARTED events
      const phaseEvent = event.data?.event;
      if (phaseEvent) {
        if (phaseEvent.type === "TURN_STARTED") {
          const turn = phaseEvent.data?.turn || phaseEvent.data?.nextTurn;
          if (turn) {
            lastKnownTurn = turn;
          }
        } else if (phaseEvent.type === "PHASE_STARTED") {
          const phase = phaseEvent.data?.phase;
          if (phase) {
            lastKnownPhase = phase;
          }
        }
      }
    } else if (event.type === "TURN_STARTED") {
      const turn = event.data?.turn || event.data?.nextTurn;
      if (turn) {
        lastKnownTurn = turn;
      }
    } else if (event.type === "PHASE_STARTED") {
      const phase = event.data?.phase;
      if (phase) {
        lastKnownPhase = phase;
      }
    }

    // Check if this event matches our filter
    // For GAME_STATE_UPDATE, use the state's phase/turn (most authoritative)
    // For other events, check the event's own data first, then fall back to context
    let eventPhase = lastKnownPhase;
    let eventTurn = lastKnownTurn;

    if (event.type === "GAME_STATE_UPDATE") {
      // Always use state's own phase/turn - it's the source of truth
      const state = event.data?.state;
      if (state) {
        eventPhase = state.phase || "unknown";
        eventTurn = state.turn || 0;
      }
    } else if (event.type === "PHASE_EVENT") {
      const phaseEvent = event.data?.event;
      if (phaseEvent) {
        if (phaseEvent.type === "TURN_STARTED") {
          const turn = phaseEvent.data?.turn || phaseEvent.data?.nextTurn;
          if (turn) eventTurn = turn;
        } else if (phaseEvent.type === "PHASE_STARTED") {
          const phase = phaseEvent.data?.phase;
          if (phase) eventPhase = phase;
        }
        // For other phase events, keep using context (they don't have their own phase/turn)
      }
    } else if (event.type === "TURN_STARTED") {
      const turn = event.data?.turn || event.data?.nextTurn;
      if (turn) eventTurn = turn;
    } else if (event.type === "PHASE_STARTED") {
      const phase = event.data?.phase;
      if (phase) eventPhase = phase;
    }

    // Special handling: Include TURN_STARTED/PHASE_STARTED events if they match their respective filter
    // even if the other condition isn't met yet (they're transition events)
    const isTurnStarted =
      (event.type === "PHASE_EVENT" &&
        event.data?.event?.type === "TURN_STARTED") ||
      event.type === "TURN_STARTED";
    const isPhaseStarted =
      (event.type === "PHASE_EVENT" &&
        event.data?.event?.type === "PHASE_STARTED") ||
      event.type === "PHASE_STARTED";

    // For transition events, be more lenient - match if they match their specific filter
    if (isTurnStarted && targetTurn) {
      const turn =
        event.type === "PHASE_EVENT"
          ? event.data?.event?.data?.turn || event.data?.event?.data?.nextTurn
          : event.data?.turn || event.data?.nextTurn;
      if (turn === targetTurn) {
        filtered.push(event);
        continue;
      }
    }

    if (isPhaseStarted && targetPhase) {
      const phase =
        event.type === "PHASE_EVENT"
          ? event.data?.event?.data?.phase
          : event.data?.phase;
      // Only include if both phase matches AND we're not filtering by turn, OR turn also matches
      if (phase && phase.toLowerCase() === targetPhase.toLowerCase()) {
        // If filtering by turn too, check if we're in the right turn context
        if (!targetTurn || eventTurn === targetTurn) {
          filtered.push(event);
          continue;
        }
      }
    }

    const phaseMatch =
      !targetPhase || eventPhase.toLowerCase() === targetPhase.toLowerCase();
    const turnMatch = !targetTurn || eventTurn === targetTurn;

    if (phaseMatch && turnMatch) {
      filtered.push(event);
    }
  }

  return filtered;
}

/**
 * Show all events filtered by phase and/or turn - SHOW EVERYTHING
 */
function showFilteredEvents(
  events: GameEvent[],
  phase?: string,
  turn?: number
) {
  const filtered = filterEventsByPhaseAndTurn(events, phase, turn);

  const title =
    phase && turn
      ? `EVENTS: ${phase.toUpperCase()} PHASE, TURN ${turn}`
      : phase
      ? `EVENTS: ${phase.toUpperCase()} PHASE`
      : turn
      ? `EVENTS: TURN ${turn}`
      : "ALL EVENTS";

  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
  console.log(`\nFound ${filtered.length} events\n`);

  let currentPhase = "unknown";
  let currentTurn = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let previousState: any = null;

  for (const event of filtered) {
    // Update phase/turn from state updates
    if (event.type === "GAME_STATE_UPDATE") {
      const state = event.data?.state;
      if (state) {
        currentPhase = state.phase || "unknown";
        currentTurn = state.turn || 0;
      }
    }

    // Show event with context
    const context =
      currentPhase !== "unknown" || currentTurn > 0
        ? ` (Turn ${currentTurn}, Phase ${currentPhase})`
        : "";

    console.log("\n" + "-".repeat(80));
    console.log(`[Seq ${event.seq}]${context} ${event.type}`);
    console.log(`  Timestamp: ${new Date(event.timestamp).toISOString()}`);
    console.log(`  Event ID: ${event.id}`);

    // Pretty print event data based on type
    if (event.data) {
      if (event.type === "GAME_STATE_UPDATE") {
        const state = event.data.state;
        if (state) {
          console.log(`  📍 Phase: ${state.phase || "unknown"}`);
          console.log(`  🔢 Turn: ${state.turn || 0}`);
          console.log(`  🌪️  Storm Sector: ${state.stormSector || "N/A"}`);

          // Show faction summary
          const factions = state.factions?.entries || [];
          if (factions.length > 0) {
            console.log(`  👥 Factions (${factions.length}):`);
            for (const [factionId, factionState] of factions) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fs = factionState as any;
              const spice = fs.spice || 0;
              const onBoard = fs.forces?.onBoard || [];
              const reserves = fs.forces?.reserves || { regular: 0, elite: 0 };
              const totalOnBoard = onBoard.reduce(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sum: number, stack: any) =>
                  sum +
                  (stack.forces?.regular || 0) +
                  (stack.forces?.elite || 0),
                0
              );
              console.log(
                `    - ${factionId.toUpperCase()}: ${spice} spice, ${totalOnBoard} on board, ${
                  reserves.regular + reserves.elite
                } reserves`
              );
            }
          }

          // Show key state changes if we have previous state
          if (previousState) {
            const prevFactions = previousState.factions?.entries || [];
            const currFactions = state.factions?.entries || [];
            const prevSpiceOnBoard = previousState.spiceOnBoard?.length || 0;
            const currSpiceOnBoard = state.spiceOnBoard?.length || 0;

            if (
              prevSpiceOnBoard !== currSpiceOnBoard ||
              prevFactions.length !== currFactions.length
            ) {
              console.log(`  ⚡ State Changes Detected:`);

              // Check spice on board
              if (prevSpiceOnBoard !== currSpiceOnBoard) {
                console.log(
                  `    - Spice on board: ${prevSpiceOnBoard} → ${currSpiceOnBoard}`
                );
              }

              // Check faction spice changes
              for (const [factionId, currFs] of currFactions) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prevFs = prevFactions.find(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ([f]: any[]) => f === factionId
                )?.[1];
                if (prevFs) {
                  const prevSpice = prevFs.spice || 0;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const currSpice = (currFs as any).spice || 0;
                  if (prevSpice !== currSpice) {
                    console.log(
                      `    - ${factionId} spice: ${prevSpice} → ${currSpice} (${
                        currSpice > prevSpice ? "+" : ""
                      }${currSpice - prevSpice})`
                    );
                  }
                }
              }
            }
          }

          previousState = state;
        }
      } else if (event.type === "PHASE_EVENT") {
        const phaseEvent = event.data.event;
        if (phaseEvent) {
          console.log(`  📋 Event Type: ${phaseEvent.type}`);
          console.log(`  💬 Message: ${phaseEvent.message || "N/A"}`);
          if (phaseEvent.data) {
            const dataStr = JSON.stringify(phaseEvent.data, null, 2);
            console.log(
              `  📦 Data:\n${dataStr
                .split("\n")
                .map((line) => "    " + line)
                .join("\n")}`
            );
          }
        }
      } else if (event.type === "AGENT_DECISION") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  🤖 Faction: ${data.faction || "unknown"}`);
        console.log(`  ✅ Action Type: ${data.actionType || "unknown"}`);
        if (data.reasoning) {
          console.log(`  💭 Reasoning: ${data.reasoning}`);
        }
        if (data.data) {
          const dataStr = JSON.stringify(data.data, null, 2);
          console.log(
            `  📦 Action Data:\n${dataStr
              .split("\n")
              .map((line) => "    " + line)
              .join("\n")}`
          );
        }
      } else if (event.type === "AGENT_TOOL_CALL") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  🤖 Faction: ${data.faction || "unknown"}`);
        console.log(`  🔧 Tool: ${data.toolName || "unknown"}`);
        if (data.input) {
          const inputStr = JSON.stringify(data.input, null, 2);
          console.log(
            `  📥 Input:\n${inputStr
              .split("\n")
              .map((line) => "    " + line)
              .join("\n")}`
          );
        }
      } else if (event.type === "AGENT_TOOL_RESULT") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  🤖 Faction: ${data.faction || "unknown"}`);
        console.log(`  🔧 Tool: ${data.toolName || "unknown"}`);
        if (data.result) {
          const resultStr = JSON.stringify(data.result, null, 2);
          console.log(
            `  📤 Result:\n${resultStr
              .split("\n")
              .map((line) => "    " + line)
              .join("\n")}`
          );
        }
      } else if (event.type === "AGENT_THINKING") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  🤖 Faction: ${data.faction || "unknown"}`);
        console.log(`  💭 Thinking...`);
      } else if (event.type === "PHASE_STARTED") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  ▶️  Phase: ${data.phase || "unknown"}`);
        if (data.message) {
          console.log(`  💬 ${data.message}`);
        }
      } else if (event.type === "PHASE_ENDED") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  ⏹️  Phase: ${data.phase || "unknown"}`);
        if (data.message) {
          console.log(`  💬 ${data.message}`);
        }
      } else if (event.type === "TURN_STARTED") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = event.data as any;
        console.log(`  🔄 Turn: ${data.turn || "unknown"}`);
        if (data.message) {
          console.log(`  💬 ${data.message}`);
        }
      } else if (
        event.type === "GAME_STARTED" ||
        event.type === "GAME_CREATED" ||
        event.type === "GAME_COMPLETED"
      ) {
        const dataStr = JSON.stringify(event.data, null, 2);
        console.log(
          `  📦 Data:\n${dataStr
            .split("\n")
            .map((line) => "    " + line)
            .join("\n")}`
        );
      } else {
        // Generic data display - SHOW FULL DATA, NO TRUNCATION
        const dataStr = JSON.stringify(event.data, null, 2);
        console.log(
          `  📦 Full Data:\n${dataStr
            .split("\n")
            .map((line) => "    " + line)
            .join("\n")}`
        );
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`Total: ${filtered.length} events displayed`);
  console.log("=".repeat(80));
}

function main() {
  const args = process.argv.slice(2);
  const gameId = args[0];

  if (!gameId) {
    console.error(
      "Usage: pnpm tsx scripts/investigate-game-logs.ts <gameId> [options]"
    );
    console.error("\nOptions:");
    console.error("  --forces          Show force placement and timeline");
    console.error("  --faction <name>  Filter by faction (e.g., fremen)");
    console.error("  --phase <name>    Filter by phase (e.g., storm, setup)");
    console.error("  --turn <number>   Filter by turn number (e.g., 2)");
    console.error(
      "  --fremen-check    Check Fremen forces for invalid territories"
    );
    console.error("  --transitions     Show phase transitions");
    console.error("  --summary         Show event summary");
    console.error("\nExamples:");
    console.error("  # Show all events from Storm phase, Turn 2");
    console.error(
      "  pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase storm --turn 2"
    );
    console.error("  # Show all events from a specific phase");
    console.error(
      "  pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase storm"
    );
    console.error("  # Show all events from a specific turn");
    console.error(
      "  pnpm tsx scripts/investigate-game-logs.ts <gameId> --turn 2"
    );
    process.exit(1);
  }

  try {
    const events = loadEvents(gameId);
    console.log(`\nLoaded ${events.length} events from game: ${gameId}\n`);

    const phaseIndex = args.indexOf("--phase");
    const turnIndex = args.indexOf("--turn");

    const options = {
      forces: args.includes("--forces"),
      faction: args[args.indexOf("--faction") + 1],
      phase: phaseIndex >= 0 ? args[phaseIndex + 1] : undefined,
      turn: turnIndex >= 0 ? parseInt(args[turnIndex + 1], 10) : undefined,
      fremenCheck: args.includes("--fremen-check"),
      transitions: args.includes("--transitions"),
      summary: args.includes("--summary"),
    };

    // Default: show summary and fremen check if no specific options
    if (
      !options.forces &&
      !options.faction &&
      !options.phase &&
      !options.turn &&
      !options.fremenCheck &&
      !options.transitions
    ) {
      options.summary = true;
      options.fremenCheck = true;
    }

    if (options.summary) {
      showEventSummary(events);
    }

    if (options.fremenCheck) {
      analyzeFremenForces(events);
    }

    if (options.forces) {
      showForcePlacement(events);
      showFactionForcesTimeline(events, options.faction);
    }

    if (options.transitions) {
      showPhaseTransitions(events);
    }

    if (options.faction && !options.forces) {
      showFactionForcesTimeline(events, options.faction);
    }

    // Show filtered events if phase or turn is specified
    if (options.phase || options.turn) {
      showFilteredEvents(events, options.phase, options.turn);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
