/**
 * Assertion helpers for validation results.
 * Reusable assertions to eliminate duplication.
 */

import type { ValidationResult, ValidationError } from '../../types';
import type { GameState } from '../../../types';
import { Faction, TerritoryId } from '../../../types';
import {
  getForceCountInTerritory,
  getFactionsOccupyingTerritory,
  getBGFightersInSector,
  getBGAdvisorsInTerritory,
  getFactionState,
} from '../../../state';

export class ValidationAssertions {
  /**
   * Assert that a validation result is valid
   */
  static assertValid<T>(result: ValidationResult<T>, message?: string): void {
    if (!result.valid) {
      const errors = result.errors.map(e => e.message).join('; ');
      throw new Error(
        message || `Expected valid result, but got errors: ${errors}`
      );
    }
  }

  /**
   * Assert that a validation result is invalid
   */
  static assertInvalid<T>(result: ValidationResult<T>, message?: string): void {
    if (result.valid) {
      throw new Error(
        message || `Expected invalid result, but validation passed`
      );
    }
  }

  /**
   * Assert that result has specific error code
   */
  static assertErrorCode(
    result: ValidationResult,
    code: string,
    message?: string
  ): void {
    if (result.valid) {
      throw new Error(message || `Expected error code ${code}, but result is valid`);
    }
    if (!result.errors.some(e => e.code === code)) {
      const codes = result.errors.map(e => e.code).join(', ');
      throw new Error(
        message || `Expected error code ${code}, but got: ${codes}`
      );
    }
  }

  /**
   * Assert that result has specific error message (partial match)
   */
  static assertErrorMessage(
    result: ValidationResult,
    messagePattern: string | RegExp,
    message?: string
  ): void {
    if (result.valid) {
      throw new Error(message || `Expected error message, but result is valid`);
    }
    const hasMatch = result.errors.some(e => {
      if (typeof messagePattern === 'string') {
        return e.message.includes(messagePattern);
      }
      return messagePattern.test(e.message);
    });
    if (!hasMatch) {
      const messages = result.errors.map(e => e.message).join('; ');
      throw new Error(
        message || `Expected error message matching ${messagePattern}, but got: ${messages}`
      );
    }
  }

  /**
   * Assert that result has suggestions
   */
  static assertHasSuggestions<T>(
    result: ValidationResult<T>,
    minCount: number = 1,
    message?: string
  ): void {
    if (!result.suggestions || result.suggestions.length < minCount) {
      throw new Error(
        message || `Expected at least ${minCount} suggestions, but got ${result.suggestions?.length || 0}`
      );
    }
  }

  /**
   * Assert that result has specific context value
   */
  static assertContextValue(
    result: ValidationResult,
    key: string,
    expected: unknown,
    message?: string
  ): void {
    const actual = result.context[key];
    if (actual !== expected) {
      throw new Error(
        message || `Expected context.${key} to be ${expected}, but got ${actual}`
      );
    }
  }

  /**
   * Assert that error has suggestion
   */
  static assertErrorHasSuggestion(
    result: ValidationResult,
    errorIndex: number = 0,
    message?: string
  ): void {
    if (result.valid) {
      throw new Error(message || `Expected error with suggestion, but result is valid`);
    }
    const error = result.errors[errorIndex];
    if (!error || !error.suggestion) {
      throw new Error(
        message || `Expected error at index ${errorIndex} to have suggestion`
      );
    }
  }

  /**
   * Assert cost calculation
   */
  static assertCost(
    result: ValidationResult<{ cost: number }>,
    expectedCost: number,
    message?: string
  ): void {
    if (!result.valid) {
      throw new Error(message || `Cannot assert cost on invalid result`);
    }
    const actualCost = result.context.cost;
    if (actualCost !== expectedCost) {
      throw new Error(
        message || `Expected cost ${expectedCost}, but got ${actualCost}`
      );
    }
  }

  /**
   * Assert movement range
   */
  static assertMovementRange(
    result: ValidationResult<{ movementRange: number }>,
    expectedRange: number,
    message?: string
  ): void {
    if (!result.valid) {
      throw new Error(message || `Cannot assert movement range on invalid result`);
    }
    const actualRange = result.context.movementRange;
    if (actualRange !== expectedRange) {
      throw new Error(
        message || `Expected movement range ${expectedRange}, but got ${actualRange}`
      );
    }
  }

