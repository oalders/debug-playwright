import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export const dumpFormattedContent = (page: Page) => {
    page.on('response', async (response) => {
        if (response.request().resourceType() !== 'document') {
            return;
        }

        const status = (response.status() < 200 || response.status() > 299) ? '💩' : '💖';
        console.log(`${status} ${response.status()} ${response.url()}`);

        if (status === '💩') {
            return;
        }

        if (response.headers()['content-type'].startsWith('image')) {
            console.log(`🖼  ${response.url()} ${response.headers()['content-type']}`)
            const buffer = await response.body();
            const tempFile = join(tmpdir(), 'temp.png');
            writeFileSync(tempFile, buffer);

            const output = execSync('wezterm imgcat ' + tempFile);
            console.log(output.toString());

            return;
        }

        const text = await response.text();

        const child = spawn('lynx', ['-stdin', '-dump']);
        child.stdin.write(text);
        child.stdin.end();

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', function(data) {
            console.log(data);
        });
    });
};
