import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import solid from 'vite-plugin-solid'
import swc from 'unplugin-swc'

export default defineConfig({
  main: {
    plugins: [
      swc.vite({
        jsc: {
          target: 'es2022',
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      }),
      externalizeDepsPlugin(),
    ],
    resolve: {
      alias: {
        '@gen-adventure/shared': resolve('../shared/src/index.ts')
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          worker: resolve('../sim/src/worker.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [solid()]
  }
})
