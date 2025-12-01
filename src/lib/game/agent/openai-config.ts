/**
 * Centralized Azure OpenAI Configuration
 * 
 * This file centralizes all Azure OpenAI settings for easy maintenance.
 * Update the values here to change the resource, model, or API version.
 * 
 * Environment variables (from .env file):
 * - OPENAI_API_KEY or AZURE_API_KEY: Your Azure OpenAI API key
 * - OPENAI_MODEL: Override the default model/deployment name
 * - AZURE_RESOURCE_NAME: Override the default resource name (flprd)
 */

export const AZURE_CONFIG = {
  /** Azure OpenAI resource name */
  // This is used to construct: https://{resourceName}.openai.azure.com/openai/v1{path}
  resourceName: 'flprd',
  
  /** API version for Azure OpenAI */
  // Default is 'v1', but can use date format like '2024-10-21' or '2025-04-01-preview'
  apiVersion: 'v1',
  
  /** Default model/deployment name to use */
  // Note: For Azure OpenAI, this should be your deployment name
  defaultModel: 'gpt-5-mini',
  
  /** Environment variable name for API key */
  apiKeyEnvVar: 'OPENAI_API_KEY',
  
  /** Environment variable name for model override */
  modelEnvVar: 'OPENAI_MODEL',
} as const;

/**
 * Get the Azure resource name
 */
export function getAzureResourceName(): string {
  return process.env.AZURE_RESOURCE_NAME || AZURE_CONFIG.resourceName;
}

/**
 * Get the API version
 */
export function getAzureApiVersion(): string {
  return AZURE_CONFIG.apiVersion;
}

/**
 * Get the API key from environment variables
 */
export function getAzureApiKey(): string {
  return process.env[AZURE_CONFIG.apiKeyEnvVar] || process.env.AZURE_API_KEY || '';
}

/**
 * Get the model to use (from env or default)
 */
export function getAzureModel(): string {
  return process.env[AZURE_CONFIG.modelEnvVar] || AZURE_CONFIG.defaultModel;
}

/**
 * Validate that the API key is set
 */
export function validateAzureConfig(): { valid: boolean; error?: string } {
  const apiKey = getAzureApiKey();
  if (!apiKey) {
    return {
      valid: false,
      error: `${AZURE_CONFIG.apiKeyEnvVar} or AZURE_API_KEY environment variable is required`,
    };
  }
  return { valid: true };
}

// Legacy exports for backward compatibility
export const OPENAI_CONFIG = AZURE_CONFIG;
export const getOpenAIBaseURL = () => `https://${getAzureResourceName()}.openai.azure.com/openai`;
export const getOpenAIApiKey = getAzureApiKey;
export const getOpenAIModel = getAzureModel;
export const validateOpenAIConfig = validateAzureConfig;

