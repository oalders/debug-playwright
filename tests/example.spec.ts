import { test, expect } from '@playwright/test';
import { dumpFormattedContent } from '../debug.ts';

test('has title', async ({ page }) => {
    dumpFormattedContent(page);
    // await page.goto('https://playwright.dev/');
    await page.goto('https://example.com');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Example Domain/);
});
