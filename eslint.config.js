import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // Global ignores (an object with only `ignores` applies to every config).
  {
    ignores: [
      "node_modules/",
      "coverage/",
      "dist/",
      "build/",
      "public/css/output.css",
      "sigridci/",
      "sigrid-ci-output/",
    ],
  },
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
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  // Must be last: disables formatting rules that would conflict with Prettier.
  eslintConfigPrettier,
];
