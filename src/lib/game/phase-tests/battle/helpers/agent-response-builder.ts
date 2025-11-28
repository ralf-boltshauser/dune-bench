/**
 * Agent Response Builder
 * 
 * Helper utilities for building mock agent responses for testing.
 */

import { Faction } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Queue a battle plan response
   */
  queueBattlePlan(
    faction: Faction,
    plan: {
      leaderId: string | null;
      forcesDialed: number;
      weaponCardId?: string | null;
      defenseCardId?: string | null;
      useKwisatzHaderach?: boolean;
      useCheapHero?: boolean;
      spiceDialed?: number;
    }
  ): this {
    this.queueResponse('CREATE_BATTLE_PLAN', {
      factionId: faction,
      actionType: 'CREATE_BATTLE_PLAN',
      data: {
        leaderId: plan.leaderId,
        forcesDialed: plan.forcesDialed,
        weaponCardId: plan.weaponCardId ?? null,
        defenseCardId: plan.defenseCardId ?? null,
        useKwisatzHaderach: plan.useKwisatzHaderach ?? false,
        useCheapHero: plan.useCheapHero ?? false,
        spiceDialed: plan.spiceDialed ?? 0,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a prescience response
   * If target is null, queues a pass response
   */
  queuePrescience(
    faction: Faction,
    target: 'leader' | 'weapon' | 'defense' | 'number' | null
  ): this {
    if (target === null) {
      this.queueResponse('USE_PRESCIENCE', {
        factionId: faction,
        actionType: 'USE_PRESCIENCE',
        data: {},
        passed: true,
      });
    } else {
      this.queueResponse('USE_PRESCIENCE', {
        factionId: faction,
        actionType: 'USE_PRESCIENCE',
        data: { target },
        passed: false,
      });
    }
    return this;
  }

  /**
   * Queue a prescience reveal response
   */
  queuePrescienceReveal(
    faction: Faction,
    reveal: {
      leaderId?: string | null;
      weaponCardId?: string | null;
      defenseCardId?: string | null;
      forcesDialed?: number;
      spiceDialed?: number;
    }
  ): this {
    this.queueResponse('REVEAL_PRESCIENCE_ELEMENT', {
      factionId: faction,
      actionType: 'REVEAL_PRESCIENCE_ELEMENT',
      data: reveal,
      passed: false,
    });
    return this;
  }

  /**
   * Queue a voice response
   */
  queueVoice(
    faction: Faction,
    command: {
      type: 'play' | 'not_play';
      cardType: string;
      specificCardName?: string;
    }
  ): this {
    this.queueResponse('USE_VOICE', {
      factionId: faction,
      actionType: 'USE_VOICE',
      data: { command },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a traitor call response
   */
  queueTraitorCall(
    faction: Faction,
    leaderId: string
  ): this {
    this.queueResponse('CALL_TRAITOR', {
      factionId: faction,
      actionType: 'CALL_TRAITOR',
      data: { leaderId },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a pass response
   */
  queuePass(faction: Faction): this {
    this.queueResponse('PASS', {
      factionId: faction,
      actionType: 'PASS',
      data: {},
      passed: true,
    });
    return this;
  }

  /**
   * Queue a winner card discard choice
   */
  queueCardDiscardChoice(
    faction: Faction,
    cardsToDiscard: string[]
  ): this {
    this.queueResponse('CHOOSE_CARDS_TO_DISCARD', {
      factionId: faction,
      actionType: 'CHOOSE_CARDS_TO_DISCARD',
      data: { cardsToDiscard },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a battle choice (aggressor)
   * Note: The sector should match the actual battle location
   */
  queueBattleChoice(
    faction: Faction,
    territoryId: string,
    opponentFaction: Faction,
    sector?: number
  ): this {
    this.queueResponse('CHOOSE_BATTLE', {
      factionId: faction,
      actionType: 'CHOOSE_BATTLE',
      data: {
        territoryId,
        defender: opponentFaction, // Note: called 'defender' in processChooseBattle
        sector: sector ?? 9, // Default sector - should match the battle location
      },
      passed: false,
    });
    return this;
  }

  /**
   * Queue a Harkonnen capture choice
   */
  queueCaptureChoice(
    faction: Faction,
    choice: 'kill' | 'capture',
    leaderId: string,
    victim: Faction
  ): this {
    this.queueResponse('CAPTURE_LEADER_CHOICE', {
      factionId: faction,
      actionType: 'CAPTURE_LEADER_CHOICE',
      data: {
        choice,
        leaderId,
        victim,
      },
      passed: false,
    });
    return this;
  }

  /**
   * Generic response queue
   */
  queueResponse(requestType: string, response: AgentResponse): this {
    const queue = this.responses.get(requestType) ?? [];
    queue.push(response);
    this.responses.set(requestType, queue);
    return this;
  }

  /**
   * Get all queued responses
   */
  getResponses(): Map<string, AgentResponse[]> {
    return this.responses;
  }

  /**
   * Clear all responses
   */
  clear(): this {
    this.responses.clear();
    return this;
  }
}

