import { Faction, TreacheryCardType, AllianceStatus } from "@/lib/game/types/enums";
import { FactionState } from "@/lib/game/types/state";
import { LeaderLocation, CardLocation, TreacheryCard } from "@/lib/game/types/entities";
import { getLeadersForFaction } from "@/lib/game/data/leaders";

/**
 * Generate mock faction state for testing
 */
export function createMockFactionState(faction: Faction): FactionState {
  const leaders = getLeadersForFaction(faction);
  
  return {
    factionId: faction,
    spice: Math.floor(Math.random() * 20) + 5,
    spiceBribes: Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0,
    forces: {
      factionId: faction,
      reserves: {
        regular: Math.floor(Math.random() * 15) + 5,
        elite: faction === Faction.EMPEROR || faction === Faction.FREMEN 
          ? Math.floor(Math.random() * 3) 
          : 0,
      },
      onBoard: [],
      tanks: {
        regular: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0,
        elite: 0,
      },
    },
    leaders: leaders.map((leaderDef, idx) => ({
      definitionId: leaderDef.id,
      faction: faction,
      strength: leaderDef.strength,
      location: 
        idx === 0 ? LeaderLocation.LEADER_POOL :
        idx === 1 ? LeaderLocation.TANKS_FACE_UP :
        idx === 2 ? LeaderLocation.ON_BOARD :
        LeaderLocation.LEADER_POOL,
      hasBeenKilled: idx === 1,
      usedThisTurn: idx === 0 && Math.random() > 0.5,
      usedInTerritoryId: null,
      originalFaction: faction,
      capturedBy: null,
    })),
    hand: Array(Math.floor(Math.random() * 4) + 1).fill(null).map((_, idx) => ({
      definitionId: `mock-card-${idx}`,
      type: TreacheryCardType.WEAPON_PROJECTILE,
      location: CardLocation.HAND,
      ownerId: faction,
    })) as TreacheryCard[],
    traitors: [],
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  };
}

/**
 * Generate mock game state with all factions
 */
export function createMockGameState(): Map<Faction, FactionState> {
  const factions = [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.HARKONNEN,
    Faction.SPACING_GUILD,
  ];

  const factionMap = new Map<Faction, FactionState>();
  
  factions.forEach((faction) => {
    factionMap.set(faction, createMockFactionState(faction));
  });

  return factionMap;
}

