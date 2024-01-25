import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { temporaryFile } from 'tempy';
import { writeFileSync } from 'node:fs';
import type { Page, Response } from '@playwright/test';
import terminalImage from 'terminal-image';

const responseStatus = (response: Response) => {
  const code = response.status();
  return code < 300 ? '💖' : code < 400 ? '🚀' : '💩';
};

const contentType = async (response: Response) => {
  return response.headerValue('content-type');
};

export class DebugPlaywright {
  public command: string;
  public formatContent: boolean;
  public fullPage: boolean;
  public listen: boolean;
  public methodPadLength: number;
  public screenshots: boolean;
  public page: Page;

  constructor(
    page: Page,
    screenshots: boolean = true,
    fullPage: boolean = false,
    listen: boolean = true,
    command: string = 'wezterm imgcat',
  ) {
    this.page = page;
    this.screenshots = screenshots;
    this.command = command;
    this.fullPage = fullPage;
    this.listen = listen;
    this.methodPadLength = 4;
    this.addListener();
  }

  printFile = async (file: string) => {
    await this.printImage(file);
  };

  printScreenshot = async (page?: Page) => {
    const p = page ? page : this.page;
    if ( p.isClosed ) {
      // console.log('Not taking screenshot. page is already closed.');
      // return;
    }

    const tempFile = temporaryFile({ extension: 'png' });
    try {
      await p.screenshot({ path: tempFile, fullPage: this.fullPage });
    }
    catch (e) {
      console.log(`🤯 ${e.stack}`);
      return;
    };
    await this.printFile(tempFile);
  };

  printImage = async (file: string) => {
    try {
      if (this.command === 'terminal-image') {
        const opts = process.env.CI === 'true' ? { width: 50 } : { width: '50%' };
        console.log(await terminalImage.file(file, opts));
      }
      else {
        const output = execSync(`${this.command} ${file}`, { maxBuffer: 1048577 });
        console.log(output.toString());
      }
    }
    catch (e) {
      console.log(`🤯 ${e.message}`);
    }
  };

  addListener = (page?: Page) => {
    console.log(`➕ adding listener`);
    const p = page ? page : this.page;
    p.on('close', async data => {
      console.log(`✋ closed ${data.url()}`);
    });
    p.on('request',async data => {
        console.log(`🆕 requested ${data.url()}`);
    });
    p.on('response', async (response: Response) => {
      if (!this.listen) {
        return;
      }
      if (response.request().resourceType() !== 'document') {
        console.log(`ignoring ${response.request().resourceType()}`);
        return;
      }

      console.log(
        [
          responseStatus(response),
          response.status(),
          response.request().method().padEnd(this.methodPadLength, ' '),
          response.url(),
          await contentType(response),
        ].join(' ')
      );
      if (this.formatContent) {
        await this.dumpformattedContent(response);
      }
      if (this.screenshots) {
        await this.printScreenshot();
      }
    });
  };

  dumpformattedContent = async (response: Response) => {
    if (responseStatus(response) === '💩') {
      return;
    }

    if ((await contentType(response)).startsWith('image')) {
      const ext = (await contentType(response)).split('/')[1];
      const tempFile = temporaryFile({ extension: ext });
      const buffer = await response.body();
      writeFileSync(tempFile, buffer);
      await this.printFile(tempFile);
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
  };
}
