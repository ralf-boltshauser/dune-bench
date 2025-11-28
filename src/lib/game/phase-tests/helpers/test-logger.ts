/**
 * Test Logger (Global)
 * 
 * Writes detailed test execution logs to files for manual review.
 * The goal is to capture all tools, thoughts, events, state changes, etc.
 * so you can manually review and validate correctness.
 * 
 * This is a global/shared logger that can be used across all phase tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GameState } from '../../types';

export interface LogEntry {
  timestamp: string;
  step: number;
  subPhase?: string;
  type: 'request' | 'response' | 'event' | 'state' | 'info' | 'error';
  data: unknown;
  message?: string;
}

export interface ScenarioResult {
  state: GameState;
  events: Array<{ type: string; message: string }>;
  stepCount: number;
  completed: boolean;
  error?: Error;
}

export class TestLogger {
  private logDir: string;
  private logFile: string;
  private entries: LogEntry[] = [];
  private scenarioName: string;

  constructor(scenarioName: string, phaseName: string, outputDir: string = 'test-logs') {
    this.scenarioName = scenarioName;
    this.logDir = path.join(process.cwd(), outputDir, phaseName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = scenarioName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.logFile = path.join(this.logDir, `${safeName}-${timestamp}.log`);
  }

  /**
   * Log an agent request
   */
  logRequest(step: number, subPhase: string | undefined, request: {
    factionId: string;
    requestType: string;
    prompt: string;
    context?: unknown;
    availableActions?: string[];
  }): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      subPhase,
      type: 'request',
      message: `${request.factionId} requested: ${request.requestType}`,
      data: {
        faction: request.factionId,
        requestType: request.requestType,
        prompt: request.prompt,
        context: request.context,
        availableActions: request.availableActions,
      },
    });
  }

  /**
   * Log an agent response
   */
  logResponse(step: number, response: {
    factionId: string;
    actionType: string;
    data: unknown;
    passed: boolean;
  }): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      type: 'response',
      message: `${response.factionId} responded: ${response.actionType} (passed: ${response.passed})`,
      data: {
        faction: response.factionId,
        actionType: response.actionType,
        data: response.data,
        passed: response.passed ?? false,
      },
    });
  }

  /**
   * Log a phase event
   */
  logEvent(step: number, event: {
    type: string;
    message: string;
    data?: unknown;
  }): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      type: 'event',
      message: event.message,
      data: {
        eventType: event.type,
        data: event.data,
      },
    });
  }

  /**
   * Log state snapshot
   */
  logState(step: number, label: string, state: GameState): void {
    // Extract key state information
    const stateSnapshot = {
      turn: state.turn,
      phase: state.phase,
      factions: Array.from(state.factions.keys()),
      factionStates: Array.from(state.factions.entries()).map(([faction, fs]) => ({
        faction,
        spice: fs.spice,
        forcesOnBoard: fs.forces.onBoard.map(f => ({
          territory: f.territoryId,
          sector: f.sector,
          regular: f.forces.regular,
          elite: f.forces.elite,
          advisors: f.advisors,
        })),
        forcesInReserves: fs.forces.reserves,
        forcesInTanks: fs.forces.tanks,
        leaders: fs.leaders.map(l => ({
          id: l.definitionId,
          location: l.location,
          usedThisTurn: l.usedThisTurn,
          capturedBy: l.capturedBy,
          originalFaction: l.originalFaction,
        })),
        handSize: fs.hand.length,
        traitors: fs.traitors.length,
      })),
      spiceOnBoard: state.spiceOnBoard,
      stormSector: state.stormSector,
      stormOrder: state.stormOrder,
    };

    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      type: 'state',
      message: `State snapshot: ${label}`,
      data: stateSnapshot,
    });
  }

  /**
   * Log informational message
   */
  logInfo(step: number, message: string, data?: unknown): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      type: 'info',
      message,
      data,
    });
  }

  /**
   * Log error
   */
  logError(step: number, error: Error | string, data?: unknown): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      step,
      type: 'error',
      message: error instanceof Error ? error.message : error,
      data: {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : error,
        context: data,
      },
    });
  }

  /**
   * Write all logs to file
   */
  writeLog(result: ScenarioResult): void {
    const logContent = this.formatLog(result);
    fs.writeFileSync(this.logFile, logContent, 'utf-8');
    console.log(`\n📝 Test log written to: ${this.logFile}`);
  }

  /**
   * Format log entries into readable text
   */
  private formatLog(result: ScenarioResult): string {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(80));
    lines.push(`PHASE TEST LOG: ${this.scenarioName}`);
    lines.push('='.repeat(80));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Steps: ${result.stepCount}`);
    lines.push(`Completed: ${result.completed ? 'Yes' : 'No'}`);
    if (result.error) {
      lines.push(`Error: ${result.error.message}`);
    }
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    // Log entries grouped by step
    let currentStep = -1;
    for (const entry of this.entries) {
      if (entry.step !== currentStep) {
        if (currentStep >= 0) {
          lines.push('');
        }
        currentStep = entry.step;
        lines.push(`\n${'─'.repeat(80)}`);
        lines.push(`STEP ${entry.step}${entry.subPhase ? ` - ${entry.subPhase}` : ''}`);
        lines.push(`${'─'.repeat(80)}`);
      }

      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      lines.push(`\n[${timestamp}] ${entry.type.toUpperCase()}`);

      if (entry.message) {
        lines.push(`  ${entry.message}`);
      }

      // Format data based on type
      if (entry.data) {
        lines.push(`  Data:`);
        const formatted = this.formatData(entry.data, 4);
        lines.push(formatted);
      }
    }

    // Summary
    lines.push('\n');
    lines.push('='.repeat(80));
    lines.push('SUMMARY');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Total Steps: ${result.stepCount}`);
    lines.push(`Total Events: ${result.events.length}`);
    lines.push(`Completed: ${result.completed ? 'Yes' : 'No'}`);
    lines.push('');

    // Event summary
    lines.push('Events:');
    result.events.forEach((event, i) => {
      lines.push(`  ${i + 1}. [${event.type}] ${event.message}`);
    });

    // Final state summary
    lines.push('');
    lines.push('Final State:');
    const finalState = result.state;
    lines.push(`  Turn: ${finalState.turn}`);
    lines.push(`  Phase: ${finalState.phase}`);
    lines.push(`  Factions: ${Array.from(finalState.factions.keys()).join(', ')}`);
    lines.push('');
    
    for (const [faction, fs] of finalState.factions.entries()) {
      lines.push(`  ${faction}:`);
      lines.push(`    Spice: ${fs.spice}`);
      lines.push(`    Forces on board: ${fs.forces.onBoard.length} stacks`);
      lines.push(`    Forces in reserves: ${fs.forces.reserves.regular} regular, ${fs.forces.reserves.elite} elite`);
      lines.push(`    Leaders: ${fs.leaders.length} total`);
      lines.push(`    Hand size: ${fs.hand.length}`);
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('END OF LOG');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Format data with indentation
   */
  private formatData(data: unknown, indent: number = 0): string {
    const indentStr = ' '.repeat(indent);
    
    if (data === null || data === undefined) {
      return `${indentStr}null`;
    }

    if (typeof data === 'string') {
      return `${indentStr}${data}`;
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return `${indentStr}${String(data)}`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${indentStr}[]`;
      }
      const lines: string[] = [];
      lines.push(`${indentStr}[`);
      for (const item of data) {
        const formatted = this.formatData(item, indent + 2);
        lines.push(`${formatted},`);
      }
      lines.push(`${indentStr}]`);
      return lines.join('\n');
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return `${indentStr}{}`;
      }
      const lines: string[] = [];
      lines.push(`${indentStr}{`);
      for (const key of keys) {
        const value = obj[key];
        const formatted = this.formatData(value, indent + 2);
        lines.push(`${indentStr}  ${key}: ${formatted.replace(/^\s+/, '')},`);
      }
      lines.push(`${indentStr}}`);
      return lines.join('\n');
    }

    return `${indentStr}${String(data)}`;
  }
}

