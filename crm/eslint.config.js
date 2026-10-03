import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

/**
 * CRM lint configuration (P1 / WP-1.6).
 *
 * Rules that the legacy code violates widely are set to "warn" so the *total warning count* is
 * the ratchet (`npm run lint` runs with --max-warnings=<baseline>, see package.json and
 * quality-baseline.json). Convert warn -> error as the debt is paid down (P4).
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '*.config.js', '*.config.ts'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn', // error in P4
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'import/no-duplicates': 'warn',

      // Single HTTP client: raw fetch is only allowed in lib/api.ts (override below).
      'no-restricted-globals': [
        'warn',
        { name: 'fetch', message: 'Use the shared API client (src/lib/api.ts), not raw fetch.' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      '@typescript-eslint/no-explicit-any': 'warn', // error in P4
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 12],

      // strictTypeChecked rules that are noisy on legacy code; counted via warnings, not errors.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Legacy debt: these fire as errors on today's code. Counted as warnings (ratchet) until P4.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
      '@typescript-eslint/no-unnecessary-template-expression': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/return-await': 'warn',
      '@typescript-eslint/no-misused-spread': 'warn',
    },
  },

  // The one place raw fetch is legitimate.
  {
    files: ['src/lib/api.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },

  // Tests: size/complexity limits and strict typing are not useful here.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/test/**'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  prettier,
);
