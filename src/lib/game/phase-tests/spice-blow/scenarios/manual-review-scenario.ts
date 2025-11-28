/**
 * Manual Review Scenario: Complex Worm Devouring with Multiple Decisions
 * 
 * This scenario tests:
 * - Multiple worms in sequence
 * - Fremen ally protection decision
 * - Nexus with alliance changes
 * - Correct devour locations from discard piles
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario } from './base-scenario';

export async function testManualReviewScenario() {
  console.log('\n🧪 Testing: Manual Review Scenario - Complex Worm Devouring');
  
  // Set up a difficult scenario with multiple complex interactions
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SPICE_BLOW,
    turn: 2, // Not turn 1, so Nexus can occur
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    forces: [
      // Fremen and Atreides (allied) in Habbanya Erg
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 4 },
      // Harkonnen and Emperor in South Mesa
      { faction: Faction.HARKONNEN, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 3 },
      { faction: Faction.EMPEROR, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 2 },
    ],
    territorySpice: [
      { territory: TerritoryId.HABBANYA_ERG, sector: 14, amount: 8 },
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 10 },
    ],
    alliances: [[Faction.FREMEN, Faction.ATREIDES]], // Existing alliance
    // Deck A: Shai-Hulud first, then Territory Card (so worm appears and we test devouring)
    // The handler will continue drawing from Deck A until Territory Card appears
    spiceDeckA: [
      'shai_hulud_1', // First worm - should devour in Habbanya Erg (from pre-populated discard)
      'spice_habbanya_erg', // 8 spice, sector 14 - Territory Card after first worm
      'shai_hulud_2', // Second worm - should devour in Habbanya Erg (topmost Territory Card in discard)
      'spice_south_mesa', // 10 spice, sector 2 - Territory Card after second worm
    ],
    // Pre-populate discard with Habbanya Erg so first worm has something to devour
    spiceDiscardA: ['spice_habbanya_erg'],
  });

  // Provide controlled inputs for specific test cases
  const responses = new AgentResponseBuilder();
  
  // First worm: Fremen chooses to protect their ally Atreides
  responses.queueFremenProtection(Faction.FREMEN, true);
  
  // After first Territory Card after first worm: Nexus triggered
  // Fremen chooses to ride the worm (not devour)
  responses.queueWormRide(Faction.FREMEN, true);
  
  // Nexus negotiations after first worm
  responses.queueAllianceDecision(Faction.FREMEN, 'PASS'); // Keep alliance
  responses.queueAllianceDecision(Faction.ATREIDES, 'PASS'); // Keep alliance
  responses.queueAllianceDecision(Faction.HARKONNEN, 'FORM_ALLIANCE', Faction.EMPEROR); // Form new alliance
  responses.queueAllianceDecision(Faction.EMPEROR, 'FORM_ALLIANCE', Faction.HARKONNEN); // Form new alliance
  
  // Second worm: No Fremen protection needed (no ally in South Mesa)
  // After second Territory Card: Nexus triggered again
  responses.queueAllianceDecision(Faction.FREMEN, 'PASS');
  responses.queueAllianceDecision(Faction.ATREIDES, 'PASS');
  responses.queueAllianceDecision(Faction.HARKONNEN, 'PASS');
  responses.queueAllianceDecision(Faction.EMPEROR, 'PASS');

  // Run the real handler
  const result = await runSpiceBlowScenario(
    state,
    responses,
    'manual-review-scenario'
  );

  return result;
}

