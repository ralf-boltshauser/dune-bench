/**
 * Decision-Making Agent Provider
 * 
 * Makes reasonable decisions based on game state rather than hardcoded responses.
 * This allows for true E2E testing where agents actually make decisions.
 */

import { Faction, LeaderLocation } from '../../../types';
import { getFactionState, getAvailableLeaders } from '../../../state';
import type { AgentRequest, AgentResponse } from '../../../phases/types';
import type { AgentProvider } from '../../../phases/phase-manager';
import type { GameState } from '../../../types';

export class DecisionAgentProvider implements AgentProvider {
  private gameState: GameState;

  constructor(initialState: GameState) {
    this.gameState = initialState;
  }

  updateState(state: GameState): void {
    this.gameState = state;
  }

  getState(): GameState {
    return this.gameState;
  }

  async getResponses(
    requests: AgentRequest[],
    simultaneous: boolean
  ): Promise<AgentResponse[]> {
    return Promise.all(
      requests.map((request) => this.makeDecision(request))
    );
  }

  private async makeDecision(request: AgentRequest): Promise<AgentResponse> {
    const factionState = getFactionState(this.gameState, request.factionId);

    switch (request.requestType) {
      case 'CHOOSE_BATTLE': {
        const availableBattles = request.context?.availableBattles as Array<{
          territory: string;
          sector: number;
          enemies: Faction[];
        }> | undefined;

        if (!availableBattles || availableBattles.length === 0) {
          // No battles available - this shouldn't happen, but handle gracefully
          return {
            factionId: request.factionId,
            actionType: 'PASS',
            data: {},
            passed: true,
          };
        }

        // Choose first available battle
        const chosenBattle = availableBattles[0];
        return {
          factionId: request.factionId,
          actionType: 'CHOOSE_BATTLE',
          data: {
            territoryId: chosenBattle.territory,
            sector: chosenBattle.sector,
            defender: chosenBattle.enemies[0], // Choose first enemy
          },
          passed: false,
        };
      }

      case 'USE_VOICE': {
        // BG uses Voice if available - command opponent not to play poison weapon
        const options = request.context?.options as string[] | undefined;
        if (options && options.includes('not_play_poison_weapon')) {
          return {
            factionId: request.factionId,
            actionType: 'USE_VOICE',
            data: {
              command: {
                type: 'not_play',
                cardType: 'poison_weapon',
              },
            },
            passed: false,
          };
        }
        // Otherwise pass
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };
      }

      case 'USE_PRESCIENCE': {
        // Atreides uses prescience to see opponent's weapon
        const options = request.context?.options as string[] | undefined;
        if (options && options.includes('weapon')) {
          return {
            factionId: request.factionId,
            actionType: 'USE_PRESCIENCE',
            data: {
              target: 'weapon',
            },
            passed: false,
          };
        }
        // Otherwise pass
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };
      }

      case 'REVEAL_PRESCIENCE_ELEMENT': {
        // Reveal that we're not playing a weapon (if weapon was asked)
        const prescienceTarget = request.context?.prescienceTarget as string | undefined;
        if (prescienceTarget === 'weapon') {
          return {
            factionId: request.factionId,
            actionType: 'REVEAL_PRESCIENCE_ELEMENT',
            data: {
              weaponCardId: null, // Not playing weapon
            },
            passed: false,
          };
        }
        // For other targets, provide reasonable defaults
        return {
          factionId: request.factionId,
          actionType: 'REVEAL_PRESCIENCE_ELEMENT',
          data: {},
          passed: false,
        };
      }

      case 'CREATE_BATTLE_PLAN': {
        // Get current faction state
        const factionState = getFactionState(this.gameState, request.factionId);

        // Create a reasonable battle plan based on available resources
        const availableLeaders = request.context?.availableLeaders as Array<{
          id: string;
          name: string;
          strength: number;
        }> | undefined;

        const availableCards = request.context?.availableCards as Array<{
          id: string;
          name: string;
          type: string;
        }> | undefined;

        const forcesAvailable = (request.context?.forcesAvailable as number) ?? 0;
        const spiceAvailable = (request.context?.spiceAvailable as number) ?? 0;

        // Choose strongest available leader
        const leader = availableLeaders && availableLeaders.length > 0
          ? availableLeaders.reduce((best, current) =>
              current.strength > best.strength ? current : best
            )
          : null;

        // Find a defense card if available (look for shield, snooper, etc.)
        const defenseCard = availableCards?.find(
          (c) => 
            c.type.includes('DEFENSE') || 
            c.type.includes('defense') ||
            c.name?.toLowerCase().includes('shield') ||
            c.name?.toLowerCase().includes('snooper')
        );

        // Dial reasonable forces (about half of available, but at least 1)
        const forcesDialed = Math.max(1, Math.floor(forcesAvailable / 2));

        // Dial some spice if available (up to forces dialed)
        const spiceDialed = Math.min(
          Math.floor(spiceAvailable / 2),
          forcesDialed
        );

        // Check if we can use Kwisatz Haderach (Atreides only, if active)
        const voiceCommand = request.context?.voiceCommand as {
          type: string;
          cardType: string;
        } | undefined;
        const useKwisatzHaderach =
          request.factionId === Faction.ATREIDES &&
          factionState.kwisatzHaderach?.isActive &&
          !factionState.kwisatzHaderach.isDead &&
          (!voiceCommand || voiceCommand.cardType !== 'poison_weapon'); // Don't use if Voice says not to

        return {
          factionId: request.factionId,
          actionType: 'CREATE_BATTLE_PLAN',
          data: {
            leaderId: leader?.id ?? null,
            forcesDialed,
            weaponCardId: null, // Don't play weapon for simplicity
            defenseCardId: defenseCard?.id ?? null,
            useKwisatzHaderach: useKwisatzHaderach ?? false,
            useCheapHero: false,
            spiceDialed,
          },
          passed: false,
        };
      }

      case 'CALL_TRAITOR': {
        // Get current faction state
        const factionState = getFactionState(this.gameState, request.factionId);
        
        // Check if we have the traitor card
        const opponentLeader = request.context?.opponentLeader as string | undefined;
        const hasTraitor = opponentLeader
          ? factionState.traitors.some((t) => t.leaderId === opponentLeader)
          : false;

        if (hasTraitor) {
          return {
            factionId: request.factionId,
            actionType: 'CALL_TRAITOR',
            data: {
              leaderId: opponentLeader,
            },
            passed: false,
          };
        }

        // Otherwise pass
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };
      }

      case 'CHOOSE_CARDS_TO_DISCARD': {
        // Keep all cards (don't discard any)
        return {
          factionId: request.factionId,
          actionType: 'CHOOSE_CARDS_TO_DISCARD',
          data: {
            cardsToDiscard: [],
          },
          passed: false,
        };
      }

      case 'CAPTURE_LEADER_CHOICE': {
        // Harkonnen: choose to capture (not kill)
        return {
          factionId: request.factionId,
          actionType: 'CAPTURE_LEADER_CHOICE',
          data: {
            choice: 'capture',
            leaderId: request.context?.leaderId as string,
            victim: request.context?.victim as Faction,
          },
          passed: false,
        };
      }

      default:
        // Default: pass
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };
    }
  }
}

