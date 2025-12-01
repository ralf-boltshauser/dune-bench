/**
 * Colorful Console Logger for Dune Game
 *
 * Provides colored output for game events and agent actions.
 * Uses faction-specific colors from centralized constants.
 */

import { Faction, FACTION_NAMES } from '../types';
import {
  FACTION_COLORS_TERMINAL,
  FACTION_BG_COLORS_TERMINAL,
  ANSI_RESET,
  ANSI_BOLD,
  ANSI_DIM,
  ANSI_WHITE,
  ANSI_BLACK,
  ANSI_YELLOW,
  ANSI_CYAN,
  ANSI_GREEN,
  ANSI_RED,
  ANSI_BRIGHT_BLACK,
} from '../constants/faction-colors';

// =============================================================================
// ANSI COLOR CODES (for local use in logger)
// =============================================================================

const COLORS = {
  reset: ANSI_RESET,
  bold: ANSI_BOLD,
  dim: ANSI_DIM,
  white: ANSI_WHITE,
  black: ANSI_BLACK,
  yellow: ANSI_YELLOW,
  cyan: ANSI_CYAN,
  green: ANSI_GREEN,
  red: ANSI_RED,
  brightBlack: ANSI_BRIGHT_BLACK,
} as const;

// =============================================================================
// FACTION COLORS (from centralized constants)
// =============================================================================

const FACTION_COLORS = FACTION_COLORS_TERMINAL;
const FACTION_BG_COLORS = FACTION_BG_COLORS_TERMINAL;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function colorize(text: string, ...codes: string[]): string {
  return `${codes.join('')}${text}${COLORS.reset}`;
}

function factionColor(faction: Faction, text: string): string {
  return colorize(text, FACTION_COLORS[faction], COLORS.bold);
}

function factionBadge(faction: Faction): string {
  const name = FACTION_NAMES[faction];
  return colorize(` ${name} `, FACTION_BG_COLORS[faction], COLORS.black, COLORS.bold);
}

// =============================================================================
// GAME LOGGER
// =============================================================================

export class GameLogger {
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // GAME FLOW
  // ---------------------------------------------------------------------------

  gameStart(factions: Faction[]): void {
    console.log('\n' + colorize('═'.repeat(60), COLORS.yellow));
    console.log(colorize('  🏜️  DUNE: AI SIMULATION', COLORS.yellow, COLORS.bold));
    console.log(colorize('═'.repeat(60), COLORS.yellow));
    console.log();
    console.log(colorize('Factions in game:', COLORS.dim));
    for (const faction of factions) {
      console.log(`  ${factionBadge(faction)}`);
    }
    console.log();
  }

  turnStart(turn: number, maxTurns: number): void {
    console.log('\n' + colorize(`┌${'─'.repeat(58)}┐`, COLORS.white));
    console.log(colorize(`│  📅 TURN ${turn} / ${maxTurns}${' '.repeat(46 - String(turn).length - String(maxTurns).length)}│`, COLORS.white, COLORS.bold));
    console.log(colorize(`└${'─'.repeat(58)}┘`, COLORS.white));
  }

  phaseStart(phase: string): void {
    console.log();
    console.log(colorize(`  ▶ ${phase.toUpperCase()} PHASE`, COLORS.cyan, COLORS.bold));
    console.log(colorize(`  ${'─'.repeat(50)}`, COLORS.dim));
  }

  phaseEnd(phase: string): void {
    console.log(colorize(`  ✓ ${phase} complete`, COLORS.dim));
  }

  // ---------------------------------------------------------------------------
  // AGENT ACTIONS
  // ---------------------------------------------------------------------------

  agentRequest(faction: Faction, requestType: string, prompt: string): void {
    if (!this.verbose) return;

    console.log();
    console.log(`  ${factionBadge(faction)} ${colorize('needs to decide:', COLORS.dim)}`);
    console.log(colorize(`    📋 ${requestType}`, COLORS.white, COLORS.bold));

    // Show truncated prompt
    const truncatedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
    console.log(colorize(`    ${truncatedPrompt}`, COLORS.dim));
  }

  agentThinking(faction: Faction): void {
    if (!this.verbose) return;
    process.stdout.write(factionColor(faction, `    🤔 Thinking...`));
  }

