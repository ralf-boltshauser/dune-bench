"use client";

import FactionBadge from "@/app/components/ui/FactionBadge";
import InfoCard from "@/app/components/ui/InfoCard";
import type { BattlePhaseInfo, BattleInfo, BattleTimelineEvent } from "../../hooks/usePhaseInfo";
import { Faction } from "@/lib/game/types/enums";
import { getTerritoryDisplayName } from "../../utils/display-helpers";

interface BattleInfoCardProps {
  battleInfo: BattlePhaseInfo | null;
}

function formatTimelineEvent(event: BattleTimelineEvent): string {
  switch (event.type) {
    case "started":
      return "Battle started";
    case "prescience":
      return "Atreides prescience used";
    case "voice":
      return "Bene Gesserit Voice used";
    case "plan_submitted":
      return "Battle plan submitted";
    case "traitor":
      return "Traitor called";
    case "resolved":
      return "Battle resolved";
    default:
      return event.description;
  }
}

function renderBattleHeader(battle: BattleInfo) {
  const territoryName = battle.territoryId
    ? getTerritoryDisplayName(battle.territoryId)
    : "Unknown territory";

  return (
    <div className="mb-3 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-800">
          {territoryName}
          {typeof battle.sector === "number" && (
            <span className="text-xs font-normal text-gray-500 ml-1">
              (sector {battle.sector})
            </span>
          )}
        </div>
        {battle.winner && (
          <div className="flex items-center gap-1 text-xs text-emerald-700">
            <span className="font-medium">Winner:</span>
            <FactionBadge faction={battle.winner as Faction} size="sm" variant="outline" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        {battle.aggressor && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Aggressor:</span>
            <FactionBadge faction={battle.aggressor as Faction} size="sm" />
          </div>
        )}
        {battle.defender && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Defender:</span>
            <FactionBadge faction={battle.defender as Faction} size="sm" />
          </div>
        )}
        {battle.traitorCalled && battle.traitorCallerId && (
          <div className="flex items-center gap-1 text-red-700">
            <span className="font-medium">Traitor called by:</span>
            <FactionBadge faction={battle.traitorCallerId as Faction} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

function formatLeaderName(leaderId: string | null): string {
  if (!leaderId) return "None";
  // Convert snake_case to Title Case
  return leaderId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCardName(cardId: string | null): string {
  if (!cardId) return "None";
  // Convert snake_case to Title Case
  return cardId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderBattleSides(battle: BattleInfo) {
  if (!battle.sides.length) return null;

  return (
    <div className="mb-3 space-y-2">
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Battle plans
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {battle.sides.map((side) => (
          <div
            key={side.faction}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <FactionBadge faction={side.faction as Faction} size="sm" />
              {side.isAggressor && (
                <span className="text-[10px] font-semibold text-amber-700 uppercase">
                  Aggressor
                </span>
              )}
            </div>
            
            {/* Plan status badges */}
            <div className="flex flex-wrap gap-1 text-[11px] text-gray-600">
              {side.planSubmitted ? (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    Plan submitted
                  </span>
                  {side.planInvalid && (
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                      Invalid (default used)
                    </span>
                  )}
                  {side.planUsedDefault && !side.planInvalid && (
                    <span className="px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">
                      Default plan
                    </span>
                  )}
                </>
              ) : (
                <span className="italic text-gray-400">No plan submitted</span>
              )}
            </div>

            {/* Full plan details */}
            {side.plan && (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5 text-[11px]">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <span className="text-gray-500">Forces:</span>
                    <span className="ml-1 font-semibold text-gray-700">
                      {side.plan.forcesDialed}
                    </span>
                  </div>
                  {side.plan.spiceDialed > 0 && (
                    <div>
                      <span className="text-gray-500">Spice:</span>
                      <span className="ml-1 font-semibold text-amber-700">
                        {side.plan.spiceDialed}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-gray-500">Leader:</span>
                  <span className="ml-1 font-medium text-gray-700">
                    {side.plan.cheapHeroUsed
                      ? "Cheap Hero"
                      : side.plan.announcedNoLeader
                      ? "None (announced)"
                      : formatLeaderName(side.plan.leaderId)}
                  </span>
                  {side.plan.kwisatzHaderachUsed && (
                    <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700">
                      KH
                    </span>
                  )}
                </div>

                {(side.plan.weaponCardId || side.plan.defenseCardId) && (
                  <div className="space-y-0.5">
                    {side.plan.weaponCardId && (
                      <div>
                        <span className="text-gray-500">Weapon:</span>
                        <span className="ml-1 font-medium text-red-700">
                          {formatCardName(side.plan.weaponCardId)}
                        </span>
                      </div>
                    )}
                    {side.plan.defenseCardId && (
                      <div>
                        <span className="text-gray-500">Defense:</span>
                        <span className="ml-1 font-medium text-blue-700">
                          {formatCardName(side.plan.defenseCardId)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBattleAbilities(battle: BattleInfo) {
  if (!battle.prescienceUsed && !battle.voiceUsed) return null;

  return (
    <div className="mb-3 space-y-1.5">
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Special abilities
      </div>
      {battle.prescienceUsed && (
        <div className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-md px-2 py-1.5">
          <span className="font-semibold">Atreides prescience</span>
          {battle.prescienceTarget && (
            <span>
              {" "}
              asked about <span className="font-medium">{battle.prescienceTarget}</span>
            </span>
          )}
          {battle.prescienceResult && (
            <span>
              {" "}
              and saw <span className="font-medium">{battle.prescienceResult}</span>
            </span>
          )}
        </div>
      )}
      {battle.voiceUsed && (
        <div className="text-xs text-purple-800 bg-purple-50 border border-purple-100 rounded-md px-2 py-1.5">
          <span className="font-semibold">Bene Gesserit Voice</span>
          {battle.voiceCommand && (
            <span className="ml-1 text-[11px] text-purple-900/80">
              ({JSON.stringify(battle.voiceCommand)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function renderBattleTimeline(battle: BattleInfo) {
  if (!battle.timeline.length) return null;

  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        Timeline
      </div>
      <ol className="space-y-1.5 text-[11px] text-gray-600">
        {battle.timeline.map((event, index) => (
          <li key={`${event.type}-${index}`} className="flex items-start gap-2">
            <span className="mt-[2px] h-1 w-1 rounded-full bg-gray-400" />
            <span>{formatTimelineEvent(event)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function BattleInfoCard({ battleInfo }: BattleInfoCardProps) {
  if (!battleInfo) {
    return null;
  }

  const { battles, noBattles, totalBattles } = battleInfo;

  return (
    <InfoCard
      title="Battle Phase"
      isEmpty={noBattles && battles.length === 0}
      emptyMessage="No battles this turn"
    >
      {typeof totalBattles === "number" && totalBattles > 0 && (
        <div className="mb-3 text-xs text-gray-600">
          {totalBattles} potential battle{totalBattles === 1 ? "" : "s"} identified
        </div>
      )}

      {battles.length > 0 && (
        <div className="space-y-4">
          {battles.map((battle) => (
            <div
              key={battle.key}
              className="rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2.5"
            >
              {renderBattleHeader(battle)}
              {renderBattleSides(battle)}
              {renderBattleAbilities(battle)}
              {renderBattleTimeline(battle)}
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
}


