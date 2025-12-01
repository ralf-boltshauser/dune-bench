/**
 * Leader definitions for all factions.
 * Each faction has 5 leaders with varying combat strengths.
 * Based on GF9 Dune base game.
 */

import { Faction, type LeaderDefinition } from "../types";

// =============================================================================
// ATREIDES LEADERS
// =============================================================================

export const ATREIDES_LEADERS: LeaderDefinition[] = [
  {
    id: "lady_jessica",
    name: "Lady Jessica",
    faction: Faction.ATREIDES,
    strength: 5,
  },
  {
    id: "thufir_hawat",
    name: "Thufir Hawat",
    faction: Faction.ATREIDES,
    strength: 5,
  },
  {
    id: "gurney_halleck",
    name: "Gurney Hallack",
    faction: Faction.ATREIDES,
    strength: 4,
  },
  {
    id: "duncan_idaho",
    name: "Duncan Idaho",
    faction: Faction.ATREIDES,
    strength: 2,
  },
  { id: "dr_yueh", name: "Dr. Yueh", faction: Faction.ATREIDES, strength: 1 },
];

// =============================================================================
// BENE GESSERIT LEADERS
// =============================================================================

export const BENE_GESSERIT_LEADERS: LeaderDefinition[] = [
  { id: "alia", name: "Alia", faction: Faction.BENE_GESSERIT, strength: 5 },
  {
    id: "margot_fenring",
    name: "Lady Margot Fenring",
    faction: Faction.BENE_GESSERIT,
    strength: 5,
  },
  {
    id: "princess_irulan",
    name: "Princess Irulan",
    faction: Faction.BENE_GESSERIT,
    strength: 5,
  },
  {
    id: "wanna_marcus",
    name: "Wanna Marcus",
    faction: Faction.BENE_GESSERIT,
    strength: 5,
  },
  {
    id: "reverend_mother",
    name: "Reverend Mother Ramallo",
    faction: Faction.BENE_GESSERIT,
    strength: 5,
  },
];

// =============================================================================
// EMPEROR LEADERS
// =============================================================================

export const EMPEROR_LEADERS: LeaderDefinition[] = [
  {
    id: "hasimir_fenring",
    name: "Count Fenring",
    faction: Faction.EMPEROR,
    strength: 6,
  },
  {
    id: "captain_aramsham",
    name: "Capt Aramsham",
    faction: Faction.EMPEROR,
    strength: 5,
  },
  { id: "burseg", name: "Burseg", faction: Faction.EMPEROR, strength: 3 },
  { id: "caid", name: "Caid", faction: Faction.EMPEROR, strength: 3 },
  { id: "bashar", name: "Bashar", faction: Faction.EMPEROR, strength: 2 },
];

// =============================================================================
// FREMEN LEADERS
// =============================================================================

export const FREMEN_LEADERS: LeaderDefinition[] = [
  { id: "stilgar", name: "Stilgar", faction: Faction.FREMEN, strength: 7 },
  { id: "chani", name: "Chani", faction: Faction.FREMEN, strength: 6 },
  { id: "otheym", name: "Otheym", faction: Faction.FREMEN, strength: 5 },
  {
    id: "shadout_mapes",
    name: "Shadout Mapes",
    faction: Faction.FREMEN,
    strength: 3,
  },
  { id: "jamis", name: "Jamis", faction: Faction.FREMEN, strength: 2 },
];

// =============================================================================
// HARKONNEN LEADERS
// =============================================================================

export const HARKONNEN_LEADERS: LeaderDefinition[] = [
  {
    id: "feyd_rautha",
    name: "Feyd-Rautha",
    faction: Faction.HARKONNEN,
    strength: 6,
  },
  {
    id: "beast_rabban",
    name: "Beast Rabban",
    faction: Faction.HARKONNEN,
    strength: 4,
  },
  {
    id: "piter_de_vries",
    name: "Piter DeVries",
    faction: Faction.HARKONNEN,
    strength: 3,
  },
  {
    id: "umman_kudu",
    name: "Umman Kudu",
    faction: Faction.HARKONNEN,
    strength: 2,
  },
  {
    id: "captain_iakin_nefud",
    name: "Nefud",
    faction: Faction.HARKONNEN,
    strength: 1,
  },
];

// =============================================================================
// SPACING GUILD LEADERS
// =============================================================================

export const SPACING_GUILD_LEADERS: LeaderDefinition[] = [
  {
    id: "staban_tuek",
    name: "Stabban Tuek",
    faction: Faction.SPACING_GUILD,
    strength: 5,
  },
  {
    id: "esmar_tuek",
    name: "Esmar Tuek",
    faction: Faction.SPACING_GUILD,
    strength: 3,
  },
  {
    id: "master_bewt",
    name: "Master Bewt",
    faction: Faction.SPACING_GUILD,
    strength: 3,
  },
  {
    id: "soo_soo_sook",
    name: "Soo-Soo Sook",
    faction: Faction.SPACING_GUILD,
    strength: 2,
  },
  {
    id: "guild_rep",
    name: "Guild Representative",
    faction: Faction.SPACING_GUILD,
    strength: 1,
  },
];

// =============================================================================
// ALL LEADERS
// =============================================================================

export const ALL_LEADERS: LeaderDefinition[] = [
  ...ATREIDES_LEADERS,
  ...BENE_GESSERIT_LEADERS,
  ...EMPEROR_LEADERS,
  ...FREMEN_LEADERS,
  ...HARKONNEN_LEADERS,
  ...SPACING_GUILD_LEADERS,
];

// Leader lookup by ID
export const LEADER_BY_ID: Record<string, LeaderDefinition> =
  Object.fromEntries(ALL_LEADERS.map((leader) => [leader.id, leader]));

// Leaders by faction
export const LEADERS_BY_FACTION: Record<Faction, LeaderDefinition[]> = {
  [Faction.ATREIDES]: ATREIDES_LEADERS,
  [Faction.BENE_GESSERIT]: BENE_GESSERIT_LEADERS,
  [Faction.EMPEROR]: EMPEROR_LEADERS,
  [Faction.FREMEN]: FREMEN_LEADERS,
  [Faction.HARKONNEN]: HARKONNEN_LEADERS,
  [Faction.SPACING_GUILD]: SPACING_GUILD_LEADERS,
};

// Get leader definition by ID
export function getLeaderDefinition(
  leaderId: string
): LeaderDefinition | undefined {
  return LEADER_BY_ID[leaderId];
}

// Get all leaders for a faction
export function getLeadersForFaction(faction: Faction): LeaderDefinition[] {
  return LEADERS_BY_FACTION[faction];
}
