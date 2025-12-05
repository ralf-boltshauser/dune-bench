/**
 * Mock Logger
 *
 * Tracks all logging calls for verification in tests.
 */

import type { Faction } from "@/lib/game/types";

export interface LogCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

export class MockLogger {
  private calls: LogCall[] = [];

  agentRequest(faction: Faction, requestType: string, prompt: string): void {
    this.record("agentRequest", [faction, requestType, prompt]);
  }

  agentThinking(faction: Faction): void {
    this.record("agentThinking", [faction]);
  }

  agentToolCall(
    faction: Faction,
    toolName: string,
    input: Record<string, unknown>
  ): void {
    this.record("agentToolCall", [faction, toolName, input]);
  }

  agentResponse(
    faction: Faction,
    actionType: string,
    duration: number,
    reasoning?: string
  ): void {
    this.record("agentResponse", [faction, actionType, duration, reasoning]);
  }

  agentError(factionId: Faction, error: string): void {
    this.record("agentError", [factionId, error]);
  }

  // Additional logger methods (stubs for compatibility)
  gameStart(factions: Faction[]): void {
    this.record("gameStart", [factions]);
  }

  turnStart(turn: number, maxTurns: number): void {
    this.record("turnStart", [turn, maxTurns]);
  }

  phaseStart(phase: string): void {
    this.record("phaseStart", [phase]);
  }

  phaseEnd(phase: string): void {
    this.record("phaseEnd", [phase]);
  }

  private record(method: string, args: unknown[]): void {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  getCalls(): LogCall[] {
    return [...this.calls];
  }

  getCallsByMethod(method: string): LogCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  clear(): void {
    this.calls = [];
  }

  wasCalled(method: string): boolean {
    return this.calls.some((c) => c.method === method);
  }

  getCallCount(method: string): number {
    return this.calls.filter((c) => c.method === method).length;
  }

  getLastCall(): LogCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  getLastCallForMethod(method: string): LogCall | undefined {
    const methodCalls = this.getCallsByMethod(method);
    return methodCalls[methodCalls.length - 1];
  }

  // Verification helpers
  expectLog(method: string, ...args: unknown[]): void {
    const calls = this.getCallsByMethod(method);
    if (calls.length === 0) {
      throw new Error(`Expected log call ${method} but it was not called`);
    }
    if (args.length > 0) {
      const matchingCall = calls.find((c) => {
        return args.every((arg, index) => {
          const callArg = c.args[index];
          if (typeof arg === "function") {
            return arg(callArg);
          }
          return callArg === arg;
        });
      });
      if (!matchingCall) {
        throw new Error(
          `Expected log call ${method} with matching arguments but none found`
        );
      }
    }
  }

  expectLogSequence(sequence: Array<{ method: string; args?: unknown[] }>): void {
    const allCalls = this.getCalls();
    let sequenceIndex = 0;
    for (const call of allCalls) {
      if (sequenceIndex < sequence.length) {
        const expected = sequence[sequenceIndex];
        if (call.method === expected.method) {
          if (expected.args) {
            const matches = expected.args.every((arg, index) => {
              const callArg = call.args[index];
              if (typeof arg === "function") {
                return arg(callArg);
              }
              return callArg === arg;
            });
            if (matches) {
              sequenceIndex++;
            }
          } else {
            sequenceIndex++;
          }
        }
      }
    }
    if (sequenceIndex < sequence.length) {
      throw new Error(
        `Expected log sequence but got partial sequence. Missing: ${sequence[sequenceIndex].method}`
      );
    }
  }

  verifyAllLogs(): void {
    // Can be extended with custom verification logic
    if (this.calls.length === 0) {
      throw new Error("Expected log calls but none were made");
    }
  }
}

export function createMockLogger(): MockLogger {
  return new MockLogger();
}

