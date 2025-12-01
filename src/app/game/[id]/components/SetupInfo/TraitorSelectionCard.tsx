"use client";

import { Faction } from "@/lib/game/types/enums";
import { FACTION_COLORS } from "@/app/components/constants";
import { FACTION_NAMES } from "@/lib/game/types/enums";
import type { TraitorInfo } from "../../hooks/useSetupInfo";
import Card from "@/app/components/ui/Card";
import FactionBadge from "@/app/components/ui/FactionBadge";
import { getLeaderDisplayName } from "../../utils/display-helpers";

// =============================================================================
// TYPES
// =============================================================================

interface TraitorSelectionCardProps {
  faction: Faction;
  availableTraitors: TraitorInfo[];
  selectedTraitor: TraitorInfo | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays traitor selection for a single faction
 * Shows available traitor options and highlights the selected traitor
 */
export default function TraitorSelectionCard({
  faction,
  availableTraitors,
  selectedTraitor,
}: TraitorSelectionCardProps) {
  const factionColor = FACTION_COLORS[faction];
  const factionName = FACTION_NAMES[faction];
  const isHarkonnen = faction === Faction.HARKONNEN;

  // For Harkonnen, show all available traitors as kept (selected)
  // For other factions, show selected traitor if chosen, otherwise show available options
  const traitorsToShow = isHarkonnen
    ? availableTraitors
    : selectedTraitor
    ? [selectedTraitor]
    : availableTraitors.length > 0
    ? availableTraitors
    : [];

  return (
    <Card borderColor={factionColor}>
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-3 h-3 rounded-full shadow-sm"
          style={{ backgroundColor: factionColor }}
        />
        <h3 className="text-base font-semibold text-slate-800 truncate">
          {factionName} Traitor Selection
        </h3>
      </div>

      {traitorsToShow.length === 0 ? (
        <p className="text-sm text-slate-500 italic text-center py-4">
          No traitor information available yet
        </p>
      ) : (
        <div className="space-y-3">
          {isHarkonnen ? (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                All Traitors Kept:
              </p>
              <div className="space-y-2.5">
                {traitorsToShow.map((traitor) => (
                  <div
                    key={traitor.leaderId}
                    className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-emerald-800 text-sm truncate">
                            {getLeaderDisplayName(traitor.leaderId)}
                          </span>
                          <span className="text-emerald-600 font-bold text-base flex-shrink-0">✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <FactionBadge faction={traitor.faction} size="sm" showDot />
                          <span className="text-slate-500">•</span>
                          <span>Strength: <span className="font-bold text-slate-700">{traitor.strength}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedTraitor ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-800 mb-1.5 truncate">
                    Selected: {getLeaderDisplayName(selectedTraitor.leaderId)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <FactionBadge faction={selectedTraitor.faction} size="sm" showDot />
                    <span className="text-slate-500">•</span>
                    <span>Strength: <span className="font-bold text-slate-700">{selectedTraitor.strength}</span></span>
                  </div>
                </div>
                <div className="text-emerald-600 font-bold text-lg flex-shrink-0">✓</div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Available Options (choose 1):
              </p>
              <div className="space-y-2.5">
                {availableTraitors.map((traitor) => (
                  <div
                    key={traitor.leaderId}
                    className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                  >
                    <p className="font-semibold text-slate-800 text-sm mb-1.5 truncate">
                      {getLeaderDisplayName(traitor.leaderId)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <FactionBadge faction={traitor.faction} size="sm" showDot />
                      <span className="text-slate-500">•</span>
                      <span>Strength: <span className="font-bold text-slate-700">{traitor.strength}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

