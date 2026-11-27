import comments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import { readdirSync } from 'node:fs';

// Read from disk, so a new feature folder is covered without touching this file.
const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig([
  globalIgnores(['dist', 'src/components/ui/**', 'src/components/assistant-ui/**']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // Replaced at build time by Vite's define, from package.json.
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  { files: ['scripts/**'], languageOptions: { globals: globals.node } },
  // Not type-aware: `npm run typecheck` covers types. This also turns off the core
  // rules TypeScript makes redundant, such as no-undef.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: {
      // Stated here so a preset update can't loosen them (ADR-013).
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@eslint-community/eslint-comments': comments,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: ['eslint-enable'] },
      ],
      // The typescript-eslint copy of the rule: the folder rules below set the core
      // one, and a second setting of the same rule would replace this one.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)llm(\\.[jt]s)?$|^@huggingface/transformers(/|$)',
              allowTypeImports: true,
              message:
                'Use await import() or import type: the WebGPU runtime stays lazy (ADR-005).',
            },
          ],
        },
      ],
    },
  },
  // The one module that is the lazy chunk.
  {
    files: ['src/services/llm.{js,ts}'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
  // The dependency rule (CLAUDE.md): a feature may use state/, services/, lib/
  // and components/, never another feature; state/ and services/ use no feature.
  // Relative paths that climb out of a feature are refused too, so the rule
  // can't be dodged by writing '../../models/…' instead of '@/features/models/…'.
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', `!@/features/${feature}`, `!@/features/${feature}/**`],
              message: 'Features must not import each other (CLAUDE.md, dependency rule).',
            },
            {
              group: ['../../*'],
              message:
                'Import across folders with the @/ alias, not by climbing out of the feature.',
            },
          ],
        },
      ],
    },
  })),
  {
    files: ['src/state/**', 'src/services/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '**/features/*'],
              message: 'state/ and services/ never import features/ (CLAUDE.md, dependency rule).',
            },
          ],
        },
      ],
    },
  },
]);
