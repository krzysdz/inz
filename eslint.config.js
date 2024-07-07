import prettier from "eslint-plugin-prettier";
import globals from "globals";
import js from "@eslint/js";

export default [
	{
		files: ["**/*"],
		ignores: ["static/**/*"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: { prettier },
		rules: {
			...js.configs.recommended.rules,
			"prettier/prettier": "error",
			"no-unused-vars": ["error", { caughtErrors: "none" }],
		},
	},
	{
		files: ["static/**/*"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},
		plugins: { prettier },
		rules: {
			...js.configs.recommended.rules,
			"prettier/prettier": "error",
			"no-unused-vars": ["error", { caughtErrors: "none" }],
		},
	},
];
