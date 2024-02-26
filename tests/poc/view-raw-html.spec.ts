import { test } from '@playwright/test';

test('2xx', async ({ page }) => {
  await page.goto('https://example.com');
  console.log(await page.content());
});
