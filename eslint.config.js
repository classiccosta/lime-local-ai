import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import { readdirSync } from 'node:fs';

// Read from disk, so a new feature folder is covered without touching this file.
const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig([
  globalIgnores(['dist', 'src/components/ui/**', 'src/components/assistant-ui/**']),
  {
    files: ['**/*.{js,jsx}'],
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
