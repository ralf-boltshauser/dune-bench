"use client";

import type { StormInfo } from "../../hooks/usePhaseInfo";
import { Faction } from "@/lib/game/types/enums";
import InfoCard from "@/app/components/ui/InfoCard";
import FactionBadge from "@/app/components/ui/FactionBadge";

interface StormInfoCardProps {
  stormInfo: StormInfo | null;
}

/**
 * Component to display storm phase information
 * Shows storm dial results, movement calculation, and storm order
 */
export default function StormInfoCard({ stormInfo }: StormInfoCardProps) {
  // Don't render if no storm info
  if (!stormInfo) {
    return null;
  }

  return (
    <InfoCard title="Storm Information">

      {/* Storm Movement */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-600 mb-2">Movement</div>
        <div className="flex items-center gap-2 text-base">
          <span className="font-semibold">Sector {stormInfo.from}</span>
          <span className="text-gray-400">→</span>
          <span className="font-semibold">Sector {stormInfo.to}</span>
          <span className="text-gray-500 text-sm">({stormInfo.movement} spaces)</span>
        </div>
      </div>

      {/* Dial Results */}
      {stormInfo.dialResults.size > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Dial Results</div>
          <div className="space-y-1">
            {Array.from(stormInfo.dialResults.entries()).map(([faction, value]) => (
              <div
                key={faction}
                className="flex items-center justify-between"
              >
                <FactionBadge faction={faction as Faction} size="sm" />
                <span className="text-sm font-semibold text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storm Order */}
      {stormInfo.stormOrder.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">Storm Order</div>
          <div className="flex flex-wrap gap-2">
            {stormInfo.stormOrder.map((faction, index) => (
              <div key={faction} className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">{index + 1}.</span>
                <FactionBadge faction={faction} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </InfoCard>
  );
}

