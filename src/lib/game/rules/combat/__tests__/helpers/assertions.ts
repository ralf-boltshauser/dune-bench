/**
 * Assertion Helpers for Combat Rules Tests
 * 
 * Reusable assertion functions for common test patterns.
 */

import { Faction } from '../../../../types/index.js';
import type { ValidationResult } from '../../../types.js';
import type { BattleResult, BattleSideResult } from '@/lib/game/types';

export class CombatAssertions {
  /**
   * Assert validation result is valid
   */
  static expectValid(result: ValidationResult<any>): void {
    if (!result.valid) {
      throw new Error(`Expected valid result but got errors: ${result.errors.map(e => e.message).join(', ')}`);
    }
    if (result.errors.length > 0) {
      throw new Error(`Expected no errors but got: ${result.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Assert validation result is invalid with specific error code
   */
  static expectInvalid(result: ValidationResult<any>, errorCode: string): void {
    if (result.valid) {
      throw new Error(`Expected invalid result with error code "${errorCode}" but result was valid`);
    }
    if (result.errors.length === 0) {
      throw new Error(`Expected error code "${errorCode}" but got no errors`);
    }
    if (result.errors[0]?.code !== errorCode) {
      throw new Error(
        `Expected error code "${errorCode}" but got "${result.errors[0]?.code}": ${result.errors[0]?.message}`
      );
    }
  }

  /**
   * Assert validation result has error with message containing text
   */
  static expectErrorContaining(result: ValidationResult<any>, text: string): void {
    if (result.valid) {
      throw new Error(`Expected invalid result with error containing "${text}" but result was valid`);
    }
    const errorMessages = result.errors.map(e => e.message).join(' ');
    if (!errorMessages.includes(text)) {
      throw new Error(`Expected error message containing "${text}" but got: ${errorMessages}`);
    }
  }

  /**
   * Assert battle result winner
   */
  static expectWinner(result: BattleResult, expectedWinner: Faction): void {
    if (result.winner !== expectedWinner) {
      throw new Error(`Expected winner ${expectedWinner} but got ${result.winner}`);
    }
  }

  /**
   * Assert battle result has specific total
   */
  static expectTotal(result: BattleResult, winnerTotal: number, loserTotal: number): void {
    if (result.winnerTotal !== winnerTotal) {
      throw new Error(`Expected winner total ${winnerTotal} but got ${result.winnerTotal}`);
    }
    if (result.loserTotal !== loserTotal) {
      throw new Error(`Expected loser total ${loserTotal} but got ${result.loserTotal}`);
    }
  }

  /**
   * Assert side result forces lost
   */
  static expectForcesLost(sideResult: BattleSideResult, expected: number): void {
    if (sideResult.forcesLost !== expected) {
      throw new Error(`Expected forces lost ${expected} but got ${sideResult.forcesLost}`);
    }
  }

  /**
   * Assert side result leader killed
   */
  static expectLeaderKilled(sideResult: BattleSideResult, expected: boolean): void {
    if (sideResult.leaderKilled !== expected) {
      throw new Error(`Expected leader killed ${expected} but got ${sideResult.leaderKilled}`);
    }
  }

  /**
   * Assert side result cards to discard
   */
  static expectCardsToDiscard(sideResult: BattleSideResult, expected: string[]): void {
    const missing = expected.filter(card => !sideResult.cardsToDiscard.includes(card));
    if (missing.length > 0) {
      throw new Error(`Expected cards to discard ${expected.join(', ')} but missing: ${missing.join(', ')}`);
    }
  }

  /**
   * Assert side result cards to keep
   */
  static expectCardsToKeep(sideResult: BattleSideResult, expected: string[]): void {
    const missing = expected.filter(card => !sideResult.cardsToKeep.includes(card));
    if (missing.length > 0) {
      throw new Error(`Expected cards to keep ${expected.join(', ')} but missing: ${missing.join(', ')}`);
    }
  }

  /**
   * Assert spice payouts
   */
  static expectSpicePayouts(result: BattleResult, expected: { faction: Faction; amount: number }[]): void {
    if (result.spicePayouts.length !== expected.length) {
      throw new Error(
        `Expected ${expected.length} spice payouts but got ${result.spicePayouts.length}`
      );
    }
    for (const payout of expected) {
      const found = result.spicePayouts.find(
        p => p.faction === payout.faction && p.amount === payout.amount
      );
      if (!found) {
        throw new Error(
          `Expected spice payout for ${payout.faction} of ${payout.amount} but not found`
        );
      }
    }
  }

  /**
   * Assert lasgun/shield explosion
   */
  static expectExplosion(result: BattleResult): void {
    if (!result.lasgunjShieldExplosion) {
      throw new Error('Expected lasgun/shield explosion but explosion flag is false');
    }
    if (result.aggressorResult.forcesLost === 0 && result.defenderResult.forcesLost === 0) {
      throw new Error('Expected forces lost in explosion but both sides lost 0 forces');
    }
    if (result.spicePayouts.length > 0) {
      throw new Error(`Expected no spice payouts in explosion but got ${result.spicePayouts.length}`);
    }
  }

  /**
   * Assert traitor revealed
   */
  static expectTraitor(result: BattleResult, revealedBy: Faction): void {
    if (!result.traitorRevealed) {
      throw new Error('Expected traitor revealed but flag is false');
    }
    if (result.traitorRevealedBy !== revealedBy) {
      throw new Error(`Expected traitor revealed by ${revealedBy} but got ${result.traitorRevealedBy}`);
    }
    // Winner loses nothing
    const winnerResult = result.winner === result.aggressorResult.faction
      ? result.aggressorResult
      : result.defenderResult;
    if (winnerResult.forcesLost !== 0) {
      throw new Error(`Expected winner to lose nothing but lost ${winnerResult.forcesLost} forces`);
    }
  }

  /**
   * Assert validation result has specific error code
   */
  static expectErrorCode(result: ValidationResult<any>, code: string): void {
    if (result.valid) {
      throw new Error(`Expected invalid result with error code "${code}" but result was valid`);
    }
    const error = result.errors.find(e => e.code === code);
    if (!error) {
      throw new Error(`Expected error code "${code}" but got: ${result.errors.map(e => e.code).join(', ')}`);
    }
  }

  /**
   * Assert validation result has error for specific field
   */
  static expectErrorField(result: ValidationResult<any>, field: string): void {
    if (result.valid) {
      throw new Error(`Expected invalid result with field "${field}" but result was valid`);
    }
    const error = result.errors.find(e => (e as any).field === field);
    if (!error) {
      throw new Error(`Expected error for field "${field}" but got: ${result.errors.map(e => (e as any).field).join(', ')}`);
    }
  }

  /**
   * Assert battle result has no winner (two traitors scenario)
   */
  static expectNoWinner(result: BattleResult): void {
    if (result.winner !== null) {
      throw new Error(`Expected no winner but got ${result.winner}`);
    }
    if (result.loser !== null) {
      throw new Error(`Expected no loser but got ${result.loser}`);
    }
    if (!result.twoTraitors) {
      throw new Error('Expected twoTraitors flag to be true');
    }
  }

  /**
   * Assert side result leader is alive
   */
  static expectLeaderAlive(sideResult: BattleSideResult): void {
    if (sideResult.leaderKilled) {
      throw new Error('Expected leader to be alive but was killed');
    }
  }

  /**
   * Assert side result leader is dead
   */
  static expectLeaderDead(sideResult: BattleSideResult): void {
    if (!sideResult.leaderKilled) {
      throw new Error('Expected leader to be dead but was alive');
    }
  }

  /**
   * Assert side result forces dialed
   */
  static expectForcesDialed(sideResult: BattleSideResult, expected: number): void {
    if (sideResult.forcesDialed !== expected) {
      throw new Error(`Expected forces dialed ${expected} but got ${sideResult.forcesDialed}`);
    }
  }

  /**
   * Assert side result weapon effective
   */
  static expectWeaponEffective(sideResult: BattleSideResult, expected: boolean): void {
    if (sideResult.weaponEffective !== expected) {
      throw new Error(`Expected weapon effective ${expected} but got ${sideResult.weaponEffective}`);
    }
  }

  /**
   * Assert side result defense effective
   */
  static expectDefenseEffective(sideResult: BattleSideResult, expected: boolean): void {
    if (sideResult.defenseEffective !== expected) {
      throw new Error(`Expected defense effective ${expected} but got ${sideResult.defenseEffective}`);
    }
  }

  /**
   * Assert battle result loser
   */
  static expectLoser(result: BattleResult, expectedLoser: Faction): void {
    if (result.loser !== expectedLoser) {
      throw new Error(`Expected loser ${expectedLoser} but got ${result.loser}`);
    }
  }
}

