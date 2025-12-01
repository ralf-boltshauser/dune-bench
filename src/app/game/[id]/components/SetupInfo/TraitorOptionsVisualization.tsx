"use client";

import { Faction } from "@/lib/game/types/enums";
import { FACTION_COLORS } from "@/app/components/constants";
import { FACTION_NAMES } from "@/lib/game/types/enums";
import { getLeaderDisplayName } from "../../utils/display-helpers";
import type { TraitorInfo, FactionTraitorSelection } from "../../hooks/useSetupInfo";
import FactionBadge from "@/app/components/ui/FactionBadge";

// =============================================================================
// TYPES
// =============================================================================

interface TraitorOptionsVisualizationProps {
  traitorSelections: Map<Faction, FactionTraitorSelection>;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Visualizes which traitors can be picked by each faction
 * Shows all available traitor options in a grid layout
 */
export default function TraitorOptionsVisualization({
  traitorSelections,
}: TraitorOptionsVisualizationProps) {
  // Use shared helper from utils

  // Get all factions with available traitors
  const factionsWithOptions = Array.from(traitorSelections.entries()).filter(
    ([, selection]) => selection.availableTraitors.length > 0
  );

  if (factionsWithOptions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">
          Available Traitor Options
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Each faction can pick from their available traitor options below.
          Harkonnen automatically keeps all 4 traitors.
        </p>
      </div>

      <div className="flex flex-row gap-4 md:gap-5 flex-wrap">
        {factionsWithOptions.map(([faction, selection]) => {
          const factionColor = FACTION_COLORS[faction];
          const factionName = FACTION_NAMES[faction];
          const isHarkonnen = faction === Faction.HARKONNEN;
          // For Harkonnen, all traitors are kept (selected), so we don't show "Selected" badge
          // For other factions, show "Selected" if they've chosen one
          const isSelected = !isHarkonnen && selection.selectedTraitor !== null;

          return (
            <div
              key={faction}
              className="border-2 rounded-xl p-4 md:p-5 transition-all duration-200 hover:shadow-md flex-1 min-w-[280px]"
              style={{
                borderColor: factionColor,
                backgroundColor: isSelected 
                  ? `${factionColor}08` 
                  : "white",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: factionColor }}
                />
                <h4 className="font-semibold text-slate-800 text-base">{factionName}</h4>
                <div className="flex gap-1.5 ml-auto">
                  {isHarkonnen && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                      keeps all
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                      Selected
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {selection.availableTraitors.map((traitor) => {
                  // For Harkonnen, all traitors are kept (selected)
                  // For other factions, only the selected one is marked
                  const isSelectedTraitor = isHarkonnen 
                    ? true 
                    : selection.selectedTraitor?.leaderId === traitor.leaderId;
                  const leaderName = getLeaderDisplayName(traitor.leaderId);

                  return (
                    <div
                      key={traitor.leaderId}
                      className={`border rounded-lg p-3 transition-all duration-200 ${
                        isSelectedTraitor
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 border-2 shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-slate-800 text-sm">
                              {leaderName}
                            </span>
                            {isSelectedTraitor && (
                              <span className="text-emerald-600 font-bold text-base flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                            <FactionBadge faction={traitor.faction} size="sm" showDot />
                            <span className="text-slate-500">•</span>
                            <span>Strength: <span className="font-bold text-slate-700">{traitor.strength}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selection.availableTraitors.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center py-4">
                  No traitor options available
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

