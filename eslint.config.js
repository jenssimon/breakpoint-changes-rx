import { defineConfig } from 'eslint/config'
import { configs } from '@jenssimon/eslint-config-base'
import tseslint from 'typescript-eslint'
import vitest from '@vitest/eslint-plugin'


export default defineConfig(
  {
    ignores: [
      '.yarn/',
      'dist/',
      'coverage/',
    ],
  },

  configs.base,

  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '*.js',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    files: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__mocks__/**',
    ],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
)
