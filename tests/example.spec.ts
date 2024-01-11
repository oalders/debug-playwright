import { test, expect } from '@playwright/test';
import { dumpFormattedContent } from '../debug.ts';

test('2xx', async ({ page }) => {
    dumpFormattedContent(page);
    await page.goto('https://example.com');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Example Domain/);
});

test('4xx', async ({ page }) => {
    dumpFormattedContent(page);
    await page.goto('https://example.com/404');

    await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx JSON', async ({ page }) => {
    dumpFormattedContent(page);
    await page.goto('https://filesamples.com/samples/code/json/sample1.json');

    await expect(page).not.toHaveTitle('title');
});

test.only('2xx png', async ({ page }) => {
    dumpFormattedContent(page);
    await page.goto('https://vilerichard.com/static/photos/group1.jpg');

    // Expect a title "to contain" a substring.
    await expect(page).not.toHaveTitle('title');
});
