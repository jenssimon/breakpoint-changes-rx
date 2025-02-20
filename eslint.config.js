import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tseslint from 'typescript-eslint'
import vitest from '@vitest/eslint-plugin'

import { FlatCompat } from '@eslint/eslintrc'
import { fixupConfigRules } from '@eslint/compat'


// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})


export default tseslint.config(
  {
    ignores: [
      '.yarn/',
      'dist/',
      'coverage/',
    ],
  },

  fixupConfigRules(compat.config({
    extends: [
      '@jenssimon/base',
    ],
    rules: {
      'no-restricted-syntax': 'off',
      'unicorn/expiring-todo-comments': 'off',
    },
  })),

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

  {
    files: ['eslint.config.js'],
    rules: {
      'no-underscore-dangle': 'off',
    },
  },
)
