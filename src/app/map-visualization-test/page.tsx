"use client";

import MapVisualization from "@/app/game/[id]/components/MapVisualization";
import { createGameState } from "@/lib/game/state/factory";
import {
  addSpiceToTerritory,
  moveStorm,
  shipForces,
} from "@/lib/game/state/mutations";
import type { GameState } from "@/lib/game/types";
import { TerritoryId } from "@/lib/game/types";
import { Faction } from "@/lib/game/types/enums";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function MapVisualizationTestPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(true);

  // Create mock game state
  useEffect(() => {
    if (useMockData) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        const mockState = createMockGameState();
        setGameState(mockState);
      }, 0);
      return () => clearTimeout(timer);
    }
    // Don't set to null here - let the user control it via the gameId input
  }, [useMockData]);

  // Load real game state
  useEffect(() => {
    if (!useMockData && gameId) {
      fetch(`/api/game/${gameId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.state) {
            setGameState(data.state);
          }
        })
        .catch((err) => {
          console.error("Failed to load game state:", err);
        });
    }
  }, [gameId, useMockData]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Map Visualization Test</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Use Mock Data</span>
              </label>
            </div>

            {!useMockData && (
              <div className="flex items-center gap-4">
                <label>
                  Game ID:
                  <input
                    type="text"
                    value={gameId || ""}
                    onChange={(e) => setGameId(e.target.value)}
                    className="ml-2 px-3 py-2 border rounded"
                    placeholder="Enter game ID"
                  />
                </label>
                <Button
                  onClick={() => {
                    if (gameId) {
                      fetch(`/api/game/${gameId}`)
                        .then((res) => res.json())
                        .then((data) => {
                          if (data.state) {
                            setGameState(data.state);
                          }
                        })
                        .catch((err) => {
                          console.error("Failed to load game state:", err);
                        });
                    }
                  }}
                  variant="default"
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  Load Game
                </Button>
              </div>
            )}

            {useMockData && gameState && (
              <div className="space-y-2">
                <h3 className="font-semibold">Mock Data Actions:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button
                    onClick={() => {
                      if (gameState) {
                        const newState = shipForces(
                          gameState,
                          Faction.ATREIDES,
                          TerritoryId.ARRAKEEN,
                          9,
                          3,
                          false
                        );
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Add Atreides to Arrakeen
                  </Button>
                  <Button
                    onClick={() => {
                      if (gameState) {
                        const newState = shipForces(
                          gameState,
                          Faction.HARKONNEN,
                          TerritoryId.CIELAGO_SOUTH,
                          2,
                          5,
                          false
                        );
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-gray-700 text-white hover:bg-gray-800"
                  >
                    Add Harkonnen to Cielago South
                  </Button>
                  <Button
                    onClick={() => {
                      if (gameState) {
                        const newState = addSpiceToTerritory(
                          gameState,
                          TerritoryId.BROKEN_LAND,
                          0,
                          5
                        );
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    Add Spice to Broken Land
                  </Button>
                  <Button
                    onClick={() => {
                      if (gameState) {
                        const newState = moveStorm(gameState, 5);
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Move Storm to Sector 5
                  </Button>
                  <Button
                    onClick={() => {
                      if (gameState) {
                        let newState = shipForces(
                          gameState,
                          Faction.FREMEN,
                          TerritoryId.MERIDIAN,
                          0,
                          2,
                          false
                        );
                        newState = shipForces(
                          newState,
                          Faction.FREMEN,
                          TerritoryId.MERIDIAN,
                          0,
                          1,
                          true
                        );
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Add Fremen to Meridian
                  </Button>
                  <Button
                    onClick={() => {
                      if (gameState) {
                        let newState = shipForces(
                          gameState,
                          Faction.EMPEROR,
                          TerritoryId.CARTHAG,
                          10,
                          4,
                          false
                        );
                        newState = shipForces(
                          newState,
                          Faction.EMPEROR,
                          TerritoryId.CARTHAG,
                          10,
                          2,
                          true
                        );
                        setGameState(newState);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Add Emperor to Carthag
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Map Visualization</h2>
          {gameState && (
            <div className="mb-4 text-sm text-gray-600">
              <p>Turn: {gameState.turn}</p>
              <p>Phase: {gameState.phase}</p>
              <p>Storm Sector: {gameState.stormSector}</p>
            </div>
          )}
          <MapVisualization gameState={gameState} />
        </div>
      </div>
    </div>
  );
}

function createMockGameState(): GameState {
  // Create a basic game state with 3 factions
  const factions = [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN];
  const gameState = createGameState({
    factions,
    maxTurns: 10,
    advancedRules: false,
  });

  // Add some forces (need to ensure they have reserves first)
  // For testing, we'll manually add forces to the board
  let state = gameState;

  // Add forces by directly manipulating the state (for testing purposes)
  // In real game, forces would come from reserves via shipForces
  const atreidesState = state.factions.get(Faction.ATREIDES)!;
  const harkonnenState = state.factions.get(Faction.HARKONNEN)!;
  const fremenState = state.factions.get(Faction.FREMEN)!;

  // Manually add forces to board for testing
  const newFactions = new Map(state.factions);
  newFactions.set(Faction.ATREIDES, {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        ...atreidesState.forces.onBoard,
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.ARRAKEEN,
          sector: 9,
          forces: { regular: 2, elite: 0 },
        },
      ],
    },
  });
  newFactions.set(Faction.HARKONNEN, {
    ...harkonnenState,
    forces: {
      ...harkonnenState.forces,
      onBoard: [
        ...harkonnenState.forces.onBoard,
        {
          factionId: Faction.HARKONNEN,
          territoryId: TerritoryId.CIELAGO_SOUTH,
          sector: 2,
          forces: { regular: 3, elite: 0 },
        },
      ],
    },
  });
  newFactions.set(Faction.FREMEN, {
    ...fremenState,
    forces: {
      ...fremenState.forces,
      onBoard: [
        ...fremenState.forces.onBoard,
        {
          factionId: Faction.FREMEN,
          territoryId: TerritoryId.MERIDIAN,
          sector: 0,
          forces: { regular: 5, elite: 1 },
        },
      ],
    },
  });

  state = { ...state, factions: newFactions };

  // Add some spice
  state = addSpiceToTerritory(state, TerritoryId.BROKEN_LAND, 0, 3);
  state = addSpiceToTerritory(state, TerritoryId.CIELAGO_DEPRESSION, 5, 2);

  // Set storm position
  state = moveStorm(state, 3);

  return state;
}
