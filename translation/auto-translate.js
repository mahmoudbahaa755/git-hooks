/* 
  This script:
    1. Scans .ts / .tsx files in /app for calls to t("<key>").
    2. Compares those keys with en.json (base language) & ar.json (compare language).
    3. Adds missing keys to each file & optionally auto-translates them via Google GenAI.
*/

const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
	console.error("API key not found. Please set the GOOGLE_AI_API_KEY environment variable.");
	process.exit(1);
}

// Initialize Google AI
const genAI = new GoogleGenerativeAI(apiKey);

// Configuration
const localesDir = path.join("./", "messages");
const baseLanguage = "en";
const compareLanguage = "ar";
const baseFilePath = path.join(localesDir, `${baseLanguage}.json`);
const compareFilePath = path.join(localesDir, `${compareLanguage}.json`);
const appDir = path.join("./", "components");

// Translation settings
const TRANSLATION_SETTINGS = {
	maxRetries: 3,
	baseDelay: 1000, // 1 second base delay
	requestDelay: 1000, // 1 second between requests
};

// ----------------------------------
// Utility functions
// ----------------------------------

function getAllTranslationKeysFromApp(dir, allKeys = new Set()) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			getAllTranslationKeysFromApp(fullPath, allKeys);
		} else if (/\.(tsx|ts)$/i.test(entry.name)) {
			const content = fs.readFileSync(fullPath, "utf-8");
			const regex = /t\s*\(\s*["']([^"']+)["']\s*\)/g;
			let match;
			while ((match = regex.exec(content)) !== null) {
				allKeys.add(match[1].trim());
			}
		}
	}
	return allKeys;
}

function getKeys(obj, prefix = "") {
	return Object.entries(obj).reduce((keys, [key, value]) => {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "object" && value !== null) {
			keys.push(...getKeys(value, fullKey));
		} else {
			keys.push(fullKey);
		}
		return keys;
	}, []);
}

function getNestedValue(obj, keyPath) {
	const keys = keyPath.split(".");
	let current = obj;
	for (const key of keys) {
		if (!current[key]) return undefined;
		current = current[key];
	}
	return current;
}

function setNestedValue(obj, keyPath, value) {
	const keys = keyPath.split(".");
	let current = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (!current[k] || typeof current[k] !== "object") {
			current[k] = {};
		}
		current = current[k];
	}
	current[keys[keys.length - 1]] = value;
}

async function translateText(text, sourceLang, targetLang) {
	let attempt = 0;

	while (attempt < TRANSLATION_SETTINGS.maxRetries) {
		try {
			const model = genAI.getGenerativeModel({ model: "gemini-pro" });
			const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only respond with the translated text, nothing else.note text is from backend be careful Text: ${text}`;
			const result = await model.generateContent(prompt);
			const response = await result.response;
			return response.text();
		} catch (error) {
			if (error.status === 429 && attempt < TRANSLATION_SETTINGS.maxRetries - 1) {
				const delay = Math.min(
					TRANSLATION_SETTINGS.baseDelay * 2 ** attempt + Math.random() * 500,
					10000
				);

				console.log(`Rate limited. Retrying in ${Math.round(delay / 1000)}s...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				attempt++;
			} else {
				console.error(`Translation failed after ${attempt + 1} attempts:`, error.message);
				return null;
			}
		}
	}
	return null;
}

// ----------------------------------
// Main
// ----------------------------------
(async () => {
	let hasErrors = false;

	try {
		if (!fs.existsSync(baseFilePath) || !fs.existsSync(compareFilePath)) {
			console.error("Language files not found! Make sure en.json & ar.json exist.");
			process.exit(1);
		}

		const enObj = JSON.parse(fs.readFileSync(baseFilePath, "utf-8"));
		const arObj = JSON.parse(fs.readFileSync(compareFilePath, "utf-8"));

		// Collect and process keys
		const codeKeysSet = getAllTranslationKeysFromApp(appDir);
		const enKeys = getKeys(enObj);

		// Add missing keys to en.json with generated values
		const missingInEnFromCode = [...codeKeysSet].filter((key) => !enKeys.includes(key));
		missingInEnFromCode.forEach((key) => {
			const defaultValue = key
				.split(".")
				.map((part) => part.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
				.join(" ");
			setNestedValue(enObj, key, defaultValue);
		});

		// Update keys after modifications
		const updatedEnKeys = getKeys(enObj);
		const arKeys = getKeys(arObj);

		// Find missing translations
		const missingInAr = updatedEnKeys.filter((key) => !arKeys.includes(key));
		const missingInEn = arKeys.filter((key) => !updatedEnKeys.includes(key));

		// Translate missing keys in Arabic
		if (missingInAr.length > 0) {
			console.log(`\nTranslating ${missingInAr.length} missing keys to ${compareLanguage}:`);
			for (const [index, key] of missingInAr.entries()) {
				if (index > 0) {
					await new Promise((resolve) => setTimeout(resolve, TRANSLATION_SETTINGS.requestDelay));
				}

				const sourceValue = getNestedValue(enObj, key);
				if (typeof sourceValue !== "string" || sourceValue.trim() === "") {
					console.error(`Skipping ${key} — value is not a non-empty string.`);
					continue;
				}

				const translated = await translateText(sourceValue, baseLanguage, compareLanguage);
				if (translated) {
					setNestedValue(arObj, key, translated);
					console.log(`✓ ${key}: ${translated}`);
				} else {
					hasErrors = true;
					setNestedValue(arObj, key, "[translation failed]");
					console.error(`✗ Failed to translate: ${key}`);
				}
			}
		}

		// Translate missing keys in English
		if (missingInEn.length > 0) {
			console.log(`\nTranslating ${missingInEn.length} missing keys to ${baseLanguage}:`);
			for (const [index, key] of missingInEn.entries()) {
				if (index > 0) {
					await new Promise((resolve) => setTimeout(resolve, TRANSLATION_SETTINGS.requestDelay));
				}

				const sourceValue = getNestedValue(arObj, key);
				if (!sourceValue) {
					console.error(`Skipping ${key} - source value not found`);
					continue;
				}

				const translated = await translateText(sourceValue, compareLanguage, baseLanguage);
				if (translated) {
					setNestedValue(enObj, key, translated);
					console.log(`✓ ${key}: ${translated}`);
				} else {
					hasErrors = true;
					setNestedValue(enObj, key, "[translation failed]");
					console.error(`✗ Failed to translate: ${key}`);
				}
			}
		}
		fs.writeFileSync(baseFilePath, JSON.stringify(enObj, null, 2));
		fs.writeFileSync(compareFilePath, JSON.stringify(arObj, null, 2));

		// Final status
		const success = !hasErrors && missingInAr.length === 0 && missingInEn.length === 0;
		if (success && missingInEnFromCode.length === 0) {
			console.log("\x1b[32m%s\x1b[0m", "\nAll translation keys are synchronized.");
		} else if (hasErrors) {
			console.log("\x1b[31m%s\x1b[0m", "\nCompleted with some errors.");
			process.exit(1);
		} else {
			console.log("\x1b[33m%s\x1b[0m", "\nCompleted with missing keys handled.");
		}
		process.exit(0);
	} catch (error) {
		console.error("\x1b[31m%s\x1b[0m", "Fatal Error:", error.message);
		process.exit(1);
	}
})();
