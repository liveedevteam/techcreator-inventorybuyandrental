/** @type {import('lint-staged').Config} */
module.exports = {
  // Lint & format TypeScript and JavaScript files
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  // Format JSON, MD, and config files
  "*.{json,md,yml,yaml}": ["prettier --write"],
};

