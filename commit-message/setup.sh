#!/bin/bash

# Install @commitlint/cli and @commitlint/config-conventional
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create commitlint.config.cjs if it doesn't exist
if [ ! -f commitlint.config.cjs ]; then
  cat <<EOL > commitlint.config.cjs
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [1, "always"],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "chore",
        "improve",
        "format",
        "refactor",
        "fix",
        "hotfix",
        "docs",
        "package",
        "style",
        "ci",
        "test",
        "revert",
        "merge",
        "perf",
        "security",
        "breaking",
        "wip",
      ],
    ],
  },
};
EOL
fi

echo "Commitlint setup completed."