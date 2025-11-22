import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
	js.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-var': 'error',
			'arrow-body-style': ['error', 'as-needed'],
			'prefer-const': 'error',
			'prefer-arrow-callback': 'error',
			'prettier/prettier': [
				'error',
				{
					useTabs: true,
					singleQuote: true,
					arrowParens: 'avoid',
					trailingComma: 'all',
				},
			],
		},
	},
]);
