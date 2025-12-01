"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Faction, FACTION_NAMES } from "@/lib/game/types/enums";
import { FACTION_COLORS } from "@/app/components/constants";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [selectedFactions, setSelectedFactions] = useState<Set<Faction>>(
    new Set([Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN])
  );
  const [maxTurns, setMaxTurns] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFactions = Object.values(Faction);

  const toggleFaction = (faction: Faction) => {
    const newSet = new Set(selectedFactions);
    if (newSet.has(faction)) {
      if (newSet.size > 2) {
        // Require at least 2 factions
        newSet.delete(faction);
      }
    } else {
      newSet.add(faction);
    }
    setSelectedFactions(newSet);
  };

  const handleCreateGame = async () => {
    if (selectedFactions.size < 2) {
      setError("Please select at least 2 factions");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factions: Array.from(selectedFactions),
          maxTurns,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Navigate to game view
        router.push(`/game/${result.gameId}`);
      } else {
        throw new Error(result.error || "Failed to create game");
      }
    } catch (err) {
      console.error("Error creating game:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create game"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Dune Game Launcher
            </h1>
            <p className="text-lg text-gray-600">
              Configure your game and watch AI factions battle for control of Arrakis
            </p>
          </div>

          {/* Faction Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Select Factions (minimum 2)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allFactions.map((faction) => {
                const isSelected = selectedFactions.has(faction);
                const color = FACTION_COLORS[faction];
                const name = FACTION_NAMES[faction];

                return (
                  <Button
                    key={faction}
                    type="button"
                    onClick={() => toggleFaction(faction)}
                    disabled={isSelected && selectedFactions.size === 2}
                    variant={isSelected ? "default" : "outline"}
                    className={`
                      relative p-4 h-auto
                      ${isSelected
                        ? "border-opacity-100 shadow-md scale-105"
                        : "border-opacity-30 hover:border-opacity-60"
                      }
                    `}
                    style={{
                      borderColor: color,
                      backgroundColor: isSelected
                        ? `${color}15`
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: color,
                          backgroundColor: isSelected ? color : "transparent",
                        }}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className="font-medium"
                        style={{ color: isSelected ? color : "#6B7280" }}
                      >
                        {name}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {selectedFactions.size} faction{selectedFactions.size !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Turn Configuration */}
          <div className="mb-8">
            <label
              htmlFor="maxTurns"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Maximum Turns
            </label>
            <div className="flex items-center gap-4">
              <input
                id="maxTurns"
                type="range"
                min="1"
                max="20"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <div className="w-16 text-center">
                <span className="text-2xl font-bold text-orange-600">
                  {maxTurns}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              The game will run for up to {maxTurns} turn{maxTurns !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Create Game Button */}
          <Button
            onClick={handleCreateGame}
            disabled={isCreating || selectedFactions.size < 2}
            variant="default"
            size="lg"
            className="w-full py-4 px-6 font-semibold text-lg bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating Game...
              </span>
            ) : (
              "Start Game"
            )}
          </Button>

          {/* Info Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
                <ul className="space-y-1">
                  <li>• AI agents control each faction</li>
                  <li>• Watch the game unfold in real-time</li>
                  <li>• See all faction resources and actions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tips</h3>
                <ul className="space-y-1">
                  <li>• More factions = longer games</li>
                  <li>• Games auto-save and can be resumed</li>
                  <li>• Check the game view for live updates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
