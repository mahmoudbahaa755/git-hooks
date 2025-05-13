# File Lines Limiter Hook

A Git pre-commit hook that prevents committing files that exceed a specified number of lines. This hook helps maintain code quality by encouraging smaller, more manageable files.

## Features

- Prevents committing files with more than 250 lines (configurable)
- Excludes specified file types (e.g., JSON files)
- Provides clear error messages with line count information

## Installation

1. Copy the `check-lines.js` script to your Git hooks directory:

   ```bash
   cp check-lines.js /path/to/your/repo/.git/hooks/pre-commit
   chmod +x /path/to/your/repo/.git/hooks/pre-commit
   ```

2. Alternatively, when using [Husky](https://github.com/typicode/husky), add this to your package.json:

   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "node ./path/to/check-lines.js"
       }
     }
   }
   ```

## Configuration

Edit the script to modify the following parameters:

- `MAX_LINES`: Maximum number of lines allowed per file (default: 250)
- `EXCLUDED_EXTENSIONS`: File extensions to exclude from check (default: [".json"])

## Usage

Once installed, the hook will run automatically on every commit. If any files exceed the line limit, the commit will be aborted with a descriptive error message.

### Example output

```
⚠️  Commit aborted: the following files exceed the line limit:

  - src/components/LargeComponent.js has 312 lines (max 250)
  - src/utils/helpers.js has 287 lines (max 250)

Please refactor or split these files before committing.
```

## Troubleshooting

- If you need to bypass this check temporarily, use the `--no-verify` flag with git commit.
- Make sure the script has executable permissions (`chmod +x check-lines.js`).

## License

MIT
