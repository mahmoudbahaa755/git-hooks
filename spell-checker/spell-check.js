const { execSync } = require("child_process");
const fs = require("fs");

// Get the list of edited files in the current commit
const getEditedFiles = () => {
	try {
		const output = execSync("git diff --cached --name-only")
			.toString()
			.trim();
		return output.split("\n").filter((file) => file);
	} catch (error) {
		console.error("Error getting edited files:", error);
		process.exit(1);
	}
};

const editedFiles = getEditedFiles();

if (editedFiles.length === 0) {
	console.log("No edited files to check.");
	process.exit(0);
}

let spellCheckPassed = true;

editedFiles.forEach((file) => {
	try {
		execSync(`npx cspell --no-progress --no-summary ${file}`);
		console.log(`Spell check passed for ${file}`);
	} catch (error) {
		console.error(`Spell check failed for ${file}`);
		console.error(error.stdout.toString());
		spellCheckPassed = false;
	}
});

if (!spellCheckPassed) {
	process.exit(1);
}

// how to activate spell-check.js
// 1. npm install cspell
// 2. npm install --save-dev husky
// 3. npm install --save-dev lint-staged
// in .husky/pre-commit
// #!/bin/sh
// . "$(dirname "$0")/_/husky.sh"
// npx lint-staged
//node spell-check.js "$1"
