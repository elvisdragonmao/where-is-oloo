import js from "@eslint/js";
import tseslint from "typescript-eslint";

const nodeGlobals = {
	console: "readonly",
	process: "readonly",
	URL: "readonly"
};

export default [
	{
		ignores: ["dist/**", "node_modules/**"]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["scripts/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2022,
			globals: nodeGlobals,
			sourceType: "module"
		}
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module"
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error"
		}
	}
];
