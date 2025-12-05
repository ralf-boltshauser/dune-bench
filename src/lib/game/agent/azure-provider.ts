/**
 * Azure Agent Provider
 *
 * Main export file - re-exports from provider module for backward compatibility.
 */

// Re-export from provider module
export {
  AzureAgentProvider,
  createAgentProvider,
} from "./provider/azure-provider";

// Re-export types
export type { AgentConfig } from "./provider/types";
