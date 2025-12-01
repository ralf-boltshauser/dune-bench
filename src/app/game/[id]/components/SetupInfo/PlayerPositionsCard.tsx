"use client";

import { Faction, FACTION_NAMES } from "@/lib/game/types/enums";
import { FACTION_COLORS } from "@/app/components/constants";
import Card from "@/app/components/ui/Card";
import FactionBadge from "@/app/components/ui/FactionBadge";

// =============================================================================
// TYPES
// =============================================================================

interface PlayerPositionsCardProps {
  playerPositions: Map<Faction, number>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// There are 18 sectors around the board edge (0-17)
const TOTAL_SECTORS = 18;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Shows player token positions on map edge (18 sectors)
 * Visual representation of sector positions and list of factions and their sectors
 */
export default function PlayerPositionsCard({
  playerPositions,
}: PlayerPositionsCardProps) {
  // Convert Map to array for easier iteration
  const positions = Array.from(playerPositions.entries());

  if (positions.length === 0) {
    return null;
  }

  return (
    <Card borderColor="#3b82f6" title="Player Token Positions">

      {/* Visual representation of sectors */}
      <div className="mb-5">
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {Array.from({ length: TOTAL_SECTORS }, (_, i) => {
            const factionAtSector = positions.find(([, sector]) => sector === i)?.[0];
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-all duration-200 ${
                  factionAtSector
                    ? "text-white shadow-md"
                    : "bg-slate-100 border-slate-300 text-slate-400"
                }`}
                style={
                  factionAtSector
                    ? {
                        backgroundColor: FACTION_COLORS[factionAtSector],
                        borderColor: FACTION_COLORS[factionAtSector],
                      }
                    : {}
                }
                title={`Sector ${i}${factionAtSector ? ` - ${FACTION_NAMES[factionAtSector]}` : ""}`}
              >
                {factionAtSector ? (
                  <span className="text-[10px] font-bold">
                    {FACTION_NAMES[factionAtSector]
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                ) : (
                  <span className="text-xs">{i}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 text-center font-medium">
          Board edge sectors (0-17)
        </p>
      </div>

      {/* List of factions and their sectors */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Positions:</p>
        {positions.map(([faction, sector]) => (
          <div
            key={faction}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
          >
            <FactionBadge faction={faction} size="sm" showDot />
            <span className="text-sm font-bold text-slate-700">Sector {sector}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

