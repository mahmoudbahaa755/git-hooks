const fs = require("fs");
const path = require("path");
const { translationsConfig } = require("./translations.config");

// Update paths for direct json files
const localesDir = path.join(__dirname, translationsConfig.messagesDir);
const baseLanguage = translationsConfig.baseLanguage;
const compareLanguage = translationsConfig.compareLanguage;

// File paths
const baseFilePath = path.join(localesDir, `${baseLanguage}.json`);
const compareFilePath = path.join(localesDir, `${compareLanguage}.json`);

// Function to get nested keys
const getKeys = (obj, prefix = "") =>
	Object.entries(obj).reduce((keys, [key, value]) => {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "object" && value !== null) {
			keys.push(...getKeys(value, fullKey));
		} else {
			keys.push(fullKey);
		}
		return keys;
	}, []);

// Check if files exist
if (!fs.existsSync(baseFilePath)) {
	console.error(`Base language file ${baseFilePath} not found!`);
	process.exit(1);
}

if (!fs.existsSync(compareFilePath)) {
	console.error(`Compare language file ${compareFilePath} not found!`);
	process.exit(1);
}

try {
	// Read and parse files
	const enKeys = getKeys(JSON.parse(fs.readFileSync(baseFilePath, "utf-8")));
	const arKeys = getKeys(
		JSON.parse(fs.readFileSync(compareFilePath, "utf-8")),
	);

	// Find missing keys in both directions
	const missingInAr = enKeys.filter((key) => !arKeys.includes(key));
	const missingInEn = arKeys.filter((key) => !enKeys.includes(key));

	let hasErrors = false;

	if (missingInAr.length > 0) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			`\nMissing keys in ${compareLanguage}.json:`,
		);
		console.log(missingInAr.join("\n"));
		hasErrors = true;
	}

	if (missingInEn.length > 0) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			`\nMissing keys in ${baseLanguage}.json:`,
		);
		console.log(missingInEn.join("\n"));
		hasErrors = true;
	}

	if (!hasErrors) {
		console.log(
			"\x1b[32m%s\x1b[0m",
			"\nAll translation keys are present in both files",
		);
		process.exit(0);
	} else {
		process.exit(1);
	}
} catch (error) {
	console.error(
		"\x1b[31m%s\x1b[0m",
		"Error processing translation files:",
		error.message,
	);
	process.exit(1);
}
