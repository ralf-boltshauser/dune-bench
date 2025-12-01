#!/usr/bin/env tsx
/**
 * Test Global Prompt System
 * 
 * Tests that all faction prompts can be retrieved and are properly formatted.
 */

import { getFactionPrompt, getAllFactionPrompts } from './src/lib/game/agent/prompts';
import { Faction, FACTION_NAMES } from './src/lib/game/types';

console.log('🧪 Testing Global Prompt System\n');
console.log('='.repeat(80));

// Test 1: Get all prompts
console.log('\n📋 Test 1: Retrieving all faction prompts');
const allPrompts = getAllFactionPrompts();
const factions = Object.values(Faction);

console.log(`✅ Retrieved prompts for ${factions.length} factions:`);
for (const faction of factions) {
  const prompt = allPrompts[faction];
  const hasContent = prompt && prompt.length > 0;
  const status = hasContent ? '✅' : '❌';
  console.log(`  ${status} ${FACTION_NAMES[faction]}: ${prompt?.length || 0} characters`);
}

// Test 2: Get individual prompts
console.log('\n📋 Test 2: Retrieving individual faction prompts');
let allPassed = true;
for (const faction of factions) {
  try {
    const prompt = getFactionPrompt(faction);
    if (!prompt || prompt.length === 0) {
      console.log(`  ❌ ${FACTION_NAMES[faction]}: Empty prompt`);
      allPassed = false;
    } else {
      console.log(`  ✅ ${FACTION_NAMES[faction]}: ${prompt.length} characters`);
    }
  } catch (error) {
    console.log(`  ❌ ${FACTION_NAMES[faction]}: Error - ${error}`);
    allPassed = false;
  }
}

// Test 3: Check prompt content structure
console.log('\n📋 Test 3: Validating prompt structure');
for (const faction of factions) {
  const prompt = getFactionPrompt(faction);
  const hasAdvantages = prompt.includes('Advantages') || prompt.includes('Your Advantages');
  const hasStrategy = prompt.includes('Strategic') || prompt.includes('Priorities');
  const hasVictory = prompt.includes('Victory') || prompt.includes('win');
  
  const status = hasAdvantages && hasStrategy ? '✅' : '⚠️';
  console.log(`  ${status} ${FACTION_NAMES[faction]}:`);
  console.log(`     - Has Advantages section: ${hasAdvantages ? '✅' : '❌'}`);
  console.log(`     - Has Strategy section: ${hasStrategy ? '✅' : '❌'}`);
  console.log(`     - Has Victory section: ${hasVictory ? '✅' : '❌'}`);
}

// Test 4: Display sample prompt
console.log('\n📋 Test 4: Sample prompt (Atreides)');
console.log('-'.repeat(80));
const samplePrompt = getFactionPrompt(Faction.ATREIDES);
console.log(samplePrompt.substring(0, 500) + '...');
console.log('-'.repeat(80));

// Summary
console.log('\n' + '='.repeat(80));
if (allPassed) {
  console.log('✅ All tests passed! Global prompt system is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the output above.');
  process.exit(1);
}


