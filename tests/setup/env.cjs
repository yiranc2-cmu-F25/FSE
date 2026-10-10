// Loaded by Jest before every test file (jest.config.cjs -> setupFiles).
// Supplies safe defaults so the suite runs on a fresh clone / CI runner
// without a .env file. Real values from the environment always win.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
