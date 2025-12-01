/**
 * Script to add missing closing </g> tags for parent force slot groups
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  fixedLines.push(line);

  // Check if this is a closing tag for a child group (ends with -1, -2, -3, or -4)
  const isChildClosing = /^\s*<\/g>\s*$/.test(line) && 
    i > 0 && 
    /force-slot-[^"]+-\d+["']>/.test(lines[i - 3] || ""); // Check if previous group was a child

  // Check if next line starts a new parent group (not a child group)
  const nextLine = lines[i + 1];
  const isNextParentGroup = nextLine && 
    /^\s*<g id="force-slot-[^"]+"\s*>/.test(nextLine) &&
    !/force-slot-[^"]+-\d+["']>/.test(nextLine); // Not a child group

  // If we just closed a child group and the next line is a new parent group,
  // we need to close the current parent group
  if (isChildClosing && isNextParentGroup) {
    // Find the parent group by looking backwards for the last parent group opening
    let parentFound = false;
    for (let j = i; j >= 0; j--) {
      const prevLine = lines[j];
      if (/^\s*<g id="force-slot-[^"]+"\s*>/.test(prevLine) && 
          !/force-slot-[^"]+-\d+["']>/.test(prevLine)) {
        // This is a parent group, check if it's already closed
        let closed = false;
        for (let k = j + 1; k <= i; k++) {
          if (/^\s*<\/g>\s*$/.test(lines[k])) {
            // Count opening and closing tags between j and k
            let openCount = 0;
            let closeCount = 0;
            for (let m = j; m <= k; m++) {
              if (/^\s*<g/.test(lines[m])) openCount++;
              if (/^\s*<\/g>/.test(lines[m])) closeCount++;
            }
            if (closeCount >= openCount) {
              closed = true;
              break;
            }
          }
        }
        if (!closed) {
          fixedLines.push("      </g>");
          parentFound = true;
        }
        break;
      }
    }
  }

  i++;
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log("Fixed ForceSlots.tsx closing tags");

