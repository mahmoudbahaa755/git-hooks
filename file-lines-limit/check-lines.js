#!/usr/bin/env node

/**
 * check-lines.js
 * A pre-commit hook script that prevents committing files with more than 250 lines,
 * excluding JSON files.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Maximum allowed lines per file
const MAX_LINES = 250;

// File extensions to exclude
const EXCLUDED_EXTENSIONS = [".json"];

try {
   // Get list of staged files (Added, Copied, Modified)
   const stdout = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
   });
   const files = stdout.split(/\r?\n/).filter(Boolean);

   const errors = [];

   files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (EXCLUDED_EXTENSIONS.includes(ext)) {
         // Skip excluded file types
         return;
      }

      const filePath = path.resolve(process.cwd(), file);
      // Skip if file was deleted or not present
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, "utf-8");
      const lineCount = content.split(/\r?\n/).length;

      if (lineCount > MAX_LINES) {
         errors.push(`${file} has ${lineCount} lines (max ${MAX_LINES})`);
      }
   });

   if (errors.length) {
      console.error("\n⚠️  Commit aborted: the following files exceed the line limit:\n");
      errors.forEach(err => console.error(`  - ${err}`));
      console.error("\nPlease refactor or split these files before committing.");
      process.exit(1);
   }

   process.exit(0);
} catch (err) {
   console.error("Error running line-check script:", err);
   process.exit(1);
}
