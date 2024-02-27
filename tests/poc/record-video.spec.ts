import { test } from '@playwright/test';

test.use({ video: 'on' });

test('2xx', async ({ page }) => {
  await page.goto('https://www.olafalders.com');
  await page.getByRole('link', { name: 'About Me' }).nth(0).click();
  await page.getByRole('link', { name: 'Feed' }).click();
  await page.goBack();
  await page.goto('https://example.com');

  const video = await page.video()?.path();
  console.log(`video is at ${video}`);
});
