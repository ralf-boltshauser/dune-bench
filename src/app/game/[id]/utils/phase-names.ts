/**
 * Phase display names
 * Single source of truth for phase name mappings
 */

import { Phase } from '@/lib/game/types/enums';

// =============================================================================
// PHASE NAMES
// =============================================================================

/**
 * Display names for game phases
 */
export const PHASE_NAMES: Record<Phase, string> = {
  [Phase.SETUP]: "Setup",
  [Phase.STORM]: "Storm",
  [Phase.SPICE_BLOW]: "Spice Blow",
  [Phase.CHOAM_CHARITY]: "CHOAM Charity",
  [Phase.BIDDING]: "Bidding",
  [Phase.REVIVAL]: "Revival",
  [Phase.SHIPMENT_MOVEMENT]: "Shipment & Movement",
  [Phase.BATTLE]: "Battle",
  [Phase.SPICE_COLLECTION]: "Spice Collection",
  [Phase.MENTAT_PAUSE]: "Mentat Pause",
};

