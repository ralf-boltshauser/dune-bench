/**
 * Test Voice command compliance validation
 */

import { Faction, TreacheryCardType, CardLocation, type BattlePlan, type GameState } from './types';
import { validateVoiceCompliance } from './rules';
import { createGameState } from './state/factory';

console.log('=== Testing Voice Command Compliance ===\n');

// Create a test game state
const state = createGameState({
  factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
  maxTurns: 10,
  advancedRules: false,
  variants: {
    shieldWallStronghold: false,
    leaderSkillCards: false,
    homeworlds: false,
  },
});

// Give Atreides some treachery cards for testing
const atreidesState = state.factions.get(Faction.ATREIDES)!;
atreidesState.hand = [
  {
    definitionId: 'crysknife',
    type: TreacheryCardType.WEAPON_POISON,
    location: CardLocation.HAND,
    ownerId: Faction.ATREIDES,
  },
  {
    definitionId: 'maula_pistol',
    type: TreacheryCardType.WEAPON_PROJECTILE,
    location: CardLocation.HAND,
    ownerId: Faction.ATREIDES,
  },
  {
    definitionId: 'snooper',
    type: TreacheryCardType.DEFENSE_POISON,
    location: CardLocation.HAND,
    ownerId: Faction.ATREIDES,
  },
  {
    definitionId: 'shield',
    type: TreacheryCardType.DEFENSE_PROJECTILE,
    location: CardLocation.HAND,
    ownerId: Faction.ATREIDES,
  },
];

// Test 1: Voice command to play poison weapon - compliance
console.log('Test 1: Voice command to play poison weapon - Atreides complies');
const plan1: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  leaderId: 'duke_leto',
  cheapHeroUsed: false,
  weaponCardId: 'crysknife', // Poison weapon
  defenseCardId: 'shield',
  kwisatzHaderachUsed: false,
  spiceDialed: 0,
  announcedNoLeader: false,
};

const voiceCommand1 = {
  type: 'play' as const,
  cardType: 'poison_weapon',
};

const errors1 = validateVoiceCompliance(state, plan1, voiceCommand1);
console.log(`  Errors: ${errors1.length === 0 ? 'None (✓)' : errors1.map(e => e.message).join(', ')}`);
console.log();

// Test 2: Voice command to play poison weapon - violation
console.log('Test 2: Voice command to play poison weapon - Atreides violates');
const plan2: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  leaderId: 'duke_leto',
  cheapHeroUsed: false,
  weaponCardId: 'maula_pistol', // Projectile weapon (violation!)
  defenseCardId: 'shield',
  kwisatzHaderachUsed: false,
  spiceDialed: 0,
  announcedNoLeader: false,
};

const errors2 = validateVoiceCompliance(state, plan2, voiceCommand1);
console.log(`  Errors: ${errors2.length > 0 ? errors2.map(e => e.message).join(', ') + ' (✓)' : 'None (X)'}`);
console.log();

// Test 3: Voice command to NOT play projectile defense - compliance
console.log('Test 3: Voice command to NOT play projectile defense - Atreides complies');
const plan3: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  leaderId: 'duke_leto',
  cheapHeroUsed: false,
  weaponCardId: 'crysknife',
  defenseCardId: 'snooper', // Poison defense (not projectile)
  kwisatzHaderachUsed: false,
  spiceDialed: 0,
  announcedNoLeader: false,
};

const voiceCommand3 = {
  type: 'not_play' as const,
  cardType: 'projectile_defense',
};

const errors3 = validateVoiceCompliance(state, plan3, voiceCommand3);
console.log(`  Errors: ${errors3.length === 0 ? 'None (✓)' : errors3.map(e => e.message).join(', ')}`);
console.log();

// Test 4: Voice command to NOT play projectile defense - violation
console.log('Test 4: Voice command to NOT play projectile defense - Atreides violates');
const plan4: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  leaderId: 'duke_leto',
  cheapHeroUsed: false,
  weaponCardId: 'crysknife',
  defenseCardId: 'shield', // Shield is projectile defense (violation!)
  kwisatzHaderachUsed: false,
  spiceDialed: 0,
  announcedNoLeader: false,
};

const errors4 = validateVoiceCompliance(state, plan4, voiceCommand3);
console.log(`  Errors: ${errors4.length > 0 ? errors4.map(e => e.message).join(', ') + ' (✓)' : 'None (X)'}`);
console.log();

// Test 5: Voice command when player doesn't have the card type
console.log('Test 5: Voice command to play worthless card - Atreides does not have one');
const plan5: BattlePlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  leaderId: 'duke_leto',
  cheapHeroUsed: false,
  weaponCardId: 'crysknife',
  defenseCardId: 'snooper',
  kwisatzHaderachUsed: false,
  spiceDialed: 0,
  announcedNoLeader: false,
};

const voiceCommand5 = {
  type: 'play' as const,
  cardType: 'worthless',
};

const errors5 = validateVoiceCompliance(state, plan5, voiceCommand5);
console.log(`  Errors: ${errors5.length === 0 ? 'None (✓ - cannot comply if no card)' : errors5.map(e => e.message).join(', ')}`);
console.log();

console.log('=== All Voice Compliance Tests Complete ===');
