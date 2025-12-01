"use client";

import { useState } from "react";
import { Faction, FACTION_NAMES, AllianceStatus, TreacheryCardType } from "@/lib/game/types/enums";
import type { GameState } from "@/lib/game/types/state";
import { FACTION_COLORS } from "@/app/components/constants";
import { getTreacheryCardDefinition, getLeaderDefinition, getFactionConfig, GAME_CONSTANTS } from "@/lib/game/data";
import { LeaderLocation } from "@/lib/game/types/entities";
import { getTotalForcesFromFactionForces } from "@/lib/game/state/force-utils";
import { getControlledStrongholds } from "@/lib/game/state/queries";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// =============================================================================
// TYPES
// =============================================================================

interface FactionInspectorProps {
  gameState: GameState | null;
  metadata?: { factions: string[] } | null;
  selectedFaction: Faction | null;
  onSelectFaction: (faction: Faction | null) => void;
  isLoading?: boolean;
  error?: string | null;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function CollapsibleSection({ title, children, defaultOpen = true, icon }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className="w-full flex items-center justify-between p-3.5 h-auto hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
      {isOpen && <div className="p-4 pt-0 bg-slate-50/30">{children}</div>}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function FactionInspector({
  gameState,
  metadata,
  selectedFaction,
  onSelectFaction,
  isLoading = false,
  error = null,
}: FactionInspectorProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          <p>Loading game state...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p className="font-semibold mb-2">Error loading game state</p>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  // Show message when no game state is available (not loading, no error)
  if (!gameState) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No game state available</p>
        {metadata?.factions && metadata.factions.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            This game includes: {metadata.factions.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
          </p>
        )}
      </div>
    );
  }

