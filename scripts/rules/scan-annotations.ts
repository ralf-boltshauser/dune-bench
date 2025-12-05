/**
 * Annotation Scanner
 * 
 * Scans TypeScript/JavaScript source files for @rule and @rule-test annotations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface AnnotationLocation {
  file: string;
  line: number;
  snippet: string;
}

interface ScanResult {
  implementedByRule: Record<string, AnnotationLocation[]>;
  testedByRule: Record<string, AnnotationLocation[]>;
}

/**
 * Pattern to match @rule or @rule-test annotations
 * Supports:
 * - @rule 1.01.01
 * - @rule 1.01.01, 1.01.02
 * - @rule-test 2.04.21
 * - Multiple rules separated by commas
 */
const ANNOTATION_PATTERN = /@(rule|rule-test)\s+([\d.]+(?:\s*,\s*[\d.]+)*)/g;

/**
 * Extract rule IDs from an annotation match
 */
function parseRuleIds(ruleString: string): string[] {
  return ruleString
    .split(',')
    .map(r => r.trim())
    .filter(r => r.length > 0);
}

/**
 * Scan a single file for annotations
 */
function scanFile(filePath: string, projectRoot: string): {
  implementations: Array<{ ruleId: string; location: AnnotationLocation }>;
  tests: Array<{ ruleId: string; location: AnnotationLocation }>;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const implementations: Array<{ ruleId: string; location: AnnotationLocation }> = [];
  const tests: Array<{ ruleId: string; location: AnnotationLocation }> = [];
  
  lines.forEach((line, index) => {
    const matches = line.matchAll(ANNOTATION_PATTERN);
    
    for (const match of matches) {
      const type = match[1]; // 'rule' or 'rule-test'
      const ruleIds = parseRuleIds(match[2]);
      const relativePath = path.relative(projectRoot, filePath);
      const snippet = line.trim().substring(0, 120); // First 120 chars
      
      const location: AnnotationLocation = {
        file: relativePath,
        line: index + 1,
        snippet,
      };
      
      ruleIds.forEach(ruleId => {
        if (type === 'rule') {
          implementations.push({ ruleId, location });
        } else if (type === 'rule-test') {
          tests.push({ ruleId, location });
        }
      });
    }
  });
  
  return { implementations, tests };
}

/**
 * Scan all source files for annotations
 */
async function scanSourceFiles(
  sourceDirs: string[],
  projectRoot: string
): Promise<ScanResult> {
  const implementedByRule: Record<string, AnnotationLocation[]> = {};
  const testedByRule: Record<string, AnnotationLocation[]> = {};
  
  // Find all TypeScript/JavaScript files
  const patterns = sourceDirs.map(dir => `${dir}/**/*.{ts,tsx,js,jsx}`);
  const allFiles: string[] = [];
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/*.d.ts',
      ],
    });
    allFiles.push(...files);
  }
  
  // Deduplicate
  const uniqueFiles = Array.from(new Set(allFiles));
  
  console.log(`📂 Scanning ${uniqueFiles.length} source files...`);
  
  for (const file of uniqueFiles) {
    const fullPath = path.join(projectRoot, file);
    const { implementations, tests } = scanFile(fullPath, projectRoot);
    
    implementations.forEach(({ ruleId, location }) => {
      if (!implementedByRule[ruleId]) {
        implementedByRule[ruleId] = [];
      }
      implementedByRule[ruleId].push(location);
    });
    
    tests.forEach(({ ruleId, location }) => {
      if (!testedByRule[ruleId]) {
        testedByRule[ruleId] = [];
      }
      testedByRule[ruleId].push(location);
    });
  }
  
  return { implementedByRule, testedByRule };
}

/**
 * Main scanning function
 */
async function scanAnnotations(
  sourceDirs: string[] = ['src'],
  projectRoot: string = process.cwd()
): Promise<ScanResult> {
  return scanSourceFiles(sourceDirs, projectRoot);
}

if (require.main === module) {
  scanAnnotations(['src'])
    .then(result => {
      const implCount = Object.keys(result.implementedByRule).length;
      const testCount = Object.keys(result.testedByRule).length;
      const totalImplAnnotations = Object.values(result.implementedByRule).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      const totalTestAnnotations = Object.values(result.testedByRule).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      
      console.log(`\n📊 Scan Results:`);
      console.log(`   Rules with @rule annotations: ${implCount}`);
      console.log(`   Total @rule annotations: ${totalImplAnnotations}`);
      console.log(`   Rules with @rule-test annotations: ${testCount}`);
      console.log(`   Total @rule-test annotations: ${totalTestAnnotations}`);
    })
    .catch(console.error);
}

export { scanAnnotations, type ScanResult, type AnnotationLocation };