  agentToolCall(faction: Faction, toolName: string, args: Record<string, unknown>): void {
    if (!this.verbose) return;

    // Clear the "Thinking..." line
    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    console.log(factionColor(faction, `    🔧 Tool: ${toolName}`));

    // Pretty print args
    const argsStr = JSON.stringify(args, null, 2)
      .split('\n')
      .map((line, i) => i === 0 ? line : `       ${line}`)
      .join('\n');
    console.log(colorize(`       ${argsStr}`, COLORS.dim));
  }

  agentResponse(faction: Faction, actionType: string, duration: number, reasoning?: string): void {
    if (!this.verbose) return;

    // Clear any pending output
    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    console.log(factionColor(faction, `    ✓ Action: ${actionType}`));
    console.log(colorize(`      ⏱️  ${duration}ms`, COLORS.dim));

    if (reasoning) {
      console.log(colorize(`    💭 Reasoning:`, COLORS.white));
      // Word wrap reasoning
      const words = reasoning.split(' ');
      let line = '       ';
      for (const word of words) {
        if (line.length + word.length > 80) {
          console.log(colorize(line, COLORS.dim));
          line = '       ';
        }
        line += word + ' ';
      }
      if (line.trim()) {
        console.log(colorize(line, COLORS.dim));
      }
    }
  }

  agentError(faction: Faction, error: string): void {
    // Filter out non-fatal AI SDK schema serialization warnings
    // These are warnings that don't prevent tools from working
    if (error.includes('Transforms cannot be represented in JSON Schema')) {
      return; // Suppress this specific non-fatal warning
    }
    console.log(factionColor(faction, `    ❌ Error: ${error}`));
  }

  // ---------------------------------------------------------------------------
  // GAME EVENTS
  // ---------------------------------------------------------------------------

  event(message: string, emoji: string = '📌'): void {
    console.log(colorize(`    ${emoji} ${message}`, COLORS.white));
  }

  factionEvent(faction: Faction, message: string, emoji: string = '📌'): void {
    console.log(`    ${factionBadge(faction)} ${colorize(message, COLORS.white)} ${emoji}`);
  }

  // ---------------------------------------------------------------------------
  // VALIDATION / DEBUG
  // ---------------------------------------------------------------------------

  validation(title: string, data: Record<string, unknown>, isValid: boolean): void {
    const status = isValid
      ? colorize('✓ VALID', COLORS.green, COLORS.bold)
      : colorize('✗ INVALID', COLORS.red, COLORS.bold);

    console.log();
    console.log(colorize(`    📋 ${title}`, COLORS.yellow));
    console.log(`       Status: ${status}`);

    for (const [key, value] of Object.entries(data)) {
      console.log(colorize(`       ${key}: ${JSON.stringify(value)}`, COLORS.dim));
    }
  }

  debug(message: string, data?: unknown): void {
    if (!this.verbose) return;
    console.log(colorize(`    [DEBUG] ${message}`, COLORS.brightBlack));
    if (data !== undefined) {
      console.log(colorize(`            ${JSON.stringify(data)}`, COLORS.brightBlack));
    }
  }

  // ---------------------------------------------------------------------------
  // GAME END
  // ---------------------------------------------------------------------------

  gameEnd(winner: Faction[] | null, turns: number): void {
    console.log('\n' + colorize('═'.repeat(60), COLORS.yellow));
    console.log(colorize('  🏆 GAME OVER', COLORS.yellow, COLORS.bold));
    console.log(colorize('═'.repeat(60), COLORS.yellow));
    console.log();

    if (winner && winner.length > 0) {
      console.log(colorize('  Winner:', COLORS.white, COLORS.bold));
      for (const faction of winner) {
        console.log(`    ${factionBadge(faction)} 🎉`);
      }
    } else {
      console.log(colorize('  No winner (max turns reached)', COLORS.dim));
    }

    console.log();
    console.log(colorize(`  Total turns: ${turns}`, COLORS.dim));
    console.log();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let loggerInstance: GameLogger | null = null;

export function getLogger(verbose: boolean = true): GameLogger {
  if (!loggerInstance || loggerInstance['verbose'] !== verbose) {
    loggerInstance = new GameLogger(verbose);
  }
  return loggerInstance;
}

export function createLogger(verbose: boolean = true): GameLogger {
  return new GameLogger(verbose);
}
