import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests', testMatch: 'e2e.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3101', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:3101/api/health', reuseExistingServer: false, env: { PORT: '3101', AI_PROVIDER: 'demo', AI_API_KEY: '', OFFICE_DB_PATH: '.data/e2e.sqlite' } },
});
