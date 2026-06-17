import js from "@eslint/js";
import tseslint from "typescript-eslint";

const nodeGlobals = {
	console: "readonly",
	process: "readonly",
	URL: "readonly"
};

const browserGlobals = {
	document: "readonly",
	ResizeObserver: "readonly",
	window: "readonly"
};

export default [
	{
		ignores: ["**/dist/**", "node_modules/**"]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["apps/crawler/scripts/**/*.mjs", "apps/report/scripts/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2022,
			globals: nodeGlobals,
			sourceType: "module"
		}
	},
	{
		files: ["apps/crawler/src/**/*.ts"],
		languageOptions: {
			ecmaVersion: 2022,
			globals: nodeGlobals,
			sourceType: "module"
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error"
		}
	},
	{
		files: ["apps/report/src/**/*.ts"],
		languageOptions: {
			ecmaVersion: 2022,
			globals: browserGlobals,
			sourceType: "module"
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error"
		}
	},
	{
		files: ["apps/report/vite.config.ts"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module"
		}
	}
];
