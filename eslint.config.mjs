import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['worker-configuration.d.ts'],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/max-len': ['error', { code: 120 }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      'no-nested-ternary': 'error',
    },
  },
]);
