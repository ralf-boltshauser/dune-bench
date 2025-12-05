/**
 * Mock Agent Provider for Shipment & Movement Phase Tests
 * 
 * Uses pre-queued responses from AgentResponseBuilder instead of calling Azure OpenAI.
 */

import type { AgentRequest, AgentResponse } from '../../../phases/types';
import type { AgentProvider } from '../../../phases/phase-manager';
import type { GameState } from '../../../types';
import { Faction } from '../../../types';
import { AgentResponseBuilder } from './agent-response-builder';

export class MockAgentProvider implements AgentProvider {
  private gameState: GameState;
  private responseBuilder: AgentResponseBuilder;
  private responseQueues: Map<string, AgentResponse[]> = new Map();

  constructor(initialState: GameState, responseBuilder: AgentResponseBuilder) {
    this.gameState = initialState;
    this.responseBuilder = responseBuilder;
    
    // Pre-load all responses from builder
    const allResponses = responseBuilder.getResponses();
    for (const [requestType, responses] of allResponses.entries()) {
      this.responseQueues.set(requestType, [...responses]);
      // Debug: Log queued responses for Guild shipments
      if (requestType === 'SHIP_FORCES') {
        const guildResponses = responses.filter(r => {
          const fid = r.factionId;
          return fid === Faction.SPACING_GUILD || fid === 'spacing_guild' || fid === 'SPACING_GUILD' || String(fid).toLowerCase() === 'spacing_guild';
        });
        if (guildResponses.length > 0) {
          console.log(`   🔍 DEBUG: MockAgentProvider constructor - Queued ${guildResponses.length} Guild SHIP_FORCES responses:`);
          guildResponses.forEach((r, i) => {
            console.log(`   🔍 DEBUG:   Response ${i + 1}: factionId=${r.factionId}, actionType=${r.actionType}, data keys: ${Object.keys(r.data || {}).join(', ')}`);
          });
        }
      }
      // Debug: Log queued responses for MOVE_FORCES
      if (requestType === 'MOVE_FORCES') {
        console.log(`   🔍 DEBUG: MockAgentProvider constructor - MOVE_FORCES queue: ${responses.length} responses`);
        responses.forEach((r, i) => {
          const fid = String(r.factionId).toLowerCase();
          const isBG = fid === 'bene_gesserit' || fid === 'bene gesserit';
          if (isBG) {
            console.log(`   🔍 DEBUG:   BG Response ${i + 1}: factionId=${r.factionId} (${typeof r.factionId}), actionType=${r.actionType}, from=${(r.data as any)?.fromTerritoryId}, to=${(r.data as any)?.toTerritoryId}`);
          }
        });
        console.log(`   🔍 DEBUG: MockAgentProvider constructor - Total MOVE_FORCES responses: ${responses.length}, factionIds: ${responses.map(r => `${r.factionId} (${typeof r.factionId})`).join(', ')}`);
      }
    }
  }

  updateState(state: GameState): void {
    this.gameState = state;
  }

  getState(): GameState {
    return this.gameState;
  }

