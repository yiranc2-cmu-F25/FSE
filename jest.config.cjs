// export default {
//     clearMocks: true,
//     testEnvironment: "node",
//     transform: {},
//     coverageDirectory: "coverage",
//     testMatch: ["**/tests/**/*.js"],
// };
// jest.config.cjs
module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.js",
    "dacs/**/*.js",
    "daos/**/*.js",
    "!**/node_modules/**",
    "!**/*.test.js",
  ],
  // include json-summary so the job-summary step can read coverage-summary.json
  coverageReporters: ["text", "text-summary", "lcov", "html", "json-summary"],
};
