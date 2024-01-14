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

            await printImage(tempFile);

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

export const printScreenshot = async (page: Page) => {
    const tempFile = join(tmpdir(), 'temp.png');
    await page.screenshot({ path: tempFile, fullPage: true });
    await printImage(tempFile);
    printASCII(Buffer.from(tempFile));
    console.log('xxxx');
};

const printImage = async (file: string) => {
    const output = execSync('wezterm imgcat ' + file);
    console.log(output.toString());
};

const handleConvertedFile = (err: any, converted: any) => {
    console.log('--------');
    console.log(err || converted);
};

const printASCII = (file: Buffer) => {
    const imageToAscii = require("image-to-ascii");
    console.log('ZZZZZ');

    imageToAscii(file, { image_type: 'png' }, handleConvertedFile);
}
