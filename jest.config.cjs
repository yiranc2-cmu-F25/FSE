module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  // Runs before each test file so `npm test` works on a fresh clone without a .env file.
  setupFiles: ["<rootDir>/tests/setup/env.cjs"],
  collectCoverage: true,
  collectCoverageFrom: [
    "constants/**/*.js",
    "controllers/**/*.js",
    "data/**/*.js",
    "db/**/*.js",
    "dacs/**/*.js",
    "daos/**/*.js",
    "entities/**/*.js",
    "middleware/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "utils/**/*.js",
    "!**/node_modules/**",
    "!**/*.test.js",
  ],
  // json-summary is read by the CI job-summary step (see .github/workflows/ci.yml).
  coverageReporters: ["text", "text-summary", "lcov", "html", "json-summary"],
};
