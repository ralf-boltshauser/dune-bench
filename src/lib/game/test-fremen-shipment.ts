#!/usr/bin/env npx tsx

/**
 * Test Fremen shipment tool validation
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from './src/lib/game/types/territories';
import { getTerritoriesWithinDistance } from './src/lib/game/rules/movement';

// Test the distance function
const greatFlat = TerritoryId.THE_GREAT_FLAT;
console.log('\n=== Fremen Shipment Distance Test ===\n');
console.log('Great Flat territory ID:', greatFlat);
console.log('Great Flat value:', JSON.stringify(greatFlat));

const greatFlatDef = TERRITORY_DEFINITIONS[greatFlat];
console.log('\nGreat Flat definition:');
console.log('  Name:', greatFlatDef.name);
console.log('  Sectors:', greatFlatDef.sectors);
console.log('  Adjacent territories:', greatFlatDef.adjacentTerritories);

// Get territories within 2
console.log('\n=== Distance Calculation ===');
const validDestinations = getTerritoriesWithinDistance(greatFlat, 2);
validDestinations.add(greatFlat); // Include Great Flat itself

console.log('\nValid Fremen shipment destinations (Great Flat + within 2):');
console.log('Total count:', validDestinations.size);

// Group by distance
const distance0 = [greatFlat];
const distance1 = greatFlatDef.adjacentTerritories;
const distance2: TerritoryId[] = [];

for (const terr of validDestinations) {
  if (terr !== greatFlat && !distance1.includes(terr)) {
    distance2.push(terr);
  }
}

console.log('\nDistance 0 (Great Flat itself):');
console.log('  -', greatFlat);

console.log('\nDistance 1 (adjacent to Great Flat):');
for (const terr of distance1) {
  console.log('  -', terr);
}

console.log('\nDistance 2:');
for (const terr of distance2.sort()) {
  console.log('  -', terr);
}

console.log('\n=== Test Specific Territories ===');

// Test the territories mentioned in the bug report
const testCases = [
  'sietch_tabr',
  'the_great_flat',
  'funeral_plain',
  'the_greater_flat',
  'habbanya_erg',
  'false_wall_west',
];

console.log('\nTesting specific territories:');
for (const testId of testCases) {
  const isValid = validDestinations.has(testId as TerritoryId);
  const territory = TERRITORY_DEFINITIONS[testId as TerritoryId];
  console.log(`  ${isValid ? '✅' : '❌'} ${testId} (${territory?.name})`);
}

console.log('\n=== Complete Valid Destination List ===');
const sortedDestinations = Array.from(validDestinations).sort();
console.log(sortedDestinations.join('\n  '));
