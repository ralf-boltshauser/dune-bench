/**
 * Battle Debug Logger
 * 
 * Provides comprehensive debug logging for battle phases, including:
 * - Terminal console logs with detailed information
 * - JSON file output for detailed analysis (game_id/turn_x_battle.json)
 */

import * as fs from "fs";
import * as path from "path";
import type { GameState } from "../../../../../types";
import type { BattlePhaseContext, AgentResponse, PhaseEvent } from "../../../../types";

export interface BattleDebugLog {
  gameId: string;
  turn: number;
  battleIndex: number;
  timestamp: number;
  step: number;
  subPhase: string;
  battle?: {
    aggressor: string;
    defender: string;
    territoryId: string;
    sector: number;
  };
  state?: {
    aggressorForces?: number;
    defenderForces?: number;
    aggressorSpice?: number;
    defenderSpice?: number;
  };
  requests?: Array<{
    factionId: string;
    requestType: string;
    context?: unknown;
  }>;
  responses?: Array<{
    factionId: string;
    actionType: string;
    data?: unknown;
    passed?: boolean;
    reasoning?: string;
  }>;
  events?: Array<{
    type: string;
    message: string;
    data?: unknown;
  }>;
  errors?: Array<{
    message: string;
    stack?: string;
    context?: unknown;
  }>;
  validation?: {
    faction: string;
    valid: boolean;
    errors?: Array<{
      code: string;
      message: string;
      field?: string;
    }>;
  };
}

export class BattleDebugLogger {
  private gameId: string;
  private turn: number;
  private logs: BattleDebugLog[] = [];
  private currentBattleIndex: number = 0;
  private stepCount: number = 0;
  private logDir: string;

