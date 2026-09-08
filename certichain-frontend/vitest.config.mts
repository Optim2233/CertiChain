import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // resolves the "@/*" -> "./src/*" alias from tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // axioconfig reads NEXT_PUBLIC_API_BASE_URL at module load; pin it so nothing
    // depends on whatever scripts/set-lan-ip.mjs last wrote into .env.local.
    env: { NEXT_PUBLIC_API_BASE_URL: 'http://test.local' },
  },
})
