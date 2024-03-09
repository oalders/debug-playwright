import { test } from '@playwright/test';
import { afterEachHandler } from '../src';

if (process.env.CI !== 'true') {
  test.use({ video: 'on' });
  test.afterEach(afterEachHandler());
}

test('record video', async ({ page }) => {
  if (process.env.CI === 'true') {
    test.skip();
  }
  await page.goto('https://www.olafalders.com');
  await page.getByRole('link', { name: 'About' }).nth(0).click();
  await page.getByRole('link', { name: 'Feed' }).click();
  await page.goBack();
  await page.goto('https://example.com');
});
