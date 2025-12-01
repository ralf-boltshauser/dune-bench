"use client";

import type { SpiceBlowInfo } from "../../hooks/usePhaseInfo";
import InfoCard from "@/app/components/ui/InfoCard";
import { getTerritoryDisplayName } from "../../utils/display-helpers";

interface SpiceBlowInfoCardProps {
  spiceBlowInfo: SpiceBlowInfo | null;
}

/**
 * Component to display spice blow phase information
 * Shows revealed spice cards and their placements
 */
export default function SpiceBlowInfoCard({ spiceBlowInfo }: SpiceBlowInfoCardProps) {
  // Don't render if no spice blow info
  if (!spiceBlowInfo || spiceBlowInfo.cards.length === 0) {
    return null;
  }

  return (
    <InfoCard title="Spice Blow Information">

      <div className="space-y-3">
        {[...spiceBlowInfo.cards].reverse().map((card, index) => (
          <div
            key={index}
            className="border border-amber-200 rounded-lg p-3 bg-amber-50"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-800">
                  Card {card.deck || card.card}
                </span>
                {card.type && (
                  <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
                    {card.type}
                  </span>
                )}
              </div>
            </div>

            {/* Card Details */}
            {card.territoryId && (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Territory:</span>
                  <span className="font-medium text-gray-800">
                    {getTerritoryDisplayName(card.territoryId)}
                  </span>
                </div>
                {card.sector !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Sector:</span>
                    <span className="font-medium text-gray-800">{card.sector}</span>
                  </div>
                )}
                {card.amount !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-amber-700">{card.amount} spice</span>
                  </div>
                )}
              </div>
            )}

            {/* Card without placement (e.g., Shai-Hulud) */}
            {!card.territoryId && card.type && (
              <div className="text-sm text-gray-600 italic">
                {card.type === "Shai-Hulud" ? "Shai-Hulud appeared" : "No placement"}
              </div>
            )}
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

