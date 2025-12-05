/**
 * Weapon vs defense resolution logic.
 * Handles weapon/defense interactions and special cases (lasgun, Ellaca Drug, etc.).
 */

import { getTreacheryCardDefinition, isWorthless } from "../../data";
import { TreacheryCardType, type BattlePlan } from "../../types";
import type { WeaponDefenseResult } from "./types";

/**
 * Resolve weapon vs defense interaction.
 * @rule 1.07.06.02 - WEAPONS: Check to see if your opponent protected their leader from your weapon with the proper Defense, if they did not, do not add their leader's fighting strength to their number dialed. Next, see if your weapon affects your leader, if it does check to see if you played the proper Defense, if not do not add your leader's fighting strength to your number dialed. Note: Some weapons may not kill leaders but still make the leader's fighting strength nonapplicable.
 * @rule 3.01.02, 3.01.03, 3.01.05, 3.01.06, 3.01.08, 3.01.15, 3.01.16, 3.01.17, 3.01.18, 3.01.19
 */
export function resolveWeaponDefense(
  weaponCardId: string | null,
  defenseCardId: string | null,
  targetLeaderId: string | null
): WeaponDefenseResult {
  if (!weaponCardId || !targetLeaderId) {
    return {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };
  }

  const weapon = getTreacheryCardDefinition(weaponCardId);
  const defense = defenseCardId
    ? getTreacheryCardDefinition(defenseCardId)
    : null;

  if (!weapon || isWorthless(weapon)) {
    return {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };
  }

  // Lasgun has no defense (except causes explosion with shield)
  if (weapon.type === TreacheryCardType.WEAPON_SPECIAL) {
    return {
      leaderKilled: true,
      weaponEffective: true,
      defenseEffective: false,
    };
  }

  // Check if defense matches weapon type
  // Special case: Ellaca Drug is a poison weapon but defended by projectile defense
  const isEllacaDrug = weaponCardId === "ellaca_drug";
  const isProjectileWeapon =
    weapon.type === TreacheryCardType.WEAPON_PROJECTILE || isEllacaDrug;
  const isPoisonWeapon =
    weapon.type === TreacheryCardType.WEAPON_POISON && !isEllacaDrug;

  let defenseEffective = false;
  if (defense && !isWorthless(defense)) {
    if (
      isProjectileWeapon &&
      defense.type === TreacheryCardType.DEFENSE_PROJECTILE
    ) {
      defenseEffective = true;
    }
    if (isPoisonWeapon && defense.type === TreacheryCardType.DEFENSE_POISON) {
      defenseEffective = true;
    }
  }

  return {
    leaderKilled: !defenseEffective,
    weaponEffective: !defenseEffective,
    defenseEffective,
  };
}

/**
 * Check for lasgun/shield explosion.
 */
export function checkLasgunShieldExplosion(
  plan1: BattlePlan,
  plan2: BattlePlan
): boolean {
  const hasLasgun = (id: string | null): boolean =>
    !!id &&
    getTreacheryCardDefinition(id)?.type === TreacheryCardType.WEAPON_SPECIAL;
  const hasShield = (id: string | null): boolean =>
    !!id &&
    getTreacheryCardDefinition(id)?.type ===
      TreacheryCardType.DEFENSE_PROJECTILE;

  // Lasgun + any shield in the battle = explosion
  const lasgunPresent =
    hasLasgun(plan1.weaponCardId) || hasLasgun(plan2.weaponCardId);
  const shieldPresent =
    hasShield(plan1.defenseCardId) || hasShield(plan2.defenseCardId);

  return lasgunPresent && shieldPresent;
}

