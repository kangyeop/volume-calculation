// @ts-check
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    ignores: ['dist', 'vite.config.*', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react': react,
    },
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        browser: true,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true }
      },
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];