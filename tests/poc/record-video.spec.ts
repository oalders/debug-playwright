import { test } from '@playwright/test';

test.use({ video: 'on' });

test('2xx', async ({ page }) => {
  await page.goto('https://www.olafalders.com');
  await page.getByRole('link', { name: 'About' }).nth(0).click();
  // The site's feed link is now an RSS link whose accessible name is "RSS feed"
  // (aria-label), not "Feed".
  await page.getByRole('link', { name: 'RSS feed' }).click();
  await page.goBack();
  await page.goto('https://example.com');

  const video = await page.video()?.path();
  console.log(`video is at ${video}`);
});