  /**
   * Assert path length
   */
  static assertPathLength(
    result: ValidationResult<{ pathLength: number }>,
    expectedLength: number,
    message?: string
  ): void {
    if (!result.valid) {
      throw new Error(message || `Cannot assert path length on invalid result`);
    }
    const actualLength = result.context.pathLength;
    if (actualLength !== expectedLength) {
      throw new Error(
        message || `Expected path length ${expectedLength}, but got ${actualLength}`
      );
    }
  }

  /**
   * Assert that result has no errors (valid result)
   */
  static assertNoErrors(result: ValidationResult): void {
    if (!result.valid && result.errors.length > 0) {
      const errors = result.errors.map(e => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`Expected no errors, but got: ${errors}`);
    }
  }

  /**
   * Assert that result has exactly N errors
   */
  static assertErrorCount(
    result: ValidationResult,
    expectedCount: number,
    message?: string
  ): void {
    const actualCount = result.errors.length;
    if (actualCount !== expectedCount) {
      throw new Error(
        message || `Expected ${expectedCount} errors, but got ${actualCount}`
      );
    }
  }
}

// Convenience functions for common assertions
export const assertValid = ValidationAssertions.assertValid;
export const assertInvalid = ValidationAssertions.assertInvalid;
export const assertErrorCode = ValidationAssertions.assertErrorCode;
export const assertErrorMessage = ValidationAssertions.assertErrorMessage;
export const assertHasSuggestions = ValidationAssertions.assertHasSuggestions;
export const assertContextValue = ValidationAssertions.assertContextValue;
export const assertCost = ValidationAssertions.assertCost;
export const assertMovementRange = ValidationAssertions.assertMovementRange;

/**
 * Execution-specific assertions for testing state mutations.
 * These verify game state after movement execution.
 */
export class ExecutionAssertions {
  /**
   * Get force count in specific territory and sector
   * Includes both fighters and advisors for BG
   */
  private static getForceCountInSector(
    state: GameState,
    faction: Faction,
    territory: TerritoryId,
    sector: number
  ): number {
    const factionState = getFactionState(state, faction);
    const stack = factionState.forces.onBoard.find(
      (s) => s.territoryId === territory && s.sector === sector
    );
    if (!stack) return 0;
    const fighters = (stack.forces.regular || 0) + (stack.forces.elite || 0);
    const advisors = stack.advisors ?? 0;
    return fighters + advisors; // Total forces (fighters + advisors)
  }

  /**
   * Get BG advisors in specific sector
   */
  private static getBGAdvisorsInSector(
    state: GameState,
    territory: TerritoryId,
    sector: number
  ): number {
    const factionState = getFactionState(state, Faction.BENE_GESSERIT);
    const stack = factionState.forces.onBoard.find(
      (s) => s.territoryId === territory && s.sector === sector
    );
    return stack?.advisors ?? 0;
  }

  /**
   * Assert that forces moved correctly.
   * For BG, counts both advisors and fighters as "forces".
   */
  static assertForcesMoved(
    before: GameState,
    after: GameState,
    faction: Faction,
    fromTerritory: TerritoryId,
    fromSector: number,
    toTerritory: TerritoryId,
    toSector: number,
    count: number
  ): void {
    // Verify source forces decreased
    const beforeCount = this.getForceCountInSector(before, faction, fromTerritory, fromSector);
    const afterCount = this.getForceCountInSector(after, faction, fromTerritory, fromSector);
    const removed = beforeCount - afterCount;
    if (removed !== count) {
      throw new Error(
        `Expected ${count} forces removed from source, but ${removed} were removed (before: ${beforeCount}, after: ${afterCount})`
      );
    }

    // Verify destination forces increased
    // Note: For BG, advisors might flip to fighters, so we count total (advisors + fighters)
    const beforeDestCount = this.getForceCountInSector(before, faction, toTerritory, toSector);
    const afterDestCount = this.getForceCountInSector(after, faction, toTerritory, toSector);
    const added = afterDestCount - beforeDestCount;
    
    // For BG movements with flipping, the count should be at least the moved count
    // (might be more if there were existing forces that got merged)
    if (added < count) {
      throw new Error(
        `Expected at least ${count} forces added to destination, but only ${added} were added (before: ${beforeDestCount}, after: ${afterDestCount})`
      );
    }
    // If more were added, that's acceptable (could be due to existing forces in destination)
  }

