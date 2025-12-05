/**
 * Unit Tests for Emperor Module
 * 
 * Tests for bidding/emperor.ts functions.
 */

import { Faction } from "../../../types";
import { payEmperor } from "../../../phases/handlers/bidding/emperor";
import { assertSpice } from "../helpers/assertions";
import { BiddingTestStateBuilder } from "../helpers/test-state-builder";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all Emperor module tests
 */
export function runEmperorTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('EMPEROR MODULE TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  console.log('\n📋 Testing payEmperor()...');

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.EMPEROR])
      .withSpice(Faction.ATREIDES, 15)
      .withSpice(Faction.EMPEROR, 10)
      .build();

    const amount = 5;
    const newState = payEmperor(state, Faction.ATREIDES, amount);

    // Check that Emperor's spice increased by the amount
    const emperorState = newState.factions.get(Faction.EMPEROR);
    const originalEmperorState = state.factions.get(Faction.EMPEROR);
    const expectedSpice = (originalEmperorState?.spice ?? 0) + amount;
    assertSpice(newState, Faction.EMPEROR, expectedSpice);
    console.log('  ✅ payEmperor adds spice to Emperor when other faction wins');
    passed++;
  } catch (error) {
    console.error('  ❌ payEmperor adds spice to Emperor:', error);
    failed++;
  }

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.EMPEROR])
      .withSpice(Faction.EMPEROR, 10)
      .build();

    const amount = 5;
    const newState = payEmperor(state, Faction.EMPEROR, amount);

    // Emperor should not receive payment when buying own card
    const originalEmperorState = state.factions.get(Faction.EMPEROR);
    const expectedSpice = originalEmperorState?.spice ?? 0;
    assertSpice(newState, Faction.EMPEROR, expectedSpice); // Unchanged
    console.log('  ✅ payEmperor does NOT add spice when Emperor wins own card');
    passed++;
  } catch (error) {
    console.error('  ❌ payEmperor does NOT add spice when Emperor wins:', error);
    failed++;
  }

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withSpice(Faction.EMPEROR, 10)
      .build();

    let newState = payEmperor(state, Faction.ATREIDES, 3);
    newState = payEmperor(newState, Faction.HARKONNEN, 7);

    // Check that Emperor's spice increased by total amount
    const originalEmperorState = state.factions.get(Faction.EMPEROR);
    const expectedSpice = (originalEmperorState?.spice ?? 0) + 3 + 7;
    assertSpice(newState, Faction.EMPEROR, expectedSpice);
    console.log('  ✅ payEmperor handles multiple payments accumulating');
    passed++;
  } catch (error) {
    console.error('  ❌ payEmperor handles multiple payments:', error);
    failed++;
  }

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .build();

    const amount = 5;
    const newState = payEmperor(state, Faction.ATREIDES, amount);

    assert(newState !== undefined, "Expected state to be returned");
    console.log('  ✅ payEmperor handles Emperor not in game (no error)');
    passed++;
  } catch (error) {
    console.error('  ❌ payEmperor handles Emperor not in game:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

