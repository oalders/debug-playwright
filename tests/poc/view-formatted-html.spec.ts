import { test } from '@playwright/test';
import { spawn } from 'child_process';

test('2xx', async ({ page }) => {
  await page.goto('https://example.com');
  lynx(await page.content());
});

const lynx = (text: string) => {
  const child = spawn('lynx', ['-stdin', '-dump']);

  child.stdin.write(text);
  child.stdin.end();

  child.stdout.setEncoding('utf8');

  child.stdout.on('data', (data) => {
    console.log(data);
  });

  child.on('error', (error) => {
    console.error(`Error from child process: ${error}`);
  });

  child.stdout.on('end', () => {
    console.log('Child process ended');
  });
};
