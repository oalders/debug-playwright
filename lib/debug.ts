import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export enum Using {
    'ascii' = 'ascii',
    'imgcat' = 'imgcat',
    'wezterm' = 'wezterm imgcat',
}

export const dumpFormattedContent = (page: Page, using?: Using) => {
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
            await printFile(tempFile, using);
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

const printFile = async (file: string, using: Using | undefined) => {
    if (using === 'ascii') {
        await printASCII(file);
    }
    else {
        // if using is not defined default to 'wezterm imgcat'
        if (!using) {
            using = Using.wezterm;
        }
        await printImage(file, using);
    }
};

export const printScreenshot = async (page: Page, using?: Using | undefined) => {
    const tempFile = join(tmpdir(), 'temp.png');
    await page.screenshot({ path: tempFile, fullPage: true });
    await printFile(tempFile, using);
};

const printImage = async (file: string, using?: Using | undefined) => {
    const output = execSync(`${using}  ${file}`);
    console.log(output.toString());
};

const printASCII = async (file: string) => {
    var asciify = require('asciify-image');
    var options = {
        fit: 'box',
        width: 40,
    }

    asciify(file, options, function(err, asciified) {
        if (err) throw err;
        console.log(asciified);
    });
};
