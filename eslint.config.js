import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
      "no-undef": "error",
    },
    ignores: [
      "node_modules/",
      "coverage/",
      "public/css/output.css",
      "f25-fse-sa2/coverage/**",
      "coverage/lcov-report/**",
      "dist/",
      "build/",
    ],
  },
  {
    files: ["**/*.test.mjs"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
