/**
 * OpenAI Azure Connection Test
 * 
 * Simple test script to verify OpenAI Azure connection is working.
 * Tests reading credentials from environment and making a simple API call.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file with override to ensure .env takes precedence over shell env vars
config({ path: resolve(process.cwd(), '.env'), override: true });

import { generateText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import {
  getAzureResourceName,
  getAzureApiKey,
  getAzureModel,
  getAzureApiVersion,
  validateAzureConfig,
} from './src/lib/game/agent/openai-config';

async function testOpenAIConnection() {
  console.log('🔍 Testing Azure OpenAI Connection...\n');

  // Validate configuration
  const validation = validateAzureConfig();
  if (!validation.valid) {
    console.error(`❌ Configuration Error: ${validation.error}`);
    console.error(`\nPlease set the OPENAI_API_KEY or AZURE_API_KEY environment variable.`);
    process.exit(1);
  }

  const apiKey = getAzureApiKey();
  const model = getAzureModel();
  const resourceName = getAzureResourceName();
  const apiVersion = getAzureApiVersion();

  console.log('📋 Configuration:');
  console.log(`   Resource Name: ${resourceName}`);
  console.log(`   Model/Deployment: ${model}`);
  console.log(`   API Version: ${apiVersion}`);
  console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('');

  // Create Azure OpenAI client
  const azure = createAzure({
    resourceName,
    apiKey,
    apiVersion,
  });

  console.log('🚀 Making test API call...\n');
  console.log('💡 Using Azure OpenAI responses API\n');

  try {
    const startTime = Date.now();
    
    // Use Azure OpenAI responses API
    // Note: Reasoning models (responses API) don't support temperature parameter
    const result = await generateText({
      model: azure.responses(model),
      prompt: 'Say "Hello, Azure OpenAI connection test successful!" in exactly those words.',
      maxOutputTokens: 50,
    });

    const duration = Date.now() - startTime;

    console.log('✅ Connection successful!\n');
    console.log('📤 Response:');
    console.log(`   ${result.text}\n`);
    console.log('📊 Stats:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Tokens used: ${result.usage?.totalTokens ?? 'N/A'}`);
    console.log(`   Finish reason: ${result.finishReason ?? 'N/A'}`);
    
    // Show Azure-specific metadata if available
    if (result.providerMetadata?.openai) {
      const metadata = result.providerMetadata.openai;
      console.log('\n📋 Azure Metadata:');
      if (metadata.responseId) console.log(`   Response ID: ${metadata.responseId}`);
      if (metadata.cachedPromptTokens) console.log(`   Cached tokens: ${metadata.cachedPromptTokens}`);
      if (metadata.reasoningTokens) console.log(`   Reasoning tokens: ${metadata.reasoningTokens}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed!\n');
    
    if (error instanceof Error) {
      console.error('Error details:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Name: ${error.name}`);
      
      if ('response' in error) {
        const errorWithResponse = error as Error & { response?: unknown };
        console.error(`   Response: ${JSON.stringify(errorWithResponse.response, null, 2)}`);
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    return false;
  }
}

// Run the test
testOpenAIConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

