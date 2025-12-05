/**
 * Combat-specific types and interfaces.
 * Single source of truth for all combat-related type definitions.
 */

export interface BattlePlanSuggestion {
  forcesDialed: number;
  leaderId: string | null;
  weaponCardId: string | null;
  defenseCardId: string | null;
  estimatedStrength: number;
  description: string;
}

export interface WeaponDefenseResult {
  leaderKilled: boolean;
  weaponEffective: boolean;
  defenseEffective: boolean;
}

