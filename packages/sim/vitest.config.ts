import { resolve } from 'path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // tsyringe constructor injection needs `design:paramtypes` decorator metadata,
    // which vitest's default esbuild transform does not emit. swc does.
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: {
    // Mirror the tsconfig path alias. Relative `../../shared/src` imports in sim
    // source resolve on their own.
    alias: { '@gen-adventure/shared': resolve(__dirname, '../shared/src/index.ts') },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
})
