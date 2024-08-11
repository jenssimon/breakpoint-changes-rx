import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FlatCompat } from '@eslint/eslintrc'
import { fixupConfigRules } from '@eslint/compat'


// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})


export default [
  {
    ignores: [
      '.yarn/',
      'dist/',
      'coverage/',
    ],
  },

  ...fixupConfigRules(compat.config({
    parserOptions: {
      project: './tsconfig.json',
      ecmaVersion: 2020,
    },
    extends: [
      '@jenssimon/base',
    ],
    rules: {
      'import/no-unresolved': 'off',
    },
    overrides: [
      {
        files: ['**/*.ts'],
        extends: [
          '@jenssimon/typescript',
        ],
        rules: {
          '@typescript-eslint/naming-convention': 'off',
        },
      },
    ],
  })),

  {
    files: ['eslint.config.js'],
    rules: {
      'no-underscore-dangle': 'off',
    },
  },
]
