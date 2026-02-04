import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import { nitro } from 'nitro/vite'

import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/')) {
              if (
                id.includes('/react-query') ||
                id.includes('/query-') ||
                id.includes('/react-router') ||
                id.includes('/router-') ||
                id.includes('/react-start') ||
                id.includes('/start-')
              ) {
                return 'tanstack-core'
              }
              if (id.includes('/react-table') || id.includes('/table-')) {
                return 'tanstack-table'
              }
              if (
                id.includes('/ai-') ||
                id.includes('/react-ai') ||
                id.includes('/ai/')
              ) {
                return 'tanstack-ai'
              }
              return 'tanstack-vendor'
            }
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'react-vendor'
            }
          }
        },
      },
      onwarn(warning, warn) {
        if (
          warning.message.includes('use client') ||
          warning.message.includes('Module level directives') ||
          warning.message.includes('Failed to load the WebAssembly module') ||
          warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
          (warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
            warning.message.includes('@tanstack/router-core'))
        ) {
          return
        }
        warn(warning)
      },
    },
  },
  // For Vite 7 Environment API
  // @ts-ignore
  environments: {
    nitro: {
      build: {
        rollupOptions: {
          onwarn(warning, warn) {
            if (
              warning.message.includes('use client') ||
              warning.message.includes('Module level directives') ||
              warning.message.includes('Failed to load the WebAssembly module') ||
              warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
              (warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
                warning.message.includes('@tanstack/router-core'))
            ) {
              return
            }
            warn(warning)
          },
        },
      },
    },
  },
  plugins: [
    devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url'],
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
})

export default config
