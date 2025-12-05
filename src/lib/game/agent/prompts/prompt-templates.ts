/**
 * Prompt Composition Templates
 *
 * Single source of truth for prompt structure and formatting.
 */

/**
 * Game rules summary section (used in system prompts)
 */
export const GAME_RULES_SUMMARY = `## Game Rules Summary
- The goal is to control 3 strongholds (or 4 if allied) at the end of any phase
- Spice is the currency - used for shipping forces, buying cards, and reviving troops
- Battles are resolved simultaneously with hidden battle plans
- Each faction has unique abilities that give them advantages`;

/**
 * Response format instructions (used in system prompts)
 */
export const RESPONSE_FORMAT = `## Response Format
- Use the available tools to take actions
- If you cannot or choose not to act, use a "pass" tool
- Explain your reasoning briefly after taking action`;

/**
 * Build the complete system prompt by combining general prompt, faction info, and rules
 */
export function buildSystemPromptTemplate(
  generalPrompt: string,
  factionPrompt: string,
  factionName: string
): string {
  return `${generalPrompt}

---

## Faction-Specific Instructions

You are playing as the ${factionName} faction.

${factionPrompt}

${GAME_RULES_SUMMARY}

${RESPONSE_FORMAT}`;
}

/**
 * Build the user prompt from request context
 */
export function buildUserPromptTemplate(
  prompt: string,
  context: Record<string, unknown>,
  availableActions: string[]
): string {
  const contextStr = Object.entries(context)
    .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
    .join("\n");

  return `${prompt}

Current Context:
${contextStr}

Available Actions: ${availableActions.join(", ")}

Decide what to do. Use the appropriate tool to take your action.`;
}

