/**
 * Centralized Environment Variable Loader
 * 
 * Ensures .env file is loaded with proper precedence over shell environment variables.
 * This should be imported at the top of any entry point file.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Load environment variables from .env file.
 * Uses override: true to ensure .env values take precedence over shell env vars.
 * 
 * Call this at the top of entry point files (CLI scripts, test files, etc.)
 * 
 * @example
 * ```ts
 * import './env-loader';
 * // ... rest of your code
 * ```
 */
export function loadEnv(): void {
  config({
    path: resolve(process.cwd(), '.env'),
    override: true, // .env file values override existing env vars
  });
}

// Auto-load on import (for convenience)
loadEnv();

