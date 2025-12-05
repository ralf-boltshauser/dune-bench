/**
 * Battle Plans Sub-Phase
 *
 * Handles battle plan creation and processing for both factions.
 */

import { Faction, BattleSubPhase, LeaderLocation, type BattlePlan } from "../../../../types";
import { getLeaderDefinition, getTreacheryCardDefinition, isWeaponCard, isDefenseCard } from "../../../../data";
import {
  getAlly,
  getFactionState,
} from "../../../../state";
import { countForcesInBattle } from "../utils";
import { createError } from "../../../../rules";
import { validateBattlePlan } from "../../../../rules/combat/validation";
import { createDefaultBattlePlan } from "../plans";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Request battle plans from both factions.
 */
/**
 * @rule 1.07.04 - Battle Plan: To resolve a battle, each player secretly formulates a Battle Plan.
 */
export function requestBattlePlans(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[]
): PhaseStepResult {
  const battle = context.currentBattle!;
  const pendingRequests: AgentRequest[] = [];

  for (const faction of [battle.aggressor, battle.defender]) {
    const factionState = getFactionState(state, faction);
    const isAggressor = faction === battle.aggressor;

    // Get available leaders
    const availableLeaders = factionState.leaders
      .filter((l) => l.location === LeaderLocation.LEADER_POOL)
      .map((l) => {
        const def = getLeaderDefinition(l.definitionId);
        return {
          id: l.definitionId,
          name: def?.name,
          strength: def?.strength,
        };
      });

    // Get available cards
    const availableCards = factionState.hand.map((c) => {
      const def = getTreacheryCardDefinition(c.definitionId);
      return {
        id: c.definitionId,
        name: def?.name,
        type: def?.type,
      };
    });

    // Get battle-capable forces in battle (for BG, excludes advisors)
    const totalForces = countForcesInBattle(state, faction, battle);

    // Prescience info for Atreides
    let prescienceInfo = null;
    if (
      faction === Faction.ATREIDES &&
      context.currentBattle!.prescienceUsed
    ) {
      prescienceInfo = {
        target: context.currentBattle!.prescienceTarget,
        opponent: context.currentBattle!.prescienceOpponent,
        result: context.currentBattle!.prescienceResult,
      };
    }

    // Voice command info (if Voice was used on this faction)
    let voiceCommand = null;
    if (battle.voiceUsed && battle.voiceCommand) {
      // Determine who Voice was used on
      const bgInBattle =
        battle.aggressor === Faction.BENE_GESSERIT ||
        battle.defender === Faction.BENE_GESSERIT;
      const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
      const isAllyBattle =
        bgAlly && (battle.aggressor === bgAlly || battle.defender === bgAlly);

      let voiceTarget: Faction;
      if (bgInBattle) {
        voiceTarget =
          battle.aggressor === Faction.BENE_GESSERIT
            ? battle.defender
            : battle.aggressor;
      } else if (isAllyBattle) {
        voiceTarget =
          battle.aggressor === bgAlly! ? battle.defender : battle.aggressor;
      } else {
        voiceTarget = battle.aggressor; // Fallback (shouldn't happen)
      }

      // If this faction is the Voice target, include the command
      if (voiceTarget === faction) {
        voiceCommand = battle.voiceCommand;
      }
    }

    // Build prompt with strategic guidance
    let prompt = `Create your battle plan for the battle in ${battle.territoryId}.`;
    
    // Emphasize weapon value - check if any available cards are weapons
    const hasWeapon = availableCards.some(c => {
      const cardDef = getTreacheryCardDefinition(c.id);
      return cardDef && isWeaponCard(cardDef);
    });
    if (hasWeapon) {
      prompt += `\n\n⚔️ STRATEGIC ADVICE: You have weapon cards available! Weapons are HIGHLY VALUABLE:
- Weapons KILL the opponent's leader (removing their leader strength from the battle)
- If opponent's leader dies, you gain a huge advantage - their total strength drops significantly
- Weapons are often MORE valuable than defense cards - offense wins battles
- Don't "save" weapons for later - use them when you have them to win important battles
- Consider playing a weapon if you have one, especially if you're not confident you'll win on strength alone`;
    }
    
    // Emphasize defense value
    const hasDefense = availableCards.some(c => {
      const cardDef = getTreacheryCardDefinition(c.id);
      return cardDef && isDefenseCard(cardDef);
    });
    if (hasDefense && !hasWeapon) {
      prompt += `\n\n🛡️ You have defense cards available. Defense protects your leader from opponent's weapons.`;
    }
    
    if (state.config.advancedRules) {
      prompt += `\n\nIMPORTANT: Advanced rules are enabled. You can pay spice to make your forces count at FULL strength (1 spice per force). Unspiced forces count at HALF strength. You have ${factionState.spice} spice available. Consider spicing your forces to win the battle!`;
      if (faction === Faction.FREMEN) {
        prompt += ` (Note: Fremen forces always count at full strength without spice due to BATTLE HARDENED ability.)`;
      }
    }

    pendingRequests.push({
      factionId: faction,
      requestType: "CREATE_BATTLE_PLAN",
      prompt,
      context: {
        isAggressor,
        opponent: isAggressor ? battle.defender : battle.aggressor,
        territory: battle.territoryId,
        sector: battle.sector,
        forcesAvailable: totalForces,
        availableLeaders,
        availableCards,
        spiceAvailable: factionState.spice,
        prescienceInfo,
        voiceCommand, // Include Voice command if applicable
      },
      availableActions: ["CREATE_BATTLE_PLAN"],
    });
  }

  return {
    state,
    phaseComplete: false,
    pendingRequests,
    simultaneousRequests: true, // Both submit at same time
    actions: [],
    events,
  };
}

