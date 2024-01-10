import type { Page } from '@playwright/test';
import { spawn } from 'node:child_process';

export const dumpFormattedContent = (page: Page) => {
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'document') {
      return;
    }

    console.log(`${response.status()} ${response.url()}`);

    if (response.status() < 200 || response.status() > 299) {
      return;
    }
    const text = await response.text();

    const child = spawn('lynx', ['-stdin', '-dump']);
    child.stdin.write(text);
    child.stdin.end();

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
      console.log(data);
    });
  });
};
