/**
 * EXAMPLE: Refactored runPhase using SynchronizedStateManager
 * 
 * This shows how to use SynchronizedStateManager to eliminate manual sync calls.
 * Compare with the current implementation to see the difference.
 */

import { SynchronizedStateManager } from '../state/synchronized-state-manager';

// BEFORE (Current - Manual Sync):
/*
async runPhase(state: GameState, phase: Phase): Promise<GameState> {
  // Update state to current phase
  state = { ...state, phase };
  
  // Manual sync ❌
  if (this.agentProvider.updateState) {
    this.agentProvider.updateState(state);
  }
  
  this.emitEvent({ type: 'PHASE_STARTED', ... });
  
  // Initialize
  let result = handler.initialize(state);
  state = result.state;
  
  // Manual sync ❌
  if (this.agentProvider.updateState) {
    this.agentProvider.updateState(state);
  }
  
  // Process steps
  while (!result.phaseComplete) {
    // ... get responses ...
    
    // Process step
    result = handler.processStep(state, responses);
    state = result.state;
    
    // Manual sync ❌
    if (this.agentProvider.updateState) {
      this.agentProvider.updateState(state);
    }
    
    // Sync from agent (tools may have updated)
    if (this.agentProvider.getState) {
      state = this.agentProvider.getState();
    }
  }
  
  // Cleanup
  state = handler.cleanup(state);
  
  // Manual sync ❌
  if (this.agentProvider.updateState) {
    this.agentProvider.updateState(state);
  }
  
  return state;
}
*/

// AFTER (Refactored - Auto Sync):
/*
async runPhase(state: GameState, phase: Phase): Promise<GameState> {
  // Create state manager - automatically syncs on every update ✅
  const stateManager = new SynchronizedStateManager(state, this.agentProvider);
  
  // Update state to current phase - auto syncs ✅
  stateManager.mutate(s => ({ ...s, phase }));
  
  this.emitEvent({ type: 'PHASE_STARTED', ... });
  
  // Initialize - auto syncs ✅
  let result = handler.initialize(stateManager.state);
  stateManager.applyStepResult(result);
  
  // Process steps
  while (!result.phaseComplete) {
    // Update state before getting responses - auto syncs ✅
    // (stateManager already has latest state)
    
    // Get responses
    const responses = await this.agentProvider.getResponses(...);
    
    // Sync from agent (tools may have updated) - one way sync
    stateManager.syncFromAgent();
    
    // Process step - auto syncs ✅
    result = handler.processStep(stateManager.state, responses);
    stateManager.applyStepResult(result);
    
    // Sync from agent again (tools may have updated during processStep)
    stateManager.syncFromAgent();
    
    this.emitEvents(result.events);
  }
  
  // Cleanup - auto syncs ✅
  const cleanupState = handler.cleanup(stateManager.state);
  stateManager.updateState(cleanupState);
  
  return stateManager.state;
}
*/

/**
 * Key Benefits:
 * 
 * 1. **No Manual Sync Calls**: All sync happens automatically
 * 2. **Impossible to Forget**: Can't forget to sync - it's automatic
 * 3. **Single Source of Truth**: State manager owns the state
 * 4. **Type-Safe**: TypeScript ensures correct usage
 * 5. **Easy to Debug**: Can add logging/tracing in one place
 * 6. **Testable**: Easy to mock sync target
 */

