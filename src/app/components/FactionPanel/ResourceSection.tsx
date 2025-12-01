/**
 * Resource section components for FactionPanel
 */

import { FactionState } from "@/lib/game/types/state";
import { SPICE_COLOR } from "../constants";
import { formatForceBreakdown, getTotalTanks } from "../utils";

// =============================================================================
// SPICE SECTION
// =============================================================================

interface SpiceSectionProps {
  spice: number;
  spiceBribes: number;
}

export function SpiceSection({ spice, spiceBribes }: SpiceSectionProps) {
  return (
    <div className="mb-2">
      <div className="text-sm font-semibold text-gray-700">Spice</div>
      <div className="text-lg font-bold" style={{ color: SPICE_COLOR }}>
        {spice}
      </div>
      {spiceBribes > 0 && (
        <div className="text-xs text-gray-500">Bribes: {spiceBribes}</div>
      )}
    </div>
  );
}

// =============================================================================
// FORCES SECTION
// =============================================================================

interface ForcesSectionProps {
  label: string;
  regular: number;
  elite: number;
}

export function ForcesSection({ label, regular, elite }: ForcesSectionProps) {
  // Ensure non-negative values
  const safeRegular = Math.max(0, regular);
  const safeElite = Math.max(0, elite);
  const total = safeRegular + safeElite;
  
  if (total === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="text-base">
        <span className="font-medium">{total}</span>
        {safeElite > 0 && (
          <span className="text-xs text-gray-600 ml-1">
            ({formatForceBreakdown(safeRegular, safeElite)})
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RESERVES SECTION
// =============================================================================

interface ReservesSectionProps {
  state: FactionState;
}

export function ReservesSection({ state }: ReservesSectionProps) {
  return (
    <ForcesSection
      label="Reserves"
      regular={state.forces.reserves.regular}
      elite={state.forces.reserves.elite}
    />
  );
}

// =============================================================================
// TANKS SECTION
// =============================================================================

interface TanksSectionProps {
  state: FactionState;
}

export function TanksSection({ state }: TanksSectionProps) {
  const total = getTotalTanks(state);
  if (total === 0) {
    return null;
  }

  return (
    <ForcesSection
      label="Tanks"
      regular={state.forces.tanks.regular}
      elite={state.forces.tanks.elite}
    />
  );
}

// =============================================================================
// CARDS SECTION
// =============================================================================

interface CardsSectionProps {
  handSize: number;
  maxHandSize: number;
}

export function CardsSection({ handSize, maxHandSize }: CardsSectionProps) {
  return (
    <div className="mb-2">
      <div className="text-sm font-semibold text-gray-700">Cards</div>
      <div className="text-base">
        <span className="font-medium">{handSize}</span>
        <span className="text-xs text-gray-600 ml-1">/ {maxHandSize}</span>
      </div>
    </div>
  );
}

