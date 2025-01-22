const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error(
    "API key not found. Please set the GOOGLE_AI_API_KEY environment variable.",
  );
  process.exit(1);
}

// Initialize Google AI
const genAI = new GoogleGenerativeAI(apiKey);

// Configuration
const localesDir = path.join(__dirname, "messages");
const baseLanguage = "en";
const compareLanguage = "ar";
const baseFilePath = path.join(localesDir, `${baseLanguage}.json`);
const compareFilePath = path.join(localesDir, `${compareLanguage}.json`);

// Helper functions
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

const getNestedValue = (obj, keyPath) => {
  const keys = keyPath.split(".");
  let current = obj;
  for (const key of keys) {
    if (current[key] === undefined) return undefined;
    current = current[key];
  }
  return current;
};

const setNestedValue = (obj, keyPath, value) => {
  const keys = keyPath.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
};

async function translateText(text, sourceLang, targetLang) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only respond with the translated text, nothing else. Text: ${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

(async () => {
  try {
    // Check if files exist
    if (!fs.existsSync(baseFilePath) || !fs.existsSync(compareFilePath)) {
      console.error("Language files not found!");
      process.exit(1);
    }

    // Load translation files
    const enObj = JSON.parse(fs.readFileSync(baseFilePath, "utf-8"));
    const arObj = JSON.parse(fs.readFileSync(compareFilePath, "utf-8"));

    // Get keys from both files
    const enKeys = getKeys(enObj);
    const arKeys = getKeys(arObj);

    // Find missing keys
    const missingInAr = enKeys.filter((key) => !arKeys.includes(key));
    const missingInEn = arKeys.filter((key) => !enKeys.includes(key));

    let hasErrors = false;

    // Translate missing keys in Arabic file
    if (missingInAr.length > 0) {
      console.log(
        `\nTranslating ${missingInAr.length} keys to ${compareLanguage}:`,
      );
      for (const key of missingInAr) {
        const value = getNestedValue(enObj, key);
        if (!value) {
          console.error(`Skipping ${key} - source value not found`);
          continue;
        }

        const translated = await translateText(
          value,
          baseLanguage,
          compareLanguage,
        );
        if (translated) {
          setNestedValue(arObj, key, translated);
          console.log(`✓ ${key}: ${translated}`);
        } else {
          hasErrors = true;
          console.error(`✗ Failed to translate: ${key}`);
        }
      }
      fs.writeFileSync(compareFilePath, JSON.stringify(arObj, null, 2));
    }

    // Translate missing keys in English file
    if (missingInEn.length > 0) {
      console.log(
        `\nTranslating ${missingInEn.length} keys to ${baseLanguage}:`,
      );
      for (const key of missingInEn) {
        const value = getNestedValue(arObj, key);
        if (!value) {
          console.error(`Skipping ${key} - source value not found`);
          continue;
        }

        const translated = await translateText(
          value,
          compareLanguage,
          baseLanguage,
        );
        if (translated) {
          setNestedValue(enObj, key, translated);
          console.log(`✓ ${key}: ${translated}`);
        } else {
          hasErrors = true;
          console.error(`✗ Failed to translate: ${key}`);
        }
      }
      fs.writeFileSync(baseFilePath, JSON.stringify(enObj, null, 2));
    }

    // Final status
    if (!hasErrors && !missingInAr.length && !missingInEn.length) {
      console.log(
        "\x1b[32m%s\x1b[0m",
        "\nAll translation keys are synchronized",
      );
      process.exit(0);
    } else if (hasErrors) {
      console.log("\x1b[31m%s\x1b[0m", "\nCompleted with some errors");
      process.exit(1);
    } else {
      console.log(
        "\x1b[32m%s\x1b[0m",
        "\nMissing keys were successfully translated and added",
      );
      process.exit(0);
    }
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Error:", error.message);
    process.exit(1);
  }
})();