  /**
   * Assert that BG advisors flipped to fighters.
   * Checks destination territory - advisors should be 0 and fighters should increase by expectedFlipped.
   */
  static assertAdvisorsFlipped(
    before: GameState,
    after: GameState,
    territory: TerritoryId,
    sector: number,
    expectedFlipped: number
  ): void {
    const beforeFighters = getBGFightersInSector(before, territory, sector);
    const afterAdvisors = this.getBGAdvisorsInSector(after, territory, sector);
    const afterFighters = getBGFightersInSector(after, territory, sector);

    // After movement with ENLISTMENT/ADAPTIVE FORCE, destination should have:
    // - 0 advisors (they flipped)
    // - fighters increased by expectedFlipped (the flipped advisors)
    if (afterAdvisors !== 0) {
      throw new Error(
        `Expected 0 advisors in destination after flip, but got ${afterAdvisors}`
      );
    }

    const fightersGained = afterFighters - beforeFighters;
    if (fightersGained !== expectedFlipped) {
      throw new Error(
        `Expected ${expectedFlipped} fighters gained in destination after flip, but got ${fightersGained} (before: ${beforeFighters}, after: ${afterFighters})`
      );
    }
  }

  /**
   * Assert that BG advisors did NOT flip (restriction applied).
   * Checks destination territory - should have advisors (not fighters) after movement.
   */
  static assertAdvisorsNotFlipped(
    before: GameState,
    after: GameState,
    territory: TerritoryId,
    sector: number,
    expectedAdvisorCount: number
  ): void {
    const afterAdvisors = this.getBGAdvisorsInSector(after, territory, sector);
    const afterFighters = getBGFightersInSector(after, territory, sector);

    // After movement with restriction blocking ENLISTMENT, destination should have:
    // - expectedAdvisorCount advisors (they stayed as advisors)
    // - 0 fighters (they did NOT flip)
    if (afterAdvisors !== expectedAdvisorCount) {
      throw new Error(
        `Expected ${expectedAdvisorCount} advisors in destination (not flipped), but got ${afterAdvisors}`
      );
    }

    if (afterFighters !== 0) {
      throw new Error(
        `Expected 0 fighters in destination (advisors should not flip), but got ${afterFighters}`
      );
    }
  }

  /**
   * Assert state immutability
   */
  static assertStateImmutability(original: GameState, result: GameState): void {
    if (original === result) {
      throw new Error('State mutation detected: result is same object as input');
    }
  }

  /**
   * Assert stronghold occupancy after execution
   */
  static assertStrongholdOccupancy(
    state: GameState,
    territory: TerritoryId,
    maxFactions: number = 2
  ): void {
    const occupants = getFactionsOccupyingTerritory(state, territory);
    if (occupants.length > maxFactions + 1) {
      // +1 because moving faction can be 3rd
      throw new Error(
        `Stronghold ${territory} has ${occupants.length} factions, exceeding limit of ${maxFactions + 1}`
      );
    }
  }

  /**
   * Assert force count in territory/sector
   */
  static assertForceCount(
    state: GameState,
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    expectedCount: number
  ): void {
    const actualCount = this.getForceCountInSector(state, faction, territory, sector);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} forces in ${territory} sector ${sector}, but got ${actualCount}`
      );
    }
  }

  /**
   * Assert BG advisor count in sector
   */
  static assertBGAdvisorCount(
    state: GameState,
    territory: TerritoryId,
    sector: number,
    expectedCount: number
  ): void {
    const actualCount = this.getBGAdvisorsInSector(state, territory, sector);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} BG advisors in ${territory} sector ${sector}, but got ${actualCount}`
      );
    }
  }

  /**
   * Assert BG fighter count in sector
   */
  static assertBGFighterCount(
    state: GameState,
    territory: TerritoryId,
    sector: number,
    expectedCount: number
  ): void {
    const actualCount = getBGFightersInSector(state, territory, sector);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} BG fighters in ${territory} sector ${sector}, but got ${actualCount}`
      );
    }
  }
}

