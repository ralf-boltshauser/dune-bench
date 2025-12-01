/**
 * Leaders section component for FactionPanel
 */

import { LeaderLocation } from "@/lib/game/types/entities";
import { getLeaderDefinition } from "@/lib/game/data/leaders";
import { FactionState } from "@/lib/game/types/state";
import { getLeaderLocationDisplay } from "../utils";
import { LEADERS_MAX_HEIGHT } from "../constants";

interface LeaderInfo {
  name: string;
  strength: number;
  location: LeaderLocation;
  usedThisTurn: boolean;
  hasBeenKilled: boolean;
}

interface LeadersSectionProps {
  state: FactionState;
}

function getLeaderInfo(state: FactionState): LeaderInfo[] {
  if (!state.leaders || state.leaders.length === 0) {
    return [];
  }

  return state.leaders.map((leader) => {
    const def = getLeaderDefinition(leader.definitionId);
    return {
      name: def?.name ?? "Unknown",
      strength: def?.strength ?? leader.strength ?? 0,
      location: leader.location,
      usedThisTurn: leader.usedThisTurn ?? false,
      hasBeenKilled: leader.hasBeenKilled ?? false,
    };
  });
}

function getLeaderClassName(leader: LeaderInfo): string {
  if (leader.location === LeaderLocation.LEADER_POOL) {
    return "text-green-700 font-medium";
  }
  if (leader.hasBeenKilled) {
    return "text-red-600";
  }
  return "text-gray-600";
}

export function LeadersSection({ state }: LeadersSectionProps) {
  const leaders = getLeaderInfo(state);

  return (
    <div className="mb-2">
      <div className="text-sm font-semibold text-gray-700">Leaders</div>
      <div
        className="text-xs space-y-1 overflow-y-auto"
        style={{ maxHeight: `${LEADERS_MAX_HEIGHT}px` }}
      >
        {leaders.length === 0 ? (
          <div className="text-gray-500">None</div>
        ) : (
          leaders.map((leader, idx) => (
            <div
              key={idx}
              className={`flex justify-between items-center ${getLeaderClassName(leader)}`}
            >
              <span>
                {leader.name} ({leader.strength})
              </span>
              <span className="text-[10px] text-gray-500">
                {getLeaderLocationDisplay(leader.location)}
                {leader.usedThisTurn && " • Used"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

