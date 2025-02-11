/* eslint-disable no-console */
import chalk from "chalk";
import { exec, execSync } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Configure ignore patterns (can be expanded as needed)
const ignorePatterns = [/package\.json$/i, /package-lock\.json$/i];

/**
 * Returns an array of edited file names that are not deleted.
 * Uses "git diff --cached --name-status" to filter out deleted files.
 */
const getEditedFiles = () => {
  try {
    // Get status and names of staged files
    const output = execSync("git diff --cached --name-status").toString().trim();
    const files = output
      .split("\n")
      .map(line => {
        const [status, filename] = line.split(/\s+/);
        // Only include files that are not deleted (status code "D")
        return status === "D" ? null : filename;
      })
      .filter(file => file); // Remove null or empty values

    // Filter out files matching the ignore patterns
    return files.filter(file => !ignorePatterns.some(pattern => pattern.test(file)));
  } catch (error) {
    console.error(chalk.red("⚠️ Error getting edited files:"), error);
    process.exit(1);
  }
};

// Add timestamp to logs
const getTimestamp = () => chalk.gray(`[${new Date().toLocaleTimeString()}]`);

console.log(chalk.cyan("\n🔍 Starting spell check...\n"));

const editedFiles = getEditedFiles();

if (editedFiles.length === 0) {
  console.log(chalk.yellow("ℹ️ No edited files to check."));
  process.exit(0);
}

console.log(chalk.cyan(`📝 Checking ${editedFiles.length} file(s)...\n`));

// Process all files concurrently
const checkFile = async (file, index, totalFiles) => {
  try {
    await execPromise(`npx cspell --no-progress --no-summary "${file}"`);
    console.log(
      `${getTimestamp()} ${chalk.green("✓")} ${chalk.green(`[${index + 1}/${totalFiles}]`)} ${file}`
    );
    return { file, ok: true };
  } catch (error) {
    console.error(
      `${getTimestamp()} ${chalk.red("✗")} ${chalk.red(`[${index + 1}/${totalFiles}]`)} ${file}`
    );
    console.error(chalk.yellow(error.stdout || error.message));
    return { file, ok: false };
  }
};

(async () => {
  const results = await Promise.allSettled(
    editedFiles.map((file, index) => checkFile(file, index, editedFiles.length))
  );

  const errorResults = results.filter(res => res.status === "fulfilled" && res.value.ok === false);

  console.log("\n" + "=".repeat(50) + "\n");
  if (errorResults.length > 0) {
    console.error(
      chalk.red(`❌ Spell check failed with ${errorResults.length} file(s) having errors`)
    );
    process.exit(1);
  } else {
    console.log(chalk.green("✅ Spell check passed successfully!"));
  }
})();
