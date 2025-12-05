/**
 * Prompt Assertions
 *
 * Reusable assertions for prompt validation.
 */

import { Faction, FACTION_NAMES } from "@/lib/game/types";
import { getFactionPrompt } from "@/lib/game/agent/prompts/faction-prompt";
import { getGeneralAgentSystemPrompt } from "@/lib/game/agent/prompts/system-prompt";

export class PromptAssertions {
  static expectSystemPromptIncludes(
    prompt: string,
    content: string
  ): void {
    if (!prompt.includes(content)) {
      throw new Error(
        `Expected prompt to include "${content}", but it didn't`
      );
    }
  }

  static expectFactionPrompt(
    prompt: string,
    faction: Faction
  ): void {
    const factionPrompt = getFactionPrompt(faction);
    if (!prompt.includes(factionPrompt)) {
      throw new Error(
        `Expected prompt to include faction-specific content for ${faction}`
      );
    }

    const factionName = FACTION_NAMES[faction];
    if (!prompt.includes(factionName)) {
      throw new Error(
        `Expected prompt to include faction name ${factionName}`
      );
    }
  }

  static expectGeneralPrompt(prompt: string): void {
    const generalPrompt = getGeneralAgentSystemPrompt();
    if (!prompt.includes(generalPrompt)) {
      throw new Error("Expected prompt to include general system prompt");
    }
  }

  static expectPromptStructure(prompt: string): void {
    // Check for key sections
    const sections = [
      "Core Principles",
      "Multi-Step Decision Making",
      "Decision-Making Process",
      "Faction-Specific Instructions",
      "Game Rules Summary",
      "Response Format",
    ];

    for (const section of sections) {
      if (!prompt.includes(section)) {
        throw new Error(
          `Expected prompt to include section "${section}"`
        );
      }
    }
  }

  static expectDifferentPrompts(
    prompt1: string,
    prompt2: string
  ): void {
    if (prompt1 === prompt2) {
      throw new Error("Expected prompts to be different");
    }
  }
}

