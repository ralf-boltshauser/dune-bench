/**
 * Prompt Builder
 *
 * Builds system and user prompts for agent requests.
 */

import type { Faction } from "../../types";
import { FACTION_NAMES } from "../../types";
import type { AgentRequest } from "../../phases/types";
import { getFactionPrompt } from "../prompts/faction-prompt";
import { getGeneralAgentSystemPrompt } from "../prompts/system-prompt";
import {
  buildSystemPromptTemplate,
  buildUserPromptTemplate,
} from "../prompts/prompt-templates";

/**
 * Build the system prompt for a faction.
 *
 * Combines the general agent system prompt with faction-specific instructions.
 */
export function buildSystemPrompt(faction: Faction): string {
  const generalPrompt = getGeneralAgentSystemPrompt();
  const factionPrompt = getFactionPrompt(faction);
  const factionName = FACTION_NAMES[faction];

  return buildSystemPromptTemplate(generalPrompt, factionPrompt, factionName);
}

/**
 * Build the user prompt from a request.
 */
export function buildUserPrompt(request: AgentRequest): string {
  return buildUserPromptTemplate(
    request.prompt,
    request.context,
    request.availableActions
  );
}

