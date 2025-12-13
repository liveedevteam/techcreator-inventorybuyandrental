# Git Pre-commit Hooks & Commit Rules

This document describes the git workflow, pre-commit hooks, and commit message conventions configured in this project.

## Overview

This project uses a combination of tools to ensure code quality and consistent commit messages:

- **Husky** - Git hooks manager
- **lint-staged** - Run linters on staged files only
- **Commitlint** - Validate commit messages against conventional commit format
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting

## Git Hooks

### Pre-commit Hook

**Location:** `.husky/pre-commit`

**What it does:**

- Runs `lint-staged` before each commit
- Automatically fixes linting issues and formats code
- Only processes files that are staged for commit

**Process:**

1. When you run `git commit`, the pre-commit hook triggers
2. `lint-staged` checks which files are staged
3. For each staged file, it runs the appropriate linter/formatter:
   - **TypeScript/JavaScript files** (`*.{js,jsx,ts,tsx}`): Runs `eslint --fix`
   - **Config/Markdown files** (`*.{json,md,yml,yaml}`): Runs `prettier --write`
4. If any issues are found and cannot be auto-fixed, the commit is blocked
5. If all checks pass, the commit proceeds

**Configuration:** `lint-staged.config.js`

```javascript
{
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

### Commit-msg Hook

**Location:** `.husky/commit-msg`

**What it does:**

- Validates commit messages against the Conventional Commits specification
- Blocks commits that don't follow the required format
- Ensures consistent commit history

**Process:**

1. When you write a commit message, the commit-msg hook triggers
2. `commitlint` validates the message format
3. If the message is invalid, the commit is rejected with an error message
4. If valid, the commit proceeds

**Configuration:** `commitlint.config.js`

## Commit Message Rules

This project follows the **Conventional Commits** specification. All commit messages must follow this format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Commit Types

The following commit types are allowed:

| Type       | Description                                       | Example                                 |
| ---------- | ------------------------------------------------- | --------------------------------------- |
| `feat`     | A new feature                                     | `feat: add user authentication`         |
| `fix`      | A bug fix                                         | `fix: resolve login redirect issue`     |
| `docs`     | Documentation changes                             | `docs: update API documentation`        |
| `style`    | Code style changes (formatting, semicolons, etc.) | `style: format code with prettier`      |
| `refactor` | Code refactoring (no new features or bug fixes)   | `refactor: simplify user service`       |
| `perf`     | Performance improvements                          | `perf: optimize database queries`       |
| `test`     | Adding or updating tests                          | `test: add unit tests for auth service` |
| `build`    | Build system or external dependencies             | `build: update Next.js to v16`          |
| `ci`       | CI/CD configuration                               | `ci: add GitHub Actions workflow`       |
| `chore`    | Other changes (maintenance tasks)                 | `chore: update dependencies`            |
| `revert`   | Revert a previous commit                          | `revert: revert "feat: add feature X"`  |

### Commit Message Rules

1. **Type is required** - Must be one of the types listed above
2. **Type must be lowercase** - `feat` ✅, `Feat` ❌
3. **Subject is required** - Cannot be empty
4. **Subject case** - Flexible (allows proper nouns and technical terms)
5. **Header max length** - 100 characters (enforced)
6. **Body max line length** - 100 characters (warning only)

### Valid Commit Message Examples

```bash
# Simple feature
feat: add user profile page

# Feature with scope
feat(auth): implement JWT token refresh

# Bug fix
fix: resolve memory leak in data fetching

# Documentation
docs: update installation instructions

# Breaking change (note the !)
feat!: change API response format

# Commit with body
feat: add dark mode support

Implement dark mode toggle with system preference detection.
Add theme persistence using localStorage.

# Commit with footer
fix: resolve login issue

Closes #123
```

### Invalid Commit Message Examples

```bash
# Missing type
add user profile page

# Invalid type
feature: add user profile

# Empty subject
feat:

# Type not lowercase
Feat: add user profile

# Too long header (over 100 characters)
feat: add a very long commit message that exceeds the maximum allowed length of one hundred characters
```

## Code Formatting Rules

### Prettier Configuration

**Location:** `.prettierrc`

The project uses Prettier with the following settings:

- **Semicolons:** Required (`true`)
- **Quotes:** Double quotes (`false` for singleQuote)
- **Tab Width:** 2 spaces
- **Trailing Commas:** ES5 style
- **Print Width:** 100 characters
- **Bracket Spacing:** Enabled
- **Arrow Parens:** Always include
- **End of Line:** LF (Unix-style)

### ESLint Configuration

**Location:** `eslint.config.mjs`

- Uses Next.js ESLint configuration
- Includes TypeScript and Core Web Vitals rules
- Ignores build directories (`.next/`, `out/`, `build/`)

## Setup & Installation

### Initial Setup

When you clone the repository and run `npm install`, Husky will automatically set up git hooks via the `prepare` script:

```json
"prepare": "husky"
```

This script runs automatically after `npm install` and ensures git hooks are properly configured.

### Manual Setup (if needed)

If hooks aren't working, you can manually initialize Husky:

```bash
npm run prepare
```

## Workflow

### Typical Commit Workflow

1. **Make changes** to your code
2. **Stage files** with `git add .` or `git add <file>`
3. **Commit** with `git commit -m "feat: your message"`
   - Pre-commit hook runs automatically:
     - ESLint fixes issues in staged `.ts/.tsx/.js/.jsx` files
     - Prettier formats staged `.json/.md/.yml/.yaml` files
   - Commit-msg hook validates your message
4. **If validation fails**, fix the issues and try again
5. **If validation passes**, commit is successful

### Bypassing Hooks (Not Recommended)

If you need to bypass hooks in an emergency (not recommended for regular use):

```bash
# Skip pre-commit hook
git commit --no-verify -m "feat: your message"

# Skip commit-msg hook
git commit --no-verify -m "feat: your message"
```

⚠️ **Warning:** Only bypass hooks when absolutely necessary. This can lead to inconsistent code quality and commit history.

## Troubleshooting

### Pre-commit Hook Not Running

1. Check if Husky is installed: `npm list husky`
2. Verify hooks exist: `ls .husky/`
3. Reinstall hooks: `npm run prepare`
4. Check git hooks path: `git config core.hooksPath` (should be `.husky`)

### ESLint Errors Blocking Commit

1. Run ESLint manually to see errors: `npm run lint`
2. Fix errors manually or let `eslint --fix` handle auto-fixable issues
3. If errors persist, review ESLint configuration

### Commit Message Rejected

1. Check the error message from commitlint
2. Ensure your commit message follows the format: `<type>: <subject>`
3. Verify the type is one of the allowed types (lowercase)
4. Ensure the subject is not empty
5. Check that the header is under 100 characters

### Prettier Formatting Issues

1. Run Prettier manually: `npx prettier --write .`
2. Check `.prettierrc` configuration
3. Verify files aren't in `.prettierignore`

## Best Practices

1. **Write clear commit messages** - The subject should be concise but descriptive
2. **Use appropriate types** - Choose the type that best describes your change
3. **Keep commits focused** - One logical change per commit
4. **Let hooks do their job** - Don't bypass hooks unless absolutely necessary
5. **Review staged changes** - Use `git diff --staged` before committing
6. **Test before committing** - Ensure your code works before committing

## Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Prettier Documentation](https://prettier.io/docs/en/)