  async getResponses(
    requests: AgentRequest[],
    _simultaneous: boolean
  ): Promise<AgentResponse[]> {
    const responses = await Promise.all(
      requests.map((request) => this.getResponseForRequest(request))
    );
    // Debug: Log responses for Guild shipments
    const guildResponses = responses.filter(r => r.factionId === Faction.SPACING_GUILD || r.factionId === 'spacing_guild');
    if (guildResponses.length > 0) {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponses - Returning ${guildResponses.length} Guild responses with actionTypes: ${guildResponses.map(r => r.actionType).join(', ')}`);
    }
    return responses;
  }

  private getResponseForRequest(request: AgentRequest): AgentResponse {
    const queue = this.responseQueues.get(request.requestType);
    
    // Debug: Log FLIP_ADVISORS requests
    if (request.requestType === 'FLIP_ADVISORS') {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponseForRequest - FLIP_ADVISORS request from ${request.factionId}`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Queue for FLIP_ADVISORS: ${queue ? queue.length : 0} responses`);
      if (queue && queue.length > 0) {
        console.log(`   🔍 DEBUG: MockAgentProvider - FLIP_ADVISORS queue responses: ${queue.map(r => `${r.factionId}:${r.actionType}`).join(', ')}`);
      }
    }
    
    // Debug: Log MOVE_FORCES requests
    if (request.requestType === 'MOVE_FORCES') {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponseForRequest - MOVE_FORCES request from ${request.factionId} (type: ${typeof request.factionId})`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Queue for MOVE_FORCES: ${queue ? queue.length : 0} responses`);
      if (queue && queue.length > 0) {
        console.log(`   🔍 DEBUG: MockAgentProvider - MOVE_FORCES queue responses: ${queue.map(r => `${r.factionId} (${typeof r.factionId}):${r.actionType}`).join(', ')}`);
      } else {
        // Queue is empty - log all queues to debug
        console.log(`   🔍 DEBUG: MockAgentProvider - MOVE_FORCES queue is empty. All queues: ${Array.from(this.responseQueues.entries()).map(([type, responses]) => `${type}: ${responses.length}`).join(', ')}`);
      }
    }
    
    if (!queue || queue.length === 0) {
      // No response queued - return pass response
      console.warn(
        `⚠️  No response queued for request type ${request.requestType} from ${request.factionId}, returning PASS`
      );
      return {
        factionId: request.factionId,
        actionType: 'PASS',
        data: {},
        passed: true,
      };
    }

    // Find response for this faction and request type
    // Try to find exact match first
    let response = queue.find((r) => {
      // Handle both string and enum faction IDs
      const requestFid = String(request.factionId).toLowerCase();
      const responseFid = String(r.factionId).toLowerCase();
      return requestFid === responseFid;
    });
    
    // Debug: Log matching process for MOVE_FORCES
    if (request.requestType === 'MOVE_FORCES') {
      console.log(`   🔍 DEBUG: MockAgentProvider - Matching MOVE_FORCES: request.factionId=${request.factionId} (${typeof request.factionId}), queue has ${queue.length} responses`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Queue factionIds: ${queue.map(r => `${r.factionId} (${typeof r.factionId})`).join(', ')}`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Found match: ${!!response}`);
    }
    
    // Debug: Log matching process for Guild shipments
    const isGuildRequest = request.requestType === 'SHIP_FORCES' && 
      (request.factionId === Faction.SPACING_GUILD || request.factionId === 'spacing_guild' || request.factionId === 'SPACING_GUILD');
    if (isGuildRequest) {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponseForRequest - requestType=${request.requestType}, request.factionId=${request.factionId} (type: ${typeof request.factionId})`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Queue has ${queue.length} responses, factionIds: ${queue.map(r => `${r.factionId} (${typeof r.factionId})`).join(', ')}`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Response actionTypes: ${queue.map(r => r.actionType).join(', ')}`);
      console.log(`   🔍 DEBUG: MockAgentProvider - Found match: ${!!response}, selected actionType=${response?.actionType || 'NONE'}`);
    }
    
    // If no exact match, take first response (for cases where faction doesn't matter)
    if (!response) {
      response = queue[0];
      if (isGuildRequest) {
        console.log(`   🔍 DEBUG: MockAgentProvider - No exact match, using first response: actionType=${response?.actionType}`);
      }
    }

    // Debug: Log response before returning for Guild shipments
    if (isGuildRequest) {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponseForRequest - About to return response with actionType=${response.actionType}`);
    }

    // Remove from queue (FIFO)
    const index = queue.indexOf(response);
    if (index > -1) {
      queue.splice(index, 1);
    }

    // Debug: Log response after removal for Guild shipments
    if (isGuildRequest) {
      console.log(`   🔍 DEBUG: MockAgentProvider.getResponseForRequest - Returning response with actionType=${response.actionType}`);
    }

    return response;
  }
}

