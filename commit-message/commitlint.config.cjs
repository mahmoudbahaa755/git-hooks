// commitlint.config.cjs
module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// 'scope-enum': [2, 'always', ['yourscope', 'yourscope']],
		"scope-empty": [1, "always"],
		"type-enum": [
			2,
			"always",
			[
				"feat", // New features (e.g., feat: add login functionality)
				"chore", // Regular maintenance tasks (e.g., chore: update dependencies)
				"improve", // Improvements to existing features (e.g., improve: optimize search)
				"format",
				"refactor", // Code refactoring without changing functionality
				"fix", // Bug fixes (e.g., fix: resolve null pointer in user profile)
				"hotfix", // Critical bug fixes that need immediate deployment
				"docs", // Documentation changes (e.g., docs: update README)
				"package", // Package-related changes (e.g., package: upgrade to React 18)
				"style", // Code style/formatting changes (e.g., style: fix indentation)
				"ci", // CI/CD pipeline changes (e.g., ci: add GitHub Actions)
				"test", // Adding or modifying tests (e.g., test: add unit tests)
				"revert", // Reverting previous commits (e.g., revert: return to v1.2.0)
				"merge", // Merge commits (e.g., merge: combine feature branch)
				"perf", // Performance improvements (e.g., perf: optimize database queries)
				"security", // Security-related changes (e.g., security: update encryption)
				"breaking", // Breaking changes (e.g., breaking: update to Node.js 14)
				"wip", // Work in progress (e.g., wip: update to React 18)
			],
		],
	},
};
