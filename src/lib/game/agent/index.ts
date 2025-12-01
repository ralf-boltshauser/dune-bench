/**
 * Agent Module
 *
 * AI agent integration for the Dune game simulation.
 * Uses Azure OpenAI via Vercel AI SDK to make decisions for each faction.
 */

// Environment loader (import this at the top of entry points)
export { loadEnv } from './env-loader';

// Provider
export {
  AzureAgentProvider,
  createAgentProvider,
  type AgentConfig,
} from './azure-provider';

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
