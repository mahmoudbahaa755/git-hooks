import chalk from "chalk";
import { exec, execSync } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Get the list of edited files in the current commit
const getEditedFiles = () => {
	try {
		const output = execSync("git diff --cached --name-only")
			.toString()
			.trim();
		return output.split("\n").filter((file) => file);
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
			`${getTimestamp()} ${chalk.green("✓")} ${chalk.green(
				`[${index + 1}/${totalFiles}]`,
			)} ${file}`,
		);
		return { file, ok: true };
	} catch (error) {
		console.error(
			`${getTimestamp()} ${chalk.red("✗")} ${chalk.red(
				`[${index + 1}/${totalFiles}]`,
			)} ${file}`,
		);
		console.error(chalk.yellow(error.stdout));
		return { file, ok: false };
	}
};

(async () => {
	const results = await Promise.allSettled(
		editedFiles.map((file, index) =>
			checkFile(file, index, editedFiles.length),
		),
	);

	const errorResults = results.filter(
		(res) => res.status === "fulfilled" && res.value.ok === false,
	);

	console.log("\n" + "=".repeat(50) + "\n");
	if (errorResults.length > 0) {
		console.error(
			chalk.red(
				`❌ Spell check failed with ${errorResults.length} file(s) having errors`,
			),
		);
		process.exit(1);
	} else {
		console.log(chalk.green("✅ Spell check passed successfully!"));
	}
})();
