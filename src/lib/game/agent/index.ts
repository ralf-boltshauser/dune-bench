/**
 * Agent Module
 *
 * AI agent integration for the Dune game simulation.
 * Uses Claude via Vercel AI SDK to make decisions for each faction.
 */

// Provider
export {
  ClaudeAgentProvider,
  createClaudeAgentProvider,
  type ClaudeAgentConfig,
} from './claude-provider';

// Prompts
export { getFactionPrompt, getAllFactionPrompts } from './prompts';

// Game Runner
export {
  GameRunner,
  runDuneGame,
  runQuickGame,
  runFromState,
  type GameRunnerConfig,
  type GameSummary,
  type RunFromStateOptions,
} from './game-runner';
