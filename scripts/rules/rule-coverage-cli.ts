/**
 * Rule Coverage CLI
 * 
 * Combines rule index and annotation scan to generate coverage reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractAllRules } from './extract-rules';
import { scanAnnotations, type ScanResult } from './scan-annotations';

interface CoverageReport {
  totalRules: number;
  implementedRules: Set<string>;
  testedRules: Set<string>;
  missingImplementation: string[];
  missingTests: string[];
  implementationCoverage: number;
  testCoverage: number;
  ruleDetails: Array<{
    id: string;
    status: 'OK' | 'NO_IMPL' | 'NO_TEST' | 'IMPL_NO_TEST';
    implementations: number;
    tests: number;
  }>;
}

interface RuleIndex {
  generatedAt: string;
  totalRules: number;
  rules: Array<{
    id: string;
    sources: Array<{
      file: string;
      line: number;
      context: string;
    }>;
  }>;
}

/**
 * Load or generate rules index
 */
function loadRulesIndex(indexPath: string): RuleIndex {
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  }
  
  // Generate index on the fly if it doesn't exist
  console.log('⚠️  Rules index not found, generating...');
  const rules = extractAllRules();
  const index: RuleIndex = {
    generatedAt: new Date().toISOString(),
    totalRules: Object.keys(rules).length,
    rules: Object.values(rules),
  };
  return index;
}

/**
 * Load rule exclusions (optional).
 * If src/lib/game/rules/index/rule-exclusions.json exists, use it to
 * filter out rules that should not count towards coverage.
 */
function loadRuleExclusions(projectRoot: string): Set<string> {
  const exclusionsPath = path.join(
    projectRoot,
    "src/lib/game/rules/index/rule-exclusions.json"
  );

  if (!fs.existsSync(exclusionsPath)) {
    return new Set();
  }

  try {
    const raw = fs.readFileSync(exclusionsPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      exclude?: Array<{ id: string }>;
    };
    const ids = new Set<string>();

    (parsed.exclude || []).forEach((e) => {
      if (e.id) ids.add(e.id);
    });

    if (ids.size > 0) {
      console.log(
        `   Excluding ${ids.size} rule(s) from coverage via rule-exclusions.json`
      );
    }

    return ids;
  } catch (err) {
    console.error("⚠️  Failed to load rule-exclusions.json:", err);
    return new Set();
  }
}

interface ExclusionEntry {
  id: string;
  reason?: string;
  needsImplementation?: boolean;
}

/**
 * Load rule exclusions with metadata (for visual display)
 */
function loadRuleExclusionsWithMetadata(projectRoot: string): Map<string, ExclusionEntry> {
  const exclusionsPath = path.join(
    projectRoot,
    "src/lib/game/rules/index/rule-exclusions.json"
  );

  const exclusions = new Map<string, ExclusionEntry>();

  if (!fs.existsSync(exclusionsPath)) {
    return exclusions;
  }

  try {
    const raw = fs.readFileSync(exclusionsPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      exclude?: Array<ExclusionEntry>;
    };

    (parsed.exclude || []).forEach((e) => {
      if (e.id) {
        exclusions.set(e.id, { 
          id: e.id, 
          reason: e.reason,
          needsImplementation: e.needsImplementation 
        });
      }
    });

    return exclusions;
  } catch (err) {
    console.error("⚠️  Failed to load rule-exclusions.json:", err);
    return exclusions;
  }
}

/**
 * Calculate coverage report
 */
