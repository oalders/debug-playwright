import { test } from '@playwright/test';
import { execSync } from 'child_process';

test('2xx', async ({ page }) => {
  if (process.env.CI === 'true') {
      test.skip();
  }
  if (process.env.TMUX) {
      console.error('Cannot run wezterm imgcat inside tmux');
      test.skip();
  }
  // const command = 'wezterm imgcat';
  const command = 'imgcat';
  const file = '/tmp/screenshot.png';
  await page.goto('https://example.com');
  await page.screenshot({path: file});

  executeCommand(command,file);
});

const executeCommand = (command: string, file: string) => {
  try {
    const output = execSync(`${command} ${file}`, {
      maxBuffer: 1024 * 5000,
    });
    console.log(output.toString());
  } catch (e) {
    if (e instanceof Error) {
      console.log(`🤯 ${e.message}`);
    } else {
      console.log(`🤯 ${e}`);
    }
  }
};
