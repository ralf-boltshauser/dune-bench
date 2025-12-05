/**
 * Phase Utilities
 *
 * Utilities for phase-specific testing.
 */

import { Phase } from "@/lib/game/types";

export function getPhaseToolNames(phase: Phase): string[] {
  // This would normally come from the tools registry
  // For now, return empty array - tests can override
  return [];
}

export function isInformationPhase(phase: Phase): boolean {
  // Phases where only information tools are available
  return phase === Phase.SPICE_BLOW;
}

