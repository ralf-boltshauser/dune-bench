/**
 * Agent Response Builder for Spice Collection Phase
 * 
 * Note: Spice collection is automatic, so this builder is not actually needed.
 * However, we keep it for consistency with other phase tests and potential
 * future use (e.g., if Karama cards can interrupt spice collection).
 */

import type { AgentResponse } from '../../../phases/types';
import { Faction } from '../../../types';

export class AgentResponseBuilder {
  private responses: Map<string, AgentResponse[]> = new Map();

  /**
   * Get all queued responses
   */
  getResponses(): Map<string, AgentResponse[]> {
    return this.responses;
  }

  /**
   * Clear all responses
   */
  clear(): void {
    this.responses.clear();
  }

  // Note: No methods needed for spice collection since it's automatic
  // But we keep this class for consistency and potential future use
}