function calculateCoverage(
  rulesIndex: RuleIndex,
  scanResult: ScanResult
): CoverageReport {
  const allRuleIds = new Set(rulesIndex.rules.map(r => r.id));
  const implementedRules = new Set(Object.keys(scanResult.implementedByRule));
  const testedRules = new Set(Object.keys(scanResult.testedByRule));
  
  const missingImplementation = Array.from(allRuleIds).filter(
    id => !implementedRules.has(id)
  );
  const missingTests = Array.from(allRuleIds).filter(id => !testedRules.has(id));
  
  const implementationCoverage =
    allRuleIds.size > 0 ? implementedRules.size / allRuleIds.size : 0;
  const testCoverage = allRuleIds.size > 0 ? testedRules.size / allRuleIds.size : 0;
  
  // Build detailed rule status
  const ruleDetails = rulesIndex.rules.map(rule => {
    const hasImpl = implementedRules.has(rule.id);
    const hasTest = testedRules.has(rule.id);
    
    let status: 'OK' | 'NO_IMPL' | 'NO_TEST' | 'IMPL_NO_TEST';
    if (hasImpl && hasTest) {
      status = 'OK';
    } else if (!hasImpl) {
      status = 'NO_IMPL';
    } else if (!hasTest) {
      status = 'IMPL_NO_TEST';
    } else {
      status = 'NO_TEST';
    }
    
    return {
      id: rule.id,
      status,
      implementations: scanResult.implementedByRule[rule.id]?.length ?? 0,
      tests: scanResult.testedByRule[rule.id]?.length ?? 0,
    };
  });
  
  return {
    totalRules: allRuleIds.size,
    implementedRules,
    testedRules,
    missingImplementation,
    missingTests,
    implementationCoverage,
    testCoverage,
    ruleDetails,
  };
}

/**
 * Group rules by prefix (e.g., 1.*, 2.*)
 */
function groupByPrefix(ruleIds: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  ruleIds.forEach(id => {
    const prefix = id.split('.')[0];
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(id);
  });
  
  return groups;
}

/**
 * Print status for a specific rule
 */
function printRuleStatus(
  ruleId: string,
  report: CoverageReport,
  scanResult: ScanResult,
  rulesIndex: RuleIndex,
  excludedRules?: Map<string, ExclusionEntry>
): void {
  // Check if rule is in excluded rules (need to check full rules index)
  const fullRulesIndex = loadRulesIndex(path.join(process.cwd(), 'src/lib/game/rules/index/rules-index.json'));
  const fullRule = fullRulesIndex.rules.find(r => r.id === ruleId);
  
  if (!fullRule) {
    console.error(`❌ Rule ${ruleId} not found in rules index`);
    process.exit(1);
  }
  
  const rule = rulesIndex.rules.find(r => r.id === ruleId);
  const exclusion = excludedRules?.get(ruleId);
  const hasImpl = report.implementedRules.has(ruleId);
  const hasTest = report.testedRules.has(ruleId);
  const implementations = scanResult.implementedByRule[ruleId] || [];
  const tests = scanResult.testedByRule[ruleId] || [];
  
  console.log(`\n📋 Rule Status: ${ruleId}\n`);
  
  // Show exclusion status if excluded
  if (exclusion) {
    console.log('🚫 Exclusion Status: EXCLUDED FROM COVERAGE');
    if (exclusion.needsImplementation === true) {
      console.log('   🔨 Needs Implementation: YES');
    } else if (exclusion.needsImplementation === false) {
      console.log('   ✅ Needs Implementation: NO');
    } else {
      console.log('   ⚠️  Needs Implementation: NOT CATEGORIZED');
    }
    if (exclusion.reason) {
      console.log(`   📝 Reason: ${exclusion.reason}`);
    }
    console.log();
  }
  
  // Show rule context
  if (fullRule.sources.length > 0) {
    console.log('📖 Rule Definition:');
    fullRule.sources.forEach(source => {
      console.log(`   ${source.file}:${source.line}`);
      console.log(`   ${source.context.substring(0, 100)}...`);
    });
    console.log();
  }
  
  // Implementation status
  console.log(`Implementation: ${hasImpl ? '✅ Implemented' : '❌ Not Implemented'}`);
  if (hasImpl) {
    implementations.forEach(impl => {
      console.log(`   📝 ${impl.file}:${impl.line}`);
      console.log(`      ${impl.snippet}`);
    });
  } else if (!exclusion) {
    console.log(`   💡 Tip: Use 'pnpm rules:missing' to see missing implementations`);
  }
  console.log();
  
  // Test status
  console.log(`Tests: ${hasTest ? '✅ Tested' : '❌ Not Tested'}`);
  if (hasTest) {
    tests.forEach(test => {
      console.log(`   🧪 ${test.file}:${test.line}`);
      console.log(`      ${test.snippet}`);
    });
  }
  console.log();
  
  // Overall status
  if (exclusion) {
    if (exclusion.needsImplementation === true) {
      console.log('Status: 🚫 EXCLUDED (but needs implementation)');
    } else if (exclusion.needsImplementation === false) {
      console.log('Status: 🚫 EXCLUDED (no implementation needed)');
    } else {
      console.log('Status: 🚫 EXCLUDED (not categorized)');
    }
  } else if (hasImpl && hasTest) {
    console.log('Status: ✅ Complete (implemented and tested)');
  } else if (hasImpl) {
    console.log('Status: ⚠️  Implemented but not tested');
  } else if (hasTest) {
    console.log('Status: ⚠️  Tested but not implemented');
  } else {
    console.log('Status: ❌ Not implemented or tested');
  }
}

