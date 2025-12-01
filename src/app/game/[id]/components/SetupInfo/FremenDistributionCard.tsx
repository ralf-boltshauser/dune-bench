"use client";

import type { FremenDistribution } from "../../hooks/useSetupInfo";
import Card from "@/app/components/ui/Card";
import { FREMEN_STARTING_TERRITORY_NAMES } from "../../utils/territory-names";

// =============================================================================
// TYPES
// =============================================================================

interface FremenDistributionCardProps {
  distribution: FremenDistribution;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Shows Fremen force distribution across 3 territories
 * Displays numbers for each territory and total (should always be 10)
 */
export default function FremenDistributionCard({
  distribution,
}: FremenDistributionCardProps) {
  const total =
    distribution.sietch_tabr +
    distribution.false_wall_south +
    distribution.false_wall_west;

  return (
    <Card borderColor="#ef4444" title="Fremen Force Distribution">
      <div className="space-y-2.5">
        {(Object.keys(distribution) as Array<keyof FremenDistribution>).map(
          (territory) => (
            <div
              key={territory}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
            >
              <span className="text-sm font-semibold text-slate-700">
                {FREMEN_STARTING_TERRITORY_NAMES[territory]}
              </span>
              <span className="text-lg font-bold text-slate-800">
                {distribution[territory]}
              </span>
            </div>
          )
        )}

        <div className="mt-4 pt-4 border-t border-slate-300 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 border border-red-200">
          <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Total</span>
          <span className="text-xl font-bold text-red-600">{total}</span>
        </div>
      </div>
    </Card>
  );
}

