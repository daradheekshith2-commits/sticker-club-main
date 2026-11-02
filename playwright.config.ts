import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cmd /c "set PORT=5000&& set DATABASE_URL=postgresql://stickerclub:chintu641@localhost:5433/stickerclub?schema=stickerclub_test&& set TEST_DATABASE_IS_DISPOSABLE=yes&& set NODE_ENV=test&& set DELIVERY_FEE=50.00&& set UPI_ID=store@upi&& set FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173&& set JWT_SECRET=e2e_jwt_secret_must_be_at_least_32_chars_long_for_security&& set JWT_REFRESH_SECRET=e2e_jwt_refresh_secret_must_be_at_least_32_chars_long&& node --import tsx backend/src/index.ts"',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
