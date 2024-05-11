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
    },
    extends: [
      '@jenssimon/base',
      '@jenssimon/typescript',
    ],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      'import/no-unresolved': 'off',
    },
  })),

  {
    files: ['eslint.config.js'],
    rules: {
      'no-underscore-dangle': 'off',
    },
  },
]
