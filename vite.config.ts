import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

function resolveBase() {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
  if (process.env.GITHUB_ACTIONS === 'true' && repo) return `/${repo}/`
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [
    vue(),
     AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/docs': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
