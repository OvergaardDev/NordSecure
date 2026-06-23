import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const thisFile = fileURLToPath(import.meta.url)
const thisDir = dirname(thisFile)

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup-env.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(thisDir, '.'),
    },
  },
})