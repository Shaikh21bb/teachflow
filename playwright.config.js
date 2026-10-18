import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    timeout: 45000,
    workers: 1,
    use: { baseURL: 'http://127.0.0.1:4173', channel: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
        { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    ],
    webServer: [
        { command: 'node server/tests/browser-server.cjs', url: 'http://127.0.0.1:3101/api/health', reuseExistingServer: false, timeout: 30000 },
        { command: 'VITE_API_URL=/api VITE_API_PROXY=http://127.0.0.1:3101 npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30000 },
    ],
});
