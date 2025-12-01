"use client";

import type { ChoamCharityInfo } from "../../hooks/usePhaseInfo";
import { Faction } from "@/lib/game/types/enums";
import InfoCard from "@/app/components/ui/InfoCard";
import FactionBadge from "@/app/components/ui/FactionBadge";
import { FACTION_COLORS } from "@/app/components/constants";

interface CHOAMCharityCardProps {
  choamCharityInfo: ChoamCharityInfo | null;
}

/**
 * Component to display CHOAM charity phase information
 * Shows eligible factions and recipients with amounts
 */
export default function CHOAMCharityCard({ choamCharityInfo }: CHOAMCharityCardProps) {
  // Don't render if no CHOAM charity info
  if (!choamCharityInfo) {
    return null;
  }

  return (
    <InfoCard 
      title="CHOAM Charity"
      isEmpty={choamCharityInfo.eligibleFactions.length === 0 && choamCharityInfo.recipients.length === 0}
      emptyMessage="No charity information available"
    >

      {/* Eligible Factions */}
      {choamCharityInfo.eligibleFactions.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Eligible Factions</div>
          <div className="flex flex-wrap gap-2">
            {choamCharityInfo.eligibleFactions.map((faction) => (
              <FactionBadge key={faction} faction={faction} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Recipients */}
      {choamCharityInfo.recipients.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">Recipients</div>
          <div className="space-y-2">
            {[...choamCharityInfo.recipients].reverse().map((recipient, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 rounded"
                style={{ backgroundColor: `${FACTION_COLORS[recipient.faction]}15` }}
              >
                <FactionBadge faction={recipient.faction} size="sm" />
                <span className="text-sm font-semibold text-amber-700">
                  +{recipient.amount} spice
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </InfoCard>
  );
}

