import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Konfiguracja blokująca zrównoleglenie (wymuszamy 1 wątek)
    // Omijamy błędy TypeScriptu za pomocą rzutowania
    pool: 'forks',
    fileParallelism: false,
    threads: false
  } as any,
})