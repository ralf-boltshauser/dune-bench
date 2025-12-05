/**
 * Rule Indexer
 * 
 * Extracts rule numbers from markdown rule files and creates a normalized index.
 * Scans numbered_rules/*.md for rule patterns.
 */

import * as fs from 'fs';
import * as path from 'path';

interface RuleEntry {
  id: string;
  sources: Array<{
    file: string;
    line: number;
    context: string;
  }>;
}

/**
 * Rule ID pattern: matches numbers like 1.01, 1.06.03, 2.04.21, 3.01.11.01
 * Must start with a digit, have at least one dot, and end with digits
 * In numbered_rules files, rules start at the beginning of a line: "^X.XX.XX"
 */
const RULE_ID_PATTERN = /^(\d+(?:\.\d+)+)\s/;

/**
 * Extract rule ID from a line (if it starts with a rule number)
 * Returns the rule ID or null if the line doesn't start with a rule number
 */
function extractRuleIdFromLine(line: string): string | null {
  const match = line.match(RULE_ID_PATTERN);
  if (!match) {
    return null;
  }
  
    const ruleId = match[1];
  // Validate rule ID format
    const parts = ruleId.split('.');
    if (parts.length >= 2 && parts.length <= 6) {
      // Filter out things that look like years (e.g., 2024, 1.9.9)
      if (parts[0].length <= 2 || (parts[0].length === 4 && parseInt(parts[0]) >= 1900)) {
        // Could be a year, but also could be a rule like "4.01"
        if (parts[0].length === 4 && parseInt(parts[0]) >= 1900) {
        return null; // Skip years
      }
    }
    return ruleId;
  }
  
  return null;
}

/**
 * Extract rule IDs from a markdown file with line context
 * Only extracts rules that start at the beginning of a line (numbered_rules format)
 */
function extractRulesFromFile(filePath: string): Map<string, Array<{ line: number; context: string }>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rules = new Map<string, Array<{ line: number; context: string }>>();
  
  lines.forEach((line, index) => {
    const ruleId = extractRuleIdFromLine(line);
    if (ruleId) {
    const context = line.trim().substring(0, 100); // First 100 chars for context
    
      if (!rules.has(ruleId)) {
        rules.set(ruleId, []);
      }
      rules.get(ruleId)!.push({
        line: index + 1,
        context,
      });
    }
  });
  
  return rules;
}

/**
 * Get all markdown files in a directory
 */
function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Main extraction function
 * Only extracts from numbered_rules/*.md files
 */
function extractAllRules(): Record<string, RuleEntry> {
  const rulesIndex: Record<string, RuleEntry> = {};
  const projectRoot = process.cwd();
  
  // Source: numbered_rules/*.md
  const numberedRulesDir = path.join(projectRoot, 'numbered_rules');
  const numberedRuleFiles = getMarkdownFiles(numberedRulesDir);
  
  if (numberedRuleFiles.length === 0) {
    console.warn(`⚠️  No markdown files found in ${numberedRulesDir}`);
    return rulesIndex;
  }
  
  for (const file of numberedRuleFiles) {
    const rules = extractRulesFromFile(file);
    const relativePath = path.relative(projectRoot, file);
    
    rules.forEach((occurrences, ruleId) => {
      if (!rulesIndex[ruleId]) {
        rulesIndex[ruleId] = {
          id: ruleId,
          sources: [],
        };
      }
      
      occurrences.forEach(occ => {
        rulesIndex[ruleId].sources.push({
          file: relativePath,
          line: occ.line,
          context: occ.context,
        });
      });
    });
  }
  
  return rulesIndex;
}

/**
 * Write the rules index to JSON
 */
function writeRulesIndex(index: Record<string, RuleEntry>, outputPath: string): void {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Sort rules by ID for consistent output
  const sortedRules = Object.values(index).sort((a, b) => {
    const aParts = a.id.split('.').map(Number);
    const bParts = b.id.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] ?? 0;
      const bVal = bParts[i] ?? 0;
      if (aVal !== bVal) {
        return aVal - bVal;
      }
    }
    return 0;
  });
  
  const output = {
    generatedAt: new Date().toISOString(),
    totalRules: sortedRules.length,
    rules: sortedRules,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Main entry point
 */
function main() {
  const projectRoot = process.cwd();
  const outputPath = path.join(projectRoot, 'src/lib/game/rules/index/rules-index.json');
  
  console.log('🔍 Extracting rules from markdown files...');
  const index = extractAllRules();
  
  console.log(`📋 Found ${Object.keys(index).length} unique rule IDs`);
  
  console.log(`💾 Writing index to ${path.relative(projectRoot, outputPath)}...`);
  writeRulesIndex(index, outputPath);
  
  console.log('✅ Rules index generated successfully');
}

if (require.main === module) {
  main();
}

export { extractAllRules, writeRulesIndex, type RuleEntry };