/**
 * Process battle plan responses from both factions.
 */
export function processBattlePlans(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;

  console.log(`\n${"═".repeat(80)}`);
  console.log(`🔍 [Battle Plans] Processing ${responses.length} response(s)`);
  console.log(`${"═".repeat(80)}`);
  
  for (const response of responses) {
    console.log(`\n📥 [Battle Plans] Processing response from ${response.factionId.toUpperCase()}:`);
    console.log(`   Action Type: ${response.actionType}`);
    console.log(`   Passed: ${response.passed ?? false}`);
    if (response.reasoning) {
      console.log(`   Reasoning: ${response.reasoning.substring(0, 200)}${response.reasoning.length > 200 ? "..." : ""}`);
    }
    
    // Handle both tool response format (data.plan) and test mock format (data directly)
    let plan: BattlePlan | null = null;
    if (response.data.plan) {
      plan = response.data.plan as BattlePlan;
      console.log(`   📋 Plan format: tool response (data.plan)`);
    } else {
      // Test mock format - construct plan from data fields
      plan = {
        factionId: response.factionId,
        leaderId: (response.data.leaderId as string | null) ?? null,
        forcesDialed: (response.data.forcesDialed as number) ?? 0,
        weaponCardId: (response.data.weaponCardId as string | null) ?? null,
        defenseCardId: (response.data.defenseCardId as string | null) ?? null,
        kwisatzHaderachUsed:
          (response.data.useKwisatzHaderach as boolean) ?? false,
        cheapHeroUsed: (response.data.useCheapHero as boolean) ?? false,
        // @rule 1.13.04.04 - SPICED FORCES: When creating a Battle Plan, a player must add the amount of spice they plan to pay in the battle to their Battle Wheel.
        spiceDialed: (response.data.spiceDialed as number) ?? 0,
        announcedNoLeader: false,
      };
      console.log(`   📋 Plan format: test mock (constructed from data fields)`);
    }

    if (!plan) {
      console.log(`   ⚠️  Warning: No plan found in response, skipping`);
      continue;
    }
    
    console.log(`   📋 Plan details:`);
    console.log(`      - Leader: ${plan.leaderId || "none"}`);
    console.log(`      - Forces dialed: ${plan.forcesDialed}`);
    console.log(`      - Spice dialed: ${plan.spiceDialed}`);
    console.log(`      - Weapon: ${plan.weaponCardId || "none"}`);
    console.log(`      - Defense: ${plan.defenseCardId || "none"}`);
    console.log(`      - Cheap Hero: ${plan.cheapHeroUsed ? "yes" : "no"}`);
    console.log(`      - Kwisatz Haderach: ${plan.kwisatzHaderachUsed ? "yes" : "no"}`);

    // Validate prescience commitment if applicable
    if (
      battle.prescienceUsed &&
      battle.prescienceResult &&
      battle.prescienceOpponent === response.factionId
    ) {
      const prescienceTarget = battle.prescienceResult.type;
      const prescienceValue = battle.prescienceResult.value;

      // Check if submitted plan matches prescience commitment
      let commitmentViolated = false;
      let violationMessage = "";

      if (prescienceTarget === "leader") {
        // For leader, check if the committed leader matches
        if (prescienceValue !== null) {
          // If a specific leader was committed, must use that leader (or Cheap Hero if leader was null)
          if (
            prescienceValue !== plan.leaderId &&
            !(prescienceValue === null && plan.cheapHeroUsed)
          ) {
            commitmentViolated = true;
            violationMessage = `Prescience commitment: You revealed you would use leader ${prescienceValue}, but your plan uses ${
              plan.leaderId || "Cheap Hero"
            }`;
          }
        } else {
          // If committed to "not playing leader", must not play leader or Cheap Hero
          if (plan.leaderId || plan.cheapHeroUsed) {
            commitmentViolated = true;
            violationMessage =
              "Prescience commitment: You revealed you would not play a leader, but your plan includes a leader or Cheap Hero";
          }
        }
      } else if (prescienceTarget === "weapon") {
        // For weapon, check if the committed weapon matches
        if (prescienceValue !== null) {
          // If a specific weapon was committed, must use that weapon
          if (plan.weaponCardId !== prescienceValue) {
            commitmentViolated = true;
            violationMessage = `Prescience commitment: You revealed you would use weapon ${prescienceValue}, but your plan uses ${
              plan.weaponCardId || "no weapon"
            }`;
          }
        } else {
          // If committed to "not playing weapon", must not play weapon
          if (plan.weaponCardId) {
            commitmentViolated = true;
            violationMessage =
              "Prescience commitment: You revealed you would not play a weapon, but your plan includes a weapon";
          }
        }
      } else if (prescienceTarget === "defense") {
        // For defense, check if the committed defense matches
        if (prescienceValue !== null) {
          // If a specific defense was committed, must use that defense
          if (plan.defenseCardId !== prescienceValue) {
            commitmentViolated = true;
            violationMessage = `Prescience commitment: You revealed you would use defense ${prescienceValue}, but your plan uses ${
              plan.defenseCardId || "no defense"
            }`;
          }
        } else {
          // If committed to "not playing defense", must not play defense
          if (plan.defenseCardId) {
            commitmentViolated = true;
            violationMessage =
              "Prescience commitment: You revealed you would not play a defense, but your plan includes a defense";
          }
        }
      } else if (prescienceTarget === "number") {
        // For number, check if the committed forces/spice match
        if (
          prescienceValue !== null &&
          typeof prescienceValue === "object" &&
          !Array.isArray(prescienceValue)
        ) {
          const committed = prescienceValue as {
            forces: number;
            spice: number;
          };
          if (
            plan.forcesDialed !== committed.forces ||
            plan.spiceDialed !== committed.spice
          ) {
            commitmentViolated = true;
            violationMessage = `Prescience commitment: You revealed you would dial ${committed.forces} forces and ${committed.spice} spice, but your plan dials ${plan.forcesDialed} forces and ${plan.spiceDialed} spice`;
          }
        }
      }

      if (commitmentViolated) {
        const error = createError(
          "PRESCIENCE_COMMITMENT_VIOLATION",
          violationMessage,
          { field: prescienceTarget }
        );
        events.push({
          type: "BATTLE_PLAN_SUBMITTED",
          data: {
            faction: response.factionId,
            invalid: true,
            errors: [error],
          },
          message: `${response.factionId} battle plan violates prescience commitment: ${violationMessage}`,
        });
        // Use default plan (with smart force calculation)
        const defaultPlan = createDefaultBattlePlan(
          response.factionId,
          state,
          battle.territoryId,
          battle.sector
        );
        if (response.factionId === battle.aggressor) {
          battle.aggressorPlan = defaultPlan;
        } else {
          battle.defenderPlan = defaultPlan;
        }
        continue;
      }
    }

    // Validate plan (pass sector for accurate force counting, especially for Bene Gesserit)
    console.log(`   🔍 Validating battle plan...`);
    const validation = validateBattlePlan(
      state,
      response.factionId,
      battle.territoryId,
      plan,
      battle.sector
    );
    
    if (!validation.valid) {
      console.log(`   ❌ Validation FAILED:`);
      validation.errors.forEach(err => {
        console.log(`      - ${err.code}: ${err.message}${err.field ? ` (field: ${err.field})` : ""}`);
        if (err.suggestion) {
          console.log(`        Suggestion: ${err.suggestion}`);
        }
      });
      
      events.push({
        type: "BATTLE_PLAN_SUBMITTED",
        data: {
          faction: response.factionId,
          invalid: true,
          errors: validation.errors,
        },
        message: `${response.factionId} battle plan invalid: ${validation.errors[0]?.message}`,
      });
      // Use default plan (with smart force calculation)
      console.log(`   🔄 Using default battle plan instead`);
      const defaultPlan = createDefaultBattlePlan(
        response.factionId,
        state,
        battle.territoryId,
        battle.sector
      );
      if (response.factionId === battle.aggressor) {
        battle.aggressorPlan = defaultPlan;
      } else {
        battle.defenderPlan = defaultPlan;
      }
      console.log(`   ✅ Default plan applied`);
      continue;
    }
    
    console.log(`   ✅ Validation PASSED`);

    if (response.factionId === battle.aggressor) {
      battle.aggressorPlan = plan;
      console.log(`   ✅ Aggressor plan set`);
    } else {
      battle.defenderPlan = plan;
      console.log(`   ✅ Defender plan set`);
    }

    events.push({
      type: "BATTLE_PLAN_SUBMITTED",
      data: { faction: response.factionId },
      message: `${response.factionId} submits battle plan`,
    });

    // Log leader announcement if applicable
    // Rule from battle.md line 14: Player must announce when they cannot play a leader or Cheap Hero
    if (plan.announcedNoLeader) {
      events.push({
        type: "NO_LEADER_ANNOUNCED",
        data: { faction: response.factionId },
        message: `${response.factionId} announces they cannot play a leader or Cheap Hero`,
      });
    }
  }

  // Handle factions that didn't respond - use default plans
  const respondedFactions = new Set(responses.map((r) => r.factionId));
  for (const faction of [battle.aggressor, battle.defender]) {
    if (!respondedFactions.has(faction)) {
      // Agent didn't respond - use default plan
      const defaultPlan = createDefaultBattlePlan(
        faction,
        state,
        battle.territoryId,
        battle.sector
      );
      if (faction === battle.aggressor) {
        battle.aggressorPlan = defaultPlan;
      } else {
        battle.defenderPlan = defaultPlan;
      }
      events.push({
        type: "BATTLE_PLAN_SUBMITTED",
        data: {
          faction,
          default: true,
        },
        message: `${faction} did not respond, using default battle plan`,
      });
    }
  }

  // Ensure both plans are set (fallback if somehow still null)
  if (!battle.aggressorPlan) {
    battle.aggressorPlan = createDefaultBattlePlan(
      battle.aggressor,
      state,
      battle.territoryId,
      battle.sector
    );
  }
  if (!battle.defenderPlan) {
    battle.defenderPlan = createDefaultBattlePlan(
      battle.defender,
      state,
      battle.territoryId,
      battle.sector
    );
  }

  // Battle plans are submitted - move directly to reveal
  // (Voice and Prescience already happened before battle plans)
  context.subPhase = BattleSubPhase.REVEALING_PLANS;
  return callbacks.processReveal(state, events);
}

