// Flat config. Mirrors the rules cosmos enforces (unused-imports, import
// sorting, no-console, no-explicit-any) minus everything Expo/React-Native
// specific. The tanh-tools PostToolUse hook runs this per edited file, so it
// has to stay fast and has to pass on a clean tree.
import js from "@eslint/js";
// Maintained fork: same rules as eslint-plugin-jsx-a11y, with an ESLint 10
// peer range. Upstream 6.10.2 still declares eslint ^3–^9 only.
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "public/**",
            "prototype/**",
            // Design references / prototypes, not part of the shipped site.
            "reference*/**"
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ...jsxA11y.configs.recommended,
        files: ["**/*.{ts,tsx}"],
        rules: {
            ...jsxA11y.configs.recommended.rules,
            // Not in recommended, but catches aria-hidden on buttons/links —
            // an easy way to remove interactive controls from the a11y tree.
            "jsx-a11y-x/no-aria-hidden-on-focusable": "error"
        }
    },
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
        // The build, dev and asset scripts run in a terminal, where printing
        // what they did is the whole point rather than a leftover debug
        // statement.
        files: ["build.ts", "dev-server.ts", "eslint.config.js", "tools/*.ts"],
        rules: { "no-console": "off" }
    }
);
