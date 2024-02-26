import { test } from '@playwright/test';

test('2xx', async ({ page }) => {
  await page.goto('https://example.com');
  await page.screenshot({ path: '/tmp/screenshot.png' });
});