/**
 * Print list of excluded rules with their reasons
 */
function printExcludedRules(
  excludedRules: Map<string, ExclusionEntry>,
  fullRulesIndex: RuleIndex,
  options: {
    needsImplementation?: boolean | null;
    count?: number;
  } = {}
): void {
  if (excludedRules.size === 0) {
    console.log('\n✅ No excluded rules found.\n');
    return;
  }

  let filtered = Array.from(excludedRules.values());

  // Filter by needsImplementation if specified
  if (options.needsImplementation !== undefined && options.needsImplementation !== null) {
    filtered = filtered.filter(e => e.needsImplementation === options.needsImplementation);
  }

  // Sort by rule ID
  filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const count = options.count ?? filtered.length;
  const displayCount = Math.min(count, filtered.length);

  console.log(`\n📋 Excluded Rules${options.needsImplementation !== undefined && options.needsImplementation !== null ? (options.needsImplementation ? ' (Needs Implementation)' : ' (No Implementation Needed)') : ''}\n`);
  console.log(`Total: ${filtered.length} excluded rule(s)\n`);

  filtered.slice(0, displayCount).forEach((exclusion, index) => {
    const rule = fullRulesIndex.rules.find(r => r.id === exclusion.id);
    
    console.log(`${index + 1}. ${exclusion.id}`);
    
    // Show implementation status
    if (exclusion.needsImplementation === true) {
      console.log(`   🔨 Status: Needs Implementation`);
    } else if (exclusion.needsImplementation === false) {
      console.log(`   ✅ Status: No Implementation Needed`);
    } else {
      console.log(`   ⚠️  Status: Not Categorized`);
    }
    
    // Show reason
    if (exclusion.reason) {
      console.log(`   📝 Reason: ${exclusion.reason}`);
    } else {
      console.log(`   📝 Reason: (No reason provided)`);
    }
    
    // Show rule context if available
    if (rule && rule.sources.length > 0) {
      const source = rule.sources[0];
      console.log(`   📖 Source: ${source.file}:${source.line}`);
      console.log(`   ${source.context.substring(0, 80)}...`);
    }
    
    console.log();
  });

  if (filtered.length > displayCount) {
    console.log(`   ... and ${filtered.length - displayCount} more excluded rules\n`);
  }

  // Show summary by status
  const needsImpl = filtered.filter(e => e.needsImplementation === true).length;
  const noImpl = filtered.filter(e => e.needsImplementation === false).length;
  const uncategorized = filtered.filter(e => e.needsImplementation === undefined || e.needsImplementation === null).length;

  if (options.needsImplementation === undefined || options.needsImplementation === null) {
    console.log('Summary:');
    console.log(`   🔨 Needs Implementation: ${needsImpl}`);
    console.log(`   ✅ No Implementation Needed: ${noImpl}`);
    console.log(`   ⚠️  Not Categorized: ${uncategorized}`);
    console.log();
  }
}

/**
 * Print list of missing rules
 */
