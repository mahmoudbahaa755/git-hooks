### THIS README IS NOT UPDATED BUT CODE IS

### Prerequisites

-Ensure that you have Node.js installed on your machine. you have husky in your project

### Configuration

The `translations.config.ts` file contains the configuration for the translation key checks. You can
specify the directory containing the translation files, the base language, the comparison language,
and the code base directory.

```typescript
// translations.config.ts
export const translationsConfig = {
	messagesDir: "messages", // Directory containing translation files
	baseLanguage: "en", // Base language file name (without extension)
	compareLanguage: "en", // Comparison language file name (without extension)
	codeBase: "app", // Directory containing the code base to scan for translation keys
};
```

to run it add the this to your project auto-translate.js install husky add pre-push in .husky
