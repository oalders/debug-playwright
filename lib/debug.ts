import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { temporaryFile } from 'tempy';
import { writeFileSync } from 'node:fs';
import type { Page, Response } from '@playwright/test';

export enum Using {
  'ascii' = 'ascii',
  'imgcat' = 'imgcat',
  'wezterm' = 'wezterm imgcat',
}

const responseStatus = async (response: Response) => {
  return (response.status() < 200 || response.status() > 299) ? '💩' : '💖';
};

const contentType = async (response: Response) => {
  return response.headerValue('content-type');
};

export const logResponse = async (page: Page) => {
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'document') {
      return;
    }

    console.log(`${response.url()} ${contentType(response)}`)
    console.log(`${responseStatus(response)} ${response.status()} ${response.url()}`);
  });
};


export const dumpFormattedContent = (page: Page, using?: Using) => {
  page.on('response', async (response) => {
    if (await responseStatus(response) === '💩') {
      return;
    }

    if ((await contentType(response)).startsWith('image')) {
      console.log(`🖼  ${response.url()} ${contentType(response)}`)
      const buffer = await response.body();
      const tempFile = temporaryFile({ extension: 'png' });
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

export const printScreenshot = async (page: Page, using?: Using | undefined, args?: Object) => {
  const tempFile = temporaryFile({ extension: 'png' });
  if (args === undefined) {
    args = [{ fullPage: false }];
  }

  await page.screenshot({ path: tempFile, ...args });
  await printFile(tempFile, using);
};

const printImage = async (file: string, using?: Using | undefined) => {
  const output = execSync(`${using}  ${file}`);
  console.log(output.toString());
};

const printASCII = async (file: string) => {
  console.log(`cannot currently print ${file} as ASCII`);
  // var asciify = require('asciify-image');
  // var options = {
  // fit: 'box',
  // width: 40,
  // }
  //
  // asciify(file, options, function(err, asciified) {
  // if (err) throw err;
  // console.log(asciified);
  // });
};