function printMissingRules(
  report: CoverageReport,
  rulesIndex: RuleIndex,
  count: number = 3,
  mode: 'implementation' | 'test' = 'implementation'
): void {
  const missing = mode === 'implementation' 
    ? report.missingImplementation 
    : report.missingTests;
  
  if (missing.length === 0) {
    console.log(`\n✅ All rules have ${mode === 'implementation' ? 'implementation' : 'test'} annotations!`);
    return;
  }
  
  console.log(`\n📋 First ${Math.min(count, missing.length)} Missing ${mode === 'implementation' ? 'Implementation' : 'Test'} Rules:\n`);
  
  missing.slice(0, count).forEach((ruleId, index) => {
    const rule = rulesIndex.rules.find(r => r.id === ruleId);
    const hasImpl = report.implementedRules.has(ruleId);
    const hasTest = report.testedRules.has(ruleId);
    
    console.log(`${index + 1}. ${ruleId}`);
    
    if (rule && rule.sources.length > 0) {
      const source = rule.sources[0];
      console.log(`   📖 ${source.file}:${source.line}`);
      console.log(`   ${source.context.substring(0, 80)}...`);
    }
    
    // Show what's missing
    if (mode === 'implementation') {
      if (hasTest) {
        console.log(`   ⚠️  Has test but no implementation`);
      }
    } else {
      if (hasImpl) {
        console.log(`   ⚠️  Has implementation but no test`);
      }
    }
    console.log();
  });
  
  if (missing.length > count) {
    console.log(`   ... and ${missing.length - count} more missing rules`);
  }
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

/**
 * Get colored character for rule status
 */
function getColoredChar(char: string, status: string, excluded: boolean, needsImplementation?: boolean): string {
  if (excluded) {
    // Color excluded rules that need implementation in yellow/orange to highlight them
    if (needsImplementation) {
      return `${colors.yellow}${char}${colors.reset}`;
    }
    return char; // Excluded rules that don't need implementation stay normal color
  }
  
  if (status === 'OK') {
    return `${colors.green}${char}${colors.reset}`;
  } else if (status === 'NO_IMPL') {
    return `${colors.red}${char}${colors.reset}`;
  }
  
  return char; // Other statuses stay normal color
}

/**
 * Print visual dot-style report (like test runners)
 */
function printVisualReport(
  report: CoverageReport,
  rulesIndex: RuleIndex,
  excludedRules: Map<string, ExclusionEntry>,
  fullRulesIndex: RuleIndex,
  options: {
    prefix?: string;
    width?: number;
  } = {}
): void {
  // Filter by prefix if specified
  let filteredDetails = report.ruleDetails;
  if (options.prefix) {
    filteredDetails = filteredDetails.filter(r => r.id.startsWith(options.prefix + '.'));
  }

  // Add excluded rules to the visual output
  const excludedDetails = Array.from(excludedRules.values())
    .map(excluded => {
      const rule = fullRulesIndex.rules.find(r => r.id === excluded.id);
      if (!rule) return null;
      
      // Check if excluded rule has any implementation/test annotations
      const hasImpl = report.implementedRules.has(excluded.id);
      const hasTest = report.testedRules.has(excluded.id);
      
      let status: 'OK' | 'NO_IMPL' | 'NO_TEST' | 'IMPL_NO_TEST' | 'EXCLUDED';
      if (hasImpl && hasTest) {
        status = 'OK';
      } else if (hasImpl) {
        status = 'IMPL_NO_TEST';
      } else if (hasTest) {
        status = 'NO_TEST';
      } else {
        status = 'NO_IMPL';
      }
      
      return {
        id: excluded.id,
        status: 'EXCLUDED' as const,
        implementations: hasImpl ? 1 : 0,
        tests: hasTest ? 1 : 0,
        excluded: true,
        reason: excluded.reason,
        needsImplementation: excluded.needsImplementation,
      };
    })
    .filter((r): r is NonNullable<typeof r> & { excluded: true; reason?: string } => r !== null);

  // Filter excluded rules by prefix if specified
  const filteredExcluded = options.prefix
    ? excludedDetails.filter(r => r.id.startsWith(options.prefix + '.'))
    : excludedDetails;

  const width = options.width ?? 80;
  const prefixNames: Record<string, string> = {
    '0': 'Setup',
    '1': 'Phases',
    '2': 'Factions',
    '3': 'Treachery Cards',
    '4': 'Variants',
  };

  // Combine regular and excluded rules for grouping
  const allRuleIds = [
    ...filteredDetails.map(r => r.id),
    ...filteredExcluded.map(r => r.id),
  ];
  const prefixGroups = groupByPrefix(allRuleIds);
  
  console.log('\n📊 Rule Implementation Status (Visual)\n');
  console.log('Legend:');
  console.log('  ✓ = Implemented & Tested');
  console.log('  I = Implemented (no test)');
  console.log('  T = Tested (no impl)');
  console.log('  · = Not implemented');
  console.log('  X = Excluded (no impl needed)');
  console.log('  x = Excluded (needs impl)\n');

  // Sort prefixes
  const sortedPrefixes = Object.keys(prefixGroups).sort();
  
  for (const prefix of sortedPrefixes) {
    const groupRules = filteredDetails
      .filter(r => r.id.startsWith(prefix + '.'))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    
    const groupExcluded = filteredExcluded
      .filter(r => r.id.startsWith(prefix + '.'))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    
    // Combine and sort all rules together
    const allGroupRules = [
      ...groupRules.map(r => ({ ...r, excluded: false as const })),
      ...groupExcluded.map(r => ({ ...r, excluded: true as const })),
    ].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    
    const name = prefixNames[prefix] || `Section ${prefix}`;
    const implCount = groupRules.filter(r => r.status !== 'NO_IMPL').length;
    const totalCount = groupRules.length;
    const excludedCount = groupExcluded.length;
    const coverage = totalCount > 0 ? (implCount / totalCount) * 100 : 0;
    
    const totalDisplay = excludedCount > 0 
      ? `${implCount}/${totalCount} implemented (${coverage.toFixed(1)}%), ${excludedCount} excluded`
      : `${implCount}/${totalCount} implemented (${coverage.toFixed(1)}%)`;
    
    console.log(`\n${name} (${prefix}.*) - ${totalDisplay}`);
    console.log('─'.repeat(Math.min(width, 100)));
    
    // Print dots in rows
    let line = '';
    let charsInLine = 0;
    const charsPerLine = width - 4; // Account for indentation
    
    for (const rule of allGroupRules) {
      let char: string;
      if (rule.excluded) {
        // Use 'x' (lowercase) for excluded rules that need implementation, 'X' for those that don't
        char = rule.needsImplementation ? 'x' : 'X';
      } else {
        switch (rule.status) {
          case 'OK':
            char = '✓';
            break;
          case 'IMPL_NO_TEST':
            char = 'I';
            break;
          case 'NO_TEST':
            char = 'T';
            break;
          case 'NO_IMPL':
          default:
            char = '·';
            break;
        }
      }
      
      // Add colored character
      const coloredChar = getColoredChar(char, rule.status, rule.excluded, rule.needsImplementation);
      
      if (charsInLine >= charsPerLine) {
        console.log(`  ${line}`);
        line = '';
        charsInLine = 0;
      }
      
      line += coloredChar;
      charsInLine++;
    }
    
    if (line.length > 0) {
      console.log(`  ${line}`);
    }
    
    // Show summary for this section
    const okCount = groupRules.filter(r => r.status === 'OK').length;
    const implOnlyCount = groupRules.filter(r => r.status === 'IMPL_NO_TEST').length;
    const testOnlyCount = groupRules.filter(r => r.status === 'NO_TEST').length;
    const missingCount = groupRules.filter(r => r.status === 'NO_IMPL').length;
    const excludedNeedsImplCount = groupExcluded.filter(r => r.needsImplementation).length;
    const excludedNoImplCount = groupExcluded.filter(r => !r.needsImplementation).length;
    
    const summary: string[] = [];
    if (okCount > 0) summary.push(`${okCount} ✓`);
    if (implOnlyCount > 0) summary.push(`${implOnlyCount} I`);
    if (testOnlyCount > 0) summary.push(`${testOnlyCount} T`);
    if (missingCount > 0) summary.push(`${missingCount} ·`);
    if (excludedNeedsImplCount > 0) summary.push(`${excludedNeedsImplCount} x`);
    if (excludedNoImplCount > 0) summary.push(`${excludedNoImplCount} X`);
    
    if (summary.length > 0) {
      console.log(`  Summary: ${summary.join(', ')}`);
    }
  }
  
  // Overall summary
  console.log('\n' + '═'.repeat(Math.min(width, 100)));
  const totalOk = filteredDetails.filter(r => r.status === 'OK').length;
  const totalImplOnly = filteredDetails.filter(r => r.status === 'IMPL_NO_TEST').length;
  const totalTestOnly = filteredDetails.filter(r => r.status === 'NO_TEST').length;
  const totalMissing = filteredDetails.filter(r => r.status === 'NO_IMPL').length;
  const totalExcluded = filteredExcluded.length;
  const totalExcludedNeedsImpl = filteredExcluded.filter(r => r.needsImplementation).length;
  const totalExcludedNoImpl = filteredExcluded.filter(r => !r.needsImplementation).length;
  const totalRules = filteredDetails.length + totalExcluded;
  
  console.log(`\nOverall: ${totalRules} rules (${filteredDetails.length} tracked, ${totalExcluded} excluded)`);
  console.log(`  ✓ Complete: ${totalOk} (${filteredDetails.length > 0 ? ((totalOk / filteredDetails.length) * 100).toFixed(1) : '0.0'}%)`);
  console.log(`  I Implemented only: ${totalImplOnly}`);
  console.log(`  T Tested only: ${totalTestOnly}`);
  console.log(`  · Missing: ${totalMissing} (${filteredDetails.length > 0 ? ((totalMissing / filteredDetails.length) * 100).toFixed(1) : '0.0'}%)`);
  if (totalExcludedNeedsImpl > 0) {
    console.log(`  x Excluded (needs impl): ${totalExcludedNeedsImpl}`);
  }
  if (totalExcludedNoImpl > 0) {
    console.log(`  X Excluded (no impl needed): ${totalExcludedNoImpl}`);
  }
  console.log();
}

/**
 * Print coverage report to console
 */
function printReport(
  report: CoverageReport,
  scanResult: ScanResult,
  rulesIndex: RuleIndex,
  mode: 'implementation' | 'test',
  excludedRules: Map<string, ExclusionEntry>,
  fullRulesIndex: RuleIndex,
  options: {
    verbose?: boolean;
    json?: boolean;
    prefix?: string;
    showMissing?: number;
    visual?: boolean;
    width?: number;
  } = {}
): void {
  if (options.visual) {
    printVisualReport(report, rulesIndex, excludedRules, fullRulesIndex, { prefix: options.prefix, width: options.width });
    return;
  }
  if (options.json) {
    const jsonOutput = {
      report: {
        totalRules: report.totalRules,
        implementationCoverage: report.implementationCoverage,
        testCoverage: report.testCoverage,
        implementedCount: report.implementedRules.size,
        testedCount: report.testedRules.size,
        missingImplementationCount: report.missingImplementation.length,
        missingTestsCount: report.missingTests.length,
      },
      rules: report.ruleDetails,
      annotations: {
        implementations: scanResult.implementedByRule,
        tests: scanResult.testedByRule,
      },
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }
  
  // Filter by prefix if specified
  let filteredDetails = report.ruleDetails;
  if (options.prefix) {
    filteredDetails = filteredDetails.filter(r => r.id.startsWith(options.prefix + '.'));
  }
  
  console.log('\n📊 Rule Coverage Report\n');
  console.log(`Total Rules: ${report.totalRules}`);
  console.log(`Implementation Coverage: ${report.implementedRules.size} (${(report.implementationCoverage * 100).toFixed(1)}%)`);
  console.log(`Test Coverage: ${report.testedRules.size} (${(report.testCoverage * 100).toFixed(1)}%)\n`);
  
  // Group by prefix
  const prefixGroups = groupByPrefix(
    filteredDetails.map(r => r.id)
  );
  const prefixNames: Record<string, string> = {
    '0': 'Setup',
    '1': 'Phases',
    '2': 'Factions',
    '3': 'Treachery Cards',
    '4': 'Variants',
  };
  
  console.log('📈 Coverage by Section:');
  Object.keys(prefixGroups)
    .sort()
    .forEach(prefix => {
      const groupRules = filteredDetails.filter(r => r.id.startsWith(prefix + '.'));
      const implCount = groupRules.filter(r => r.status !== 'NO_IMPL').length;
      const testCount = groupRules.filter(r => r.status === 'OK' || r.status === 'IMPL_NO_TEST').length;
      const coverage = groupRules.length > 0 ? (implCount / groupRules.length) * 100 : 0;
      const name = prefixNames[prefix] || `Section ${prefix}`;
      console.log(`   ${name} (${prefix}.*): ${implCount}/${groupRules.length} implemented (${coverage.toFixed(1)}%)`);
    });
  console.log();
  
  // Show missing implementations
  if (mode === 'implementation' || mode === 'test') {
    const missing = mode === 'implementation' ? report.missingImplementation : report.missingTests;
    const filteredMissing = options.prefix
      ? missing.filter(id => id.startsWith(options.prefix + '.'))
      : missing;
    
    if (filteredMissing.length > 0) {
      const showCount = options.showMissing ?? 20;
      console.log(`❌ Missing ${mode === 'implementation' ? 'Implementation' : 'Tests'}:`);
      filteredMissing.slice(0, showCount).forEach(ruleId => {
        const rule = rulesIndex.rules.find(r => r.id === ruleId);
        const hasImpl = report.implementedRules.has(ruleId);
        const hasTest = report.testedRules.has(ruleId);
        
        let note = '';
        if (mode === 'test' && hasImpl) {
          note = ' (has implementation)';
        } else if (mode === 'implementation' && hasTest) {
          note = ' (has test)';
        }
        
        const context = rule?.sources[0]?.context?.substring(0, 60) || 'No context';
        console.log(`   - ${ruleId}${note}`);
        if (rule && rule.sources.length > 0) {
          console.log(`     ${rule.sources[0].file}:${rule.sources[0].line} - ${context}...`);
        }
      });
      if (filteredMissing.length > showCount) {
        console.log(`   ... and ${filteredMissing.length - showCount} more`);
      }
      console.log();
    }
  }
  
  // Show implemented rules with locations
  if (options.verbose) {
    const implemented = filteredDetails.filter(r => r.status === 'OK' || r.status === 'IMPL_NO_TEST');
    if (implemented.length > 0) {
      console.log('✅ Implemented Rules (sample):');
      implemented.slice(0, 10).forEach(rule => {
        console.log(`   ${rule.id}:`);
        const impls = scanResult.implementedByRule[rule.id] || [];
        impls.slice(0, 2).forEach(impl => {
          console.log(`     📝 ${impl.file}:${impl.line}`);
        });
        const tests = scanResult.testedByRule[rule.id] || [];
        tests.slice(0, 2).forEach(test => {
          console.log(`     🧪 ${test.file}:${test.line}`);
        });
      });
      if (implemented.length > 10) {
        console.log(`   ... and ${implemented.length - 10} more`);
      }
    }
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('test') ? 'test' : 'implementation';
  
  const options: {
    verbose?: boolean;
    json?: boolean;
    prefix?: string;
    showMissing?: number;
    minImpl?: number;
    minTest?: number;
    listMissing?: number | boolean;
    listExcluded?: number | boolean;
    excludedNeedsImpl?: boolean | null;
    checkRule?: string;
    visual?: boolean;
    width?: number;
    needsTests?: boolean;
  } = {};
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json' || arg === '-j') {
      options.json = true;
    } else if (arg === '--visual' || arg === '--dots' || arg === '-d') {
      options.visual = true;
    } else if (arg.startsWith('--prefix=')) {
      options.prefix = arg.split('=')[1];
    } else if (arg.startsWith('--show-missing=')) {
      options.showMissing = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--width=')) {
      options.width = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--min-impl=')) {
      options.minImpl = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--min-test=')) {
      options.minTest = parseFloat(arg.split('=')[1]);
    } else if (arg === '--list-missing' || arg === '--missing') {
      options.listMissing = true;
    } else if (arg.startsWith('--list-missing=')) {
      options.listMissing = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--list-excluded' || arg === '--excluded') {
      options.listExcluded = true;
    } else if (arg.startsWith('--list-excluded=')) {
      options.listExcluded = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--list-needs-impl' || arg === '--needs-impl-only') {
      // Shortcut: list only excluded rules that need implementation
      options.listExcluded = true;
      options.excludedNeedsImpl = true;
    } else if (arg === '--needs-impl' || arg === '--needs-implementation') {
      options.excludedNeedsImpl = true;
    } else if (arg === '--no-impl' || arg === '--no-implementation') {
      options.excludedNeedsImpl = false;
    } else if (arg.startsWith('--rule=') || arg.startsWith('--check-rule=')) {
      options.checkRule = arg.split('=')[1];
    } else if (arg === '--rule' || arg === '--check-rule') {
      // Handle space-separated format: --rule 1.06.01
      if (i + 1 < args.length) {
        options.checkRule = args[i + 1];
        i++; // Skip next argument as it's the rule ID
      }
    } else if (!arg.startsWith('--') && !options.checkRule && !options.listMissing) {
      // If it's not a flag and we don't have a rule ID yet, it might be a rule ID
      // This handles: pnpm get-rule-status 1.06.01 (without --rule flag)
      if (/^\d+(\.\d+)+$/.test(arg)) {
        options.checkRule = arg;
      }
    } else if (arg === '--needs-tests') {
      options.needsTests = true;
    }
  }
  
  const projectRoot = process.cwd();
  const indexPath = path.join(projectRoot, 'src/lib/game/rules/index/rules-index.json');
  
  console.log("🔍 Loading rules index...");
  const fullRulesIndex = loadRulesIndex(indexPath);
  const excludedRuleIds = loadRuleExclusions(projectRoot);
  const excludedRulesWithMetadata = loadRuleExclusionsWithMetadata(projectRoot);

  // Create filtered rules index for coverage calculation
  const rulesIndex: RuleIndex = {
    ...fullRulesIndex,
    rules: fullRulesIndex.rules.filter((r) => !excludedRuleIds.has(r.id)),
  };
  rulesIndex.totalRules = rulesIndex.rules.length;
  
  console.log(`   Found ${fullRulesIndex.totalRules} total rules (${rulesIndex.totalRules} tracked, ${excludedRuleIds.size} excluded)`);

  console.log("🔍 Scanning source files for annotations...");
  const scanResult = await scanAnnotations(['src'], projectRoot);
  const report = calculateCoverage(rulesIndex, scanResult);

  // Handle special modes
  if (options.checkRule) {
    printRuleStatus(options.checkRule, report, scanResult, rulesIndex, excludedRulesWithMetadata);
    process.exit(0);
  }
  
  if (options.needsTests) {
    // List rules that are implemented but have no tests, optionally filtered by prefix.
    // Excluded rules are already filtered out of report.ruleDetails (via rulesIndex filtering).
    const needingTests = report.ruleDetails
      .filter((d) => d.status === 'IMPL_NO_TEST')
      .map((d) => d.id)
      .filter((id) => {
        if (!options.prefix) return true;
        // Prefix matching: "1.02" should match "1.02.xx" but not "1.02" itself
        // So we require the prefix to be followed by a dot (or be the exact match)
        return id.startsWith(options.prefix + '.') || id === options.prefix;
      })
      .sort();

    console.log('\n📚 Rules implemented but missing tests'
      + (options.prefix ? ` (prefix: ${options.prefix})` : '')
      + ':\n');

    if (needingTests.length === 0) {
      console.log('✅ No rules currently in state "implemented but not tested"'
        + (options.prefix ? ` for prefix ${options.prefix}` : '')
        + '.');
    } else {
      needingTests.forEach((id) => {
        const detail = report.ruleDetails.find((d) => d.id === id);
        console.log(
          ` - ${id}  (impl count: ${detail?.implementations ?? 0}, test count: ${detail?.tests ?? 0})`
        );
      });
      console.log(
        `\nTotal: ${needingTests.length} rule(s) implemented but missing tests.`
      );
    }

    process.exit(0);
  }
  
  if (options.listExcluded !== undefined) {
    const count = typeof options.listExcluded === 'number' 
      ? options.listExcluded 
      : options.listExcluded === true 
        ? undefined 
        : undefined;
    printExcludedRules(excludedRulesWithMetadata, fullRulesIndex, {
      needsImplementation: options.excludedNeedsImpl,
      count,
    });
    process.exit(0);
  }
  
  if (options.listMissing !== undefined) {
    const count = typeof options.listMissing === 'number' 
      ? options.listMissing 
      : options.listMissing === true 
        ? 3 
        : 3;
    printMissingRules(report, rulesIndex, count, mode);
    process.exit(0);
  }
  
  printReport(report, scanResult, rulesIndex, mode, excludedRulesWithMetadata, fullRulesIndex, options);
  
  // Check thresholds
  let exitCode = 0;
  if (options.minImpl !== undefined && report.implementationCoverage < options.minImpl) {
    console.error(
      `\n❌ Implementation coverage ${(report.implementationCoverage * 100).toFixed(1)}% is below threshold ${(options.minImpl * 100).toFixed(1)}%`
    );
    exitCode = 1;
  }
  if (options.minTest !== undefined && report.testCoverage < options.minTest) {
    console.error(
      `\n❌ Test coverage ${(report.testCoverage * 100).toFixed(1)}% is below threshold ${(options.minTest * 100).toFixed(1)}%`
    );
    exitCode = 1;
  }
  
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(console.error);
}

export { calculateCoverage, printReport, type CoverageReport };

