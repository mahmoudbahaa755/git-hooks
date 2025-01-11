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

// Function to recursively read all files in a directory
const readFilesRecursively = (dir) => {
	let results = [];
	const list = fs.readdirSync(dir);
	list.forEach((file) => {
		file = path.join(dir, file);
		const stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			results = results.concat(readFilesRecursively(file));
		} else {
			results.push(file);
		}
	});
	return results;
};

// Function to extract translation keys from files
const extractTranslationKeys = (filePath) => {
	const content = fs.readFileSync(filePath, "utf-8");
	const regex = /t\(['"`]([^'"`]+)['"`]\)/g;
	let match;
	const keys = [];
	while ((match = regex.exec(content)) !== null) {
		keys.push(match[1]);
	}
	return keys;
};

// Function to generate an object with missing keys and empty string values
const generateMissingKeysObject = (keys) => {
	return keys.reduce((obj, key) => {
		const keyParts = key.split(".");
		keyParts.reduce((nestedObj, part, index) => {
			if (index === keyParts.length - 1) {
				nestedObj[part] = "";
			} else {
				nestedObj[part] = nestedObj[part] || {};
			}
			return nestedObj[part];
		}, obj);
		return obj;
	}, {});
};

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
	// Read and parse translation files
	const enKeys = getKeys(JSON.parse(fs.readFileSync(baseFilePath, "utf-8")));
	const arKeys = getKeys(
		JSON.parse(fs.readFileSync(compareFilePath, "utf-8")),
	);

	// Read all files in the app directory
	const appDir = path.join(__dirname, translationsConfig.codeBase);
	const files = readFilesRecursively(appDir);

	// Extract translation keys from all files
	const fileKeys = files.reduce((keys, file) => {
		if (file.endsWith(".tsx") || file.endsWith(".ts")) {
			keys.push(...extractTranslationKeys(file));
		}
		return keys;
	}, []);

	// Find missing keys in both directions
	const missingInAr = fileKeys.filter((key) => !arKeys.includes(key));
	const missingInEn = fileKeys.filter((key) => !enKeys.includes(key));

	let hasErrors = false;

	if (missingInAr.length > 0) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			`\nMissing keys in ${compareLanguage}.json:`,
		);
		console.log(missingInAr.join("\n"));
		const missingArObject = generateMissingKeysObject(missingInAr);
		fs.writeFileSync(
			path.join(localesDir, `missing_${compareLanguage}.json`),
			JSON.stringify(missingArObject, null, 2),
		);
		hasErrors = true;
	}

	if (missingInEn.length > 0) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			`\nMissing keys in ${baseLanguage}.json:`,
		);
		console.log(missingInEn.join("\n"));
		const missingEnObject = generateMissingKeysObject(missingInEn);
		fs.writeFileSync(
			path.join(localesDir, `missing_${baseLanguage}.json`),
			JSON.stringify(missingEnObject, null, 2),
		);
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