  // Ensure factions is a Map
  if (!(gameState.factions instanceof Map)) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Game state is loading...</p>
      </div>
    );
  }

  const factions = Array.from(gameState.factions.keys());
  
  // If factions Map is empty but we have metadata, show a message
  if (factions.length === 0 && metadata?.factions && metadata.factions.length > 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Select a Faction to Inspect
        </h3>
        <div className="text-center text-slate-500 py-6 px-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
          <p className="mb-2">Faction data is not available in the saved game state.</p>
          <p className="text-xs text-slate-400">This game included: {metadata.factions.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}</p>
        </div>
      </div>
    );
  }
  
  // If no factions at all
  if (factions.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Select a Faction to Inspect
        </h3>
        <div className="text-center text-slate-500 py-6 px-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
          <p>No factions available</p>
        </div>
      </div>
    );
  }

  // If no faction selected, show faction selector
  if (!selectedFaction) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Select a Faction to Inspect
        </h3>
        <div className="space-y-2.5">
          {factions.map((faction) => {
            const factionState = gameState.factions.get(faction);
            if (!factionState) return null;

            const controlledStrongholds = getControlledStrongholds(gameState, faction);
            const availableLeaders = factionState.leaders.filter(
              (l) => l.location === LeaderLocation.LEADER_POOL
            ).length;

            return (
              <Button
                key={faction}
                onClick={() => onSelectFaction(faction)}
                variant="outline"
                className="w-full text-left p-4 h-auto justify-start hover:shadow-md transition-all duration-200 bg-white border-slate-200"
                style={{
                  borderLeftColor: FACTION_COLORS[faction],
                  borderLeftWidth: "4px",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-base" style={{ color: FACTION_COLORS[faction] }}>
                    {FACTION_NAMES[faction]}
                  </span>
                  <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    {factionState.spice} spice
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{getTotalForcesFromFactionForces(factionState.forces)} forces</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{factionState.hand.length} cards</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{availableLeaders} leaders</span>
                  {controlledStrongholds.length > 0 && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      {controlledStrongholds.length} strongholds
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // Show detailed faction state
  const factionState = gameState.factions.get(selectedFaction);
  if (!factionState) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Faction not found in game</p>
      </div>
    );
  }

  const factionColor = FACTION_COLORS[selectedFaction];
  const totalForces = getTotalForcesFromFactionForces(factionState.forces);
  const config = getFactionConfig(selectedFaction);
  const controlledStrongholds = getControlledStrongholds(gameState, selectedFaction);
  const availableLeaders = factionState.leaders.filter(
    (l) => l.location === LeaderLocation.LEADER_POOL
  ).length;
  const leadersInTanks = factionState.leaders.filter(
    (l) => l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
  ).length;

  // Calculate victory progress
  const isAllied = factionState.allianceStatus === AllianceStatus.ALLIED && factionState.allyId;
  const strongholdsNeeded = isAllied
    ? GAME_CONSTANTS.STRONGHOLDS_TO_WIN_ALLIED
    : GAME_CONSTANTS.STRONGHOLDS_TO_WIN_SOLO;
  
  let combinedStrongholds = controlledStrongholds.length;
  if (isAllied && factionState.allyId) {
    const allyStrongholds = getControlledStrongholds(gameState, factionState.allyId);
    combinedStrongholds = new Set([...controlledStrongholds, ...allyStrongholds]).size;
  }

  // Find traitor threats (who has traitors for this faction)
  const traitorThreats: Array<{ faction: Faction; traitor: { leaderName: string; strength: number } }> = [];
  gameState.factions.forEach((otherState, otherFaction) => {
    if (otherFaction === selectedFaction) return;
    otherState.traitors.forEach((traitor) => {
      if (traitor.leaderFaction === selectedFaction) {
        const leaderDef = getLeaderDefinition(traitor.leaderId);
        traitorThreats.push({
          faction: otherFaction,
          traitor: {
            leaderName: traitor.leaderName,
            strength: leaderDef?.strength ?? 0,
          },
        });
      }
    });
  });

  // Get traitor opportunities (who this faction can betray)
  const traitorOpportunities = factionState.traitors.map((traitor) => {
    const leaderDef = getLeaderDefinition(traitor.leaderId);
    return {
      targetFaction: traitor.leaderFaction,
      leaderName: traitor.leaderName,
      strength: leaderDef?.strength ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          onClick={() => onSelectFaction(null)}
          variant="ghost"
          size="icon"
          className="hover:bg-slate-100"
          aria-label="Back to faction list"
        >
          <svg
            className="w-5 h-5 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <h3
          className="text-xl font-bold tracking-tight"
          style={{ color: factionColor }}
        >
          {FACTION_NAMES[selectedFaction]}
        </h3>
      </div>

      {/* Quick Summary Header */}
      <div
        className="rounded-lg p-5 text-white shadow-lg"
        style={{ backgroundColor: factionColor }}
      >
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs opacity-90 mb-1">Total Spice</div>
            <div className="text-2xl font-bold">
              {factionState.spice + factionState.spiceBribes}
            </div>
            {factionState.spiceBribes > 0 && (
              <div className="text-xs opacity-75 mt-1">
                {factionState.spice} protected, {factionState.spiceBribes} vulnerable
              </div>
            )}
          </div>
          <div>
            <div className="text-xs opacity-90 mb-1">Total Forces</div>
            <div className="text-2xl font-bold">{totalForces}</div>
            <div className="text-xs opacity-75 mt-1">
              {factionState.forces.reserves.regular + factionState.forces.reserves.elite} in reserves
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-xs opacity-90 mb-1">Cards in Hand</div>
            <div className="text-lg font-semibold">
              {factionState.hand.length} / {config.maxHandSize}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-90 mb-1">Leaders Available</div>
            <div className="text-lg font-semibold">{availableLeaders}</div>
            {leadersInTanks > 0 && (
              <div className="text-xs opacity-75 mt-1">{leadersInTanks} revivable</div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Victory Progress */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Victory Progress</h4>
          <span className="text-xs font-medium text-gray-600">
            {combinedStrongholds} / {strongholdsNeeded} strongholds
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(100, (combinedStrongholds / strongholdsNeeded) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-600">
          {isAllied && factionState.allyId ? (
            <span>
              Allied with <span style={{ color: FACTION_COLORS[factionState.allyId] }} className="font-semibold">
                {FACTION_NAMES[factionState.allyId]}
              </span> • Need {strongholdsNeeded} combined strongholds
            </span>
          ) : (
            <span>Need {strongholdsNeeded} strongholds for solo victory</span>
          )}
        </div>
        {controlledStrongholds.length > 0 && (
          <div className="mt-2 text-xs">
            <span className="font-semibold text-gray-700">Controlled: </span>
            <span className="text-gray-600">
              {controlledStrongholds.join(", ")}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Threats & Opportunities */}
      {(traitorThreats.length > 0 || traitorOpportunities.length > 0) && (
        <CollapsibleSection title="Threats & Opportunities" icon="⚔️" defaultOpen={true}>
          <div className="space-y-4">
            {/* Traitor Threats */}
            {traitorThreats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 font-semibold text-sm">⚠️ Traitor Threats</span>
                  <span className="text-xs text-gray-500">({traitorThreats.length})</span>
                </div>
                <div className="space-y-2">
                  {traitorThreats.map((threat, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-red-50 border border-red-200 rounded text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-semibold"
                          style={{ color: FACTION_COLORS[threat.faction] }}
                        >
                          {FACTION_NAMES[threat.faction]}
                        </span>
                        <span className="text-xs text-gray-600">
                          {threat.traitor.leaderName} (Strength: {threat.traitor.strength})
                        </span>
                      </div>
                      <div className="text-xs text-red-700 mt-1">
                        Can betray you with this leader
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traitor Opportunities */}
            {traitorOpportunities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 font-semibold text-sm">🎯 Traitor Opportunities</span>
                  <span className="text-xs text-gray-500">({traitorOpportunities.length})</span>
                </div>
                <div className="space-y-2">
                  {traitorOpportunities.map((opp, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-green-50 border border-green-200 rounded text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-semibold"
                          style={{ color: FACTION_COLORS[opp.targetFaction] }}
                        >
                          {FACTION_NAMES[opp.targetFaction]}
                        </span>
                        <span className="text-xs text-gray-600">
                          {opp.leaderName} (Strength: {opp.strength})
                        </span>
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        You can betray this faction
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      <Separator />

      {/* Spice Details */}
      <CollapsibleSection title="Spice" icon="💰" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-white rounded">
            <span className="text-sm text-gray-600">Behind Shield (Protected):</span>
            <span className="font-semibold text-yellow-600">{factionState.spice}</span>
          </div>
          {factionState.spiceBribes > 0 && (
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-200">
              <span className="text-sm text-gray-600">Front of Shield (Vulnerable):</span>
              <span className="font-semibold text-yellow-700">{factionState.spiceBribes}</span>
            </div>
          )}
          <div className="flex justify-between items-center p-2 bg-white rounded border-t-2 border-gray-300">
            <span className="text-sm font-semibold text-gray-700">Total:</span>
            <span className="font-bold text-yellow-700 text-lg">
              {factionState.spice + factionState.spiceBribes}
            </span>
          </div>
        </div>
      </CollapsibleSection>

      <Separator />

      {/* Forces Details */}
      <CollapsibleSection title="Forces" icon="⚔️" defaultOpen={false}>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white rounded">
              <div className="text-xs text-gray-500 mb-1">Reserves</div>
              <div className="font-semibold">
                {factionState.forces.reserves.regular}
                {factionState.forces.reserves.elite > 0 && (
                  <span className="text-blue-600 ml-1">+{factionState.forces.reserves.elite}</span>
                )}
              </div>
            </div>
            <div className="p-2 bg-white rounded">
              <div className="text-xs text-gray-500 mb-1">On Board</div>
              <div className="font-semibold">
                {factionState.forces.onBoard.reduce((sum, s) => sum + s.forces.regular, 0)}
                {factionState.forces.onBoard.reduce((sum, s) => sum + s.forces.elite, 0) > 0 && (
                  <span className="text-blue-600 ml-1">
                    +{factionState.forces.onBoard.reduce((sum, s) => sum + s.forces.elite, 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(factionState.forces.tanks.regular > 0 || factionState.forces.tanks.elite > 0) && (
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <div className="text-xs text-gray-500 mb-1">In Tanks (Revivable)</div>
              <div className="font-semibold">
                {factionState.forces.tanks.regular}
                {factionState.forces.tanks.elite > 0 && (
                  <span className="text-blue-600 ml-1">+{factionState.forces.tanks.elite}</span>
                )}
              </div>
            </div>
          )}
          {factionState.forces.onBoard.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-500 mb-2">Locations:</div>
              <div className="space-y-1">
                {factionState.forces.onBoard.map((stack, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-1.5 bg-white rounded"
                  >
                    <span className="text-gray-600">
                      {stack.territoryId} (sector {stack.sector})
                    </span>
                    <span className="font-medium">
                      {stack.forces.regular}
                      {stack.forces.elite > 0 && (
                        <span className="text-blue-600">+{stack.forces.elite}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <Separator />

      {/* Leaders */}
      <CollapsibleSection title="Leaders" icon="👑" defaultOpen={false}>
        <div className="space-y-2">
          {factionState.leaders.map((leader) => {
            const leaderDef = getLeaderDefinition(leader.definitionId);
            if (!leaderDef) return null;

            const locationLabels: Record<LeaderLocation, string> = {
              [LeaderLocation.LEADER_POOL]: "✅ Available",
              [LeaderLocation.TANKS_FACE_UP]: "💀 Dead (Revivable)",
              [LeaderLocation.TANKS_FACE_DOWN]: "💀 Dead (Waiting)",
              [LeaderLocation.IN_BATTLE]: "⚔️ In Battle",
              [LeaderLocation.ON_BOARD]: "📍 On Board",
              [LeaderLocation.CAPTURED]: "🔒 Captured",
            };

            const statusColor =
              leader.location === LeaderLocation.LEADER_POOL
                ? "bg-green-50 border-green-200"
                : leader.location === LeaderLocation.TANKS_FACE_UP ||
                  leader.location === LeaderLocation.TANKS_FACE_DOWN
                ? "bg-red-50 border-red-200"
                : leader.location === LeaderLocation.CAPTURED
                ? "bg-purple-50 border-purple-200"
                : "bg-blue-50 border-blue-200";

            return (
              <div
                key={leader.definitionId}
                className={`p-2 rounded border ${statusColor}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{leaderDef.name}</span>
                      <span className="text-xs text-gray-500">(Strength: {leaderDef.strength})</span>
                    </div>
                    <div className="text-xs mt-1 text-gray-600">
                      {locationLabels[leader.location]}
                      {leader.usedThisTurn && leader.location === LeaderLocation.ON_BOARD && (
                        <span className="ml-1">• Used this turn</span>
                      )}
                      {leader.capturedBy && (
                        <span className="ml-1">
                          • Captured by {FACTION_NAMES[leader.capturedBy]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Treachery Cards */}
      <CollapsibleSection title={`Treachery Cards (${factionState.hand.length})`} icon="🃏" defaultOpen={false}>
        {factionState.hand.length === 0 ? (
          <p className="text-sm text-gray-500">No cards in hand</p>
        ) : (
          <div className="space-y-2">
            {factionState.hand.map((card, idx) => {
              const cardDef = getTreacheryCardDefinition(card.definitionId);
              if (!cardDef) return null;

              const typeColors: Record<string, string> = {
                weapon: "bg-red-50 border-red-200 text-red-700",
                defense: "bg-blue-50 border-blue-200 text-blue-700",
                special: "bg-purple-50 border-purple-200 text-purple-700",
                worthless: "bg-gray-50 border-gray-200 text-gray-600",
              };

              const typeLabel =
                cardDef.type.includes("weapon")
                  ? "Weapon"
                  : cardDef.type.includes("defense")
                  ? "Defense"
                  : cardDef.type === TreacheryCardType.SPECIAL
                  ? "Special"
                  : "Worthless";

              return (
                <div
                  key={idx}
                  className={`p-2 rounded border text-sm ${typeColors[typeLabel.toLowerCase()] || "bg-white border-gray-200"}`}
                >
                  <div className="font-medium">{cardDef.name}</div>
                  <div className="text-xs font-semibold mt-1">{typeLabel}</div>
                  {cardDef.description && (
                    <div className="text-xs opacity-75 mt-1">{cardDef.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <Separator />

      {/* Alliance */}
      <CollapsibleSection title="Alliance" icon="🤝" defaultOpen={false}>
        <div className="text-sm">
          {factionState.allianceStatus === AllianceStatus.ALLIED && factionState.allyId ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="font-semibold text-gray-700 mb-1">Allied with:</div>
              <div
                className="text-lg font-bold"
                style={{ color: FACTION_COLORS[factionState.allyId] }}
              >
                {FACTION_NAMES[factionState.allyId]}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Combined strongholds: {combinedStrongholds} / {strongholdsNeeded} needed
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Not allied</div>
          )}
        </div>
      </CollapsibleSection>

      <Separator />

      {/* Faction-Specific Abilities */}
      {(factionState.beneGesseritPrediction ||
        factionState.kwisatzHaderach ||
        factionState.fremenStormCard ||
        factionState.emperorAllyRevivalsUsed !== undefined) && (
        <CollapsibleSection title="Special Abilities" icon="✨" defaultOpen={false}>
          <div className="space-y-3">
            {factionState.beneGesseritPrediction && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="font-semibold text-sm text-gray-700 mb-2">Bene Gesserit Prediction</div>
                <div className="text-sm">
                  <div>
                    <span className="text-gray-600">Predicted Winner: </span>
                    <span
                      className="font-semibold"
                      style={{
                        color: FACTION_COLORS[factionState.beneGesseritPrediction.faction],
                      }}
                    >
                      {FACTION_NAMES[factionState.beneGesseritPrediction.faction]}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-gray-600">On Turn: </span>
                    <span className="font-semibold">{factionState.beneGesseritPrediction.turn}</span>
                  </div>
                </div>
              </div>
            )}

            {factionState.kwisatzHaderach && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-semibold text-sm text-gray-700 mb-2">Kwisatz Haderach</div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">Status: </span>
                    <span className="font-semibold">
                      {factionState.kwisatzHaderach.isActive ? "✅ Active" : "❌ Inactive"}
                    </span>
                  </div>
                  {factionState.kwisatzHaderach.isActive && (
                    <>
                      <div>
                        <span className="text-gray-600">Forces Lost: </span>
                        <span className="font-semibold">
                          {factionState.kwisatzHaderach.forcesLostCount}
                        </span>
                      </div>
                      {factionState.kwisatzHaderach.usedInTerritoryThisTurn && (
                        <div>
                          <span className="text-gray-600">Used This Turn In: </span>
                          <span className="font-semibold">
                            {factionState.kwisatzHaderach.usedInTerritoryThisTurn}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {factionState.kwisatzHaderach.isDead && (
                    <div className="text-red-600 font-semibold">💀 Dead</div>
                  )}
                </div>
              </div>
            )}

            {factionState.fremenStormCard && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-semibold text-sm text-gray-700 mb-2">Fremen Storm Card</div>
                <div className="text-sm font-mono">{factionState.fremenStormCard}</div>
              </div>
            )}

            {factionState.emperorAllyRevivalsUsed !== undefined && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-sm text-gray-700 mb-2">Emperor Ally Revivals</div>
                <div className="text-sm">
                  <span className="text-gray-600">Used This Turn: </span>
                  <span className="font-semibold">
                    {factionState.emperorAllyRevivalsUsed} / 3
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
