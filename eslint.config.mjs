import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		ignores: [".internal/**", "main.js", "node_modules/**", "tmp/**"],
	},
	...obsidianmd.configs.recommended,
	...tseslint.configs.strictTypeChecked.map((config) => ({
		...config,
		files: ["**/*.ts"],
	})),
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"obsidianmd/ui/sentence-case": ["warn", { brands: ["Hop-Link Viewer"] }],
		},
	},
	{
		files: ["*.mjs"],
		rules: {
			"no-undef": "off",
			"obsidianmd/no-nodejs-modules": "off",
		},
	},
]);
