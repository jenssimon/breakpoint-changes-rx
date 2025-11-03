// eslint-disable-next-line import-x/no-extraneous-dependencies
import { defineConfig } from 'vitest/config'


export default defineConfig({
  test: {
    coverage: {
      include: ['src/**'],
    },
  },
})
