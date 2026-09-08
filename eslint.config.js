// Flat config. Mirrors the rules cosmos enforces (unused-imports, import
// sorting, no-console, no-explicit-any) minus everything Expo/React-Native
// specific. The tanh-tools PostToolUse hook runs this per edited file, so it
// has to stay fast and has to pass on a clean tree.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "node_modules/**", "public/**", "prototype/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            "unused-imports": unusedImports,
            "simple-import-sort": simpleImportSort,
            "react-hooks": reactHooks
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "error",
                {
                    vars: "all",
                    args: "none",
                    ignoreRestSiblings: true,
                    caughtErrors: "all",
                    varsIgnorePattern: "^_"
                }
            ],
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "no-console": ["error", { allow: ["warn", "error"] }],
            ...reactHooks.configs.recommended.rules
        }
    },
    {
        // The build and dev scripts run in a terminal, where printing what they
        // did is the whole point rather than a leftover debug statement.
        files: ["build.ts", "dev-server.ts", "eslint.config.js"],
        rules: { "no-console": "off" }
    }
);