  constructor(gameId: string, turn: number) {
    this.gameId = gameId;
    this.turn = turn;
    
    // Create log directory: data/games/{gameId}/debug/
    this.logDir = path.join(
      process.cwd(),
      "data",
      "games",
      gameId,
      "debug"
    );
    
    // Ensure directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log a battle step with full context
   */
  logStep(
    subPhase: string,
    battle?: BattlePhaseContext["currentBattle"],
    requests?: Array<{ factionId: string; requestType: string; context?: unknown }>,
    responses?: AgentResponse[],
    events?: PhaseEvent[],
    state?: GameState
  ): void {
    this.stepCount++;
    
    const log: BattleDebugLog = {
      gameId: this.gameId,
      turn: this.turn,
      battleIndex: this.currentBattleIndex,
      timestamp: Date.now(),
      step: this.stepCount,
      subPhase,
    };

    // Add battle info
    if (battle) {
      log.battle = {
        aggressor: battle.aggressor,
        defender: battle.defender,
        territoryId: battle.territoryId,
        sector: battle.sector,
      };
      
      // Add state info if available
      if (state) {
        const aggressorState = state.factions.get(battle.aggressor);
        const defenderState = state.factions.get(battle.defender);
        
        log.state = {
          aggressorForces: aggressorState?.forces.onBoard
            .filter(f => f.territoryId === battle.territoryId && f.sector === battle.sector)
            .reduce((sum, f) => sum + f.forces.regular + f.forces.elite, 0),
          defenderForces: defenderState?.forces.onBoard
            .filter(f => f.territoryId === battle.territoryId && f.sector === battle.sector)
            .reduce((sum, f) => sum + f.forces.regular + f.forces.elite, 0),
          aggressorSpice: aggressorState?.spice ?? 0,
          defenderSpice: defenderState?.spice ?? 0,
        };
      }
    }

    // Add requests
    if (requests && requests.length > 0) {
      log.requests = requests.map(r => ({
        factionId: r.factionId,
        requestType: r.requestType,
        context: r.context,
      }));
    }

    // Add responses
    if (responses && responses.length > 0) {
      log.responses = responses.map(r => ({
        factionId: r.factionId,
        actionType: r.actionType,
        data: r.data,
        passed: r.passed,
        reasoning: r.reasoning,
      }));
    }

    // Add events
    if (events && events.length > 0) {
      log.events = events.map(e => ({
        type: e.type,
        message: e.message,
        data: e.data,
      }));
    }

    this.logs.push(log);
    
    // Console log with detailed info
    this.consoleLogStep(log);
  }

  /**
   * Log battle plan validation
   */
  logValidation(
    faction: string,
    valid: boolean,
    errors?: Array<{ code: string; message: string; field?: string }>,
    plan?: unknown
  ): void {
    const log: BattleDebugLog = {
      gameId: this.gameId,
      turn: this.turn,
      battleIndex: this.currentBattleIndex,
      timestamp: Date.now(),
      step: this.stepCount,
      subPhase: "VALIDATION",
      validation: {
        faction,
        valid,
        errors: errors?.map(e => ({
          code: e.code,
          message: e.message,
          field: e.field,
        })),
      },
    };

    this.logs.push(log);
    
    // Console log
    console.log(`\n🔍 [Battle Debug] Validation for ${faction.toUpperCase()}:`);
    console.log(`   Valid: ${valid ? "✅" : "❌"}`);
    if (errors && errors.length > 0) {
      console.log(`   Errors:`);
      errors.forEach(err => {
        console.log(`     - ${err.code}: ${err.message}${err.field ? ` (field: ${err.field})` : ""}`);
      });
    }
    if (plan) {
      console.log(`   Plan submitted:`, JSON.stringify(plan, null, 2));
    }
  }

  /**
   * Log an error
   */
  logError(
    message: string,
    error?: Error,
    context?: unknown
  ): void {
    const log: BattleDebugLog = {
      gameId: this.gameId,
      turn: this.turn,
      battleIndex: this.currentBattleIndex,
      timestamp: Date.now(),
      step: this.stepCount,
      subPhase: "ERROR",
      errors: [{
        message,
        stack: error?.stack,
        context,
      }],
    };

    this.logs.push(log);
    
    // Console log
    console.error(`\n❌ [Battle Debug] Error:`);
    console.error(`   Message: ${message}`);
    if (error) {
      console.error(`   Stack: ${error.stack}`);
    }
    if (context) {
      console.error(`   Context:`, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Set current battle index
   */
  setBattleIndex(index: number): void {
    this.currentBattleIndex = index;
  }

  /**
   * Console log a step with detailed info
   */
  private consoleLogStep(log: BattleDebugLog): void {
    console.log(`\n${"═".repeat(80)}`);
    console.log(`🔍 [Battle Debug] Step ${log.step} - ${log.subPhase}`);
    console.log(`${"═".repeat(80)}`);
    
    if (log.battle) {
      console.log(`📍 Battle: ${log.battle.aggressor.toUpperCase()} vs ${log.battle.defender.toUpperCase()}`);
      console.log(`   Territory: ${log.battle.territoryId}, Sector: ${log.battle.sector}`);
    }
    
    if (log.state) {
      console.log(`📊 State:`);
      if (log.state.aggressorForces !== undefined) {
        console.log(`   Aggressor forces: ${log.state.aggressorForces}`);
      }
      if (log.state.defenderForces !== undefined) {
        console.log(`   Defender forces: ${log.state.defenderForces}`);
      }
      if (log.state.aggressorSpice !== undefined) {
        console.log(`   Aggressor spice: ${log.state.aggressorSpice}`);
      }
      if (log.state.defenderSpice !== undefined) {
        console.log(`   Defender spice: ${log.state.defenderSpice}`);
      }
    }
    
    if (log.requests && log.requests.length > 0) {
      console.log(`📨 Requests (${log.requests.length}):`);
      log.requests.forEach(req => {
        console.log(`   - ${req.factionId.toUpperCase()}: ${req.requestType}`);
      });
    }
    
    if (log.responses && log.responses.length > 0) {
      console.log(`📥 Responses (${log.responses.length}):`);
      log.responses.forEach(res => {
        console.log(`   - ${res.factionId.toUpperCase()}: ${res.actionType}${res.passed ? " (PASS)" : ""}`);
        if (res.reasoning) {
          console.log(`     Reasoning: ${res.reasoning.substring(0, 100)}${res.reasoning.length > 100 ? "..." : ""}`);
        }
      });
    }
    
    if (log.events && log.events.length > 0) {
      console.log(`📋 Events (${log.events.length}):`);
      log.events.forEach(evt => {
        console.log(`   - ${evt.type}: ${evt.message}`);
      });
    }
  }

  /**
   * Save all logs to JSON file
   */
  save(): void {
    const filename = `turn_${this.turn}_battle.json`;
    const filepath = path.join(this.logDir, filename);
    
    const output = {
      gameId: this.gameId,
      turn: this.turn,
      totalSteps: this.stepCount,
      battles: this.currentBattleIndex + 1,
      logs: this.logs,
      savedAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
    console.log(`\n💾 [Battle Debug] Saved debug log to: ${filepath}`);
  }

  /**
   * Get all logs (for inspection)
   */
  getLogs(): BattleDebugLog[] {
    return this.logs;
  }
}

