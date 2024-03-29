import { test, expect } from '@playwright/test';
import { DebugPlaywright, afterEachHandler } from '../src';

if (process.env.CI === 'true') {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed') {
      console.log('🍰 Screenshot on error');
      const dp = new DebugPlaywright({ page: page, command: 'image' });
      await dp.printScreenshot();
    }
  });
} else {
  test.afterEach(afterEachHandler());
}

// We want this to fail, because we want to trigger the afterEach hook
test('2xx screenshot on error', async ({ page }) => {
  test.fail();
  const dp = new DebugPlaywright({ page: page });
  if (process.env.CI === 'true') {
    dp.command = 'image';
  }
  await page.goto('https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 400));

  await expect(page).toHaveTitle(/🐮/, { timeout: 10 });
});

test('2xx', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page });
  if (process.env.CI === 'true') {
    dp.command = 'image';
  }
  await page.goto('https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx lynx', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page, screenshots: false });
  dp.formattedContent = true;
  await page.goto('https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 100));

  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx image', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page });
  dp.command = 'image';
  await page.goto('https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(page.getByRole('link', { name: /More information/ })).toBeTruthy();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx JSON', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page, screenshots: false });
  dp.formattedContent = true;

  await page.goto('https://filesamples.com/samples/code/json/sample1.json');

  await expect(page).not.toHaveTitle('title');
});

test('2xx png', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page, screenshots: false });
  dp.formattedContent = true;
  if (process.env.CI === 'true') {
    dp.command = 'image';
  }
  await page.goto('https://vilerichard.com/static/photos/group1.jpg');
  await new Promise((resolve) => setTimeout(resolve, 100));

  await expect(page).not.toHaveTitle('title');
});

test('2xx png image', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page, screenshots: false });
  dp.formattedContent = true;
  dp.command = 'image';
  await page.goto('https://vilerichard.com/static/photos/group1.jpg');
  await new Promise((resolve) => setTimeout(resolve, 100));

  await expect(page).not.toHaveTitle('title');
});

test('4xx', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page });
  dp.formattedContent = true;
  if (process.env.CI === 'true') {
    dp.command = 'image';
  }
  await page.goto('https://example.com/404');
  await new Promise((resolve) => setTimeout(resolve, 500));

  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx screenshot default', async ({ page }) => {
  const dp = new DebugPlaywright({ page: page });
  dp.screenshots = true;
  if (process.env.CI === 'true') {
    dp.command = 'image';
  }
  await page.goto('https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 500));
  await expect(page).toHaveTitle(/Example Domain/);
});

test('data url', async ({ page }) => {
  const html = '<b>I am bold</b>';
  const url = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
  new DebugPlaywright({ page: page });
  await page.goto(url);
});
