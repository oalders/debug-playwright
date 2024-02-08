import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { temporaryFile } from 'tempy';
import { writeFileSync } from 'node:fs';
import type { Page, Response } from '@playwright/test';

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
  public logAssetRequests: boolean;
  public screenshots: boolean;
  public page: Page;
  private requestCount: number;

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
    this.logAssetRequests = false;
    this.methodPadLength = 4;
    this.addListener();
    this.requestCount = 0;
  }

  printFile = async (file: string) => {
    await this.printImage(file);
  };

  printScreenshot = async (page?: Page) => {
    const p = page ? page : this.page;
    if ( p.isClosed() ) {
      console.log('Not taking screenshot. page is already closed.');
      return;
    }

    const tempFile = temporaryFile({ extension: 'png' });
    try {
      await p.waitForLoadState('domcontentloaded');
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
        const ti = await import('terminal-image');
        console.log(await ti.default.file(file, opts));
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
    console.log('➕ adding listener');
    const p = page ? page : this.page;
    p.on('close', data => {
      console.log(`✋ closed ${data.url()}`);
      // if data.url is a base64 encoded string, then it's a data url
      // decode and console.log the first 1024 characters
      if (data.url().startsWith('data:text/html;base64') && this.screenshots) {
        // This is not a screenshot, but it's in the spirit of the thing.
        const decoded = Buffer.from(data.url().split(',')[1], 'base64').toString();
        console.log(decoded.slice(0, 1024 * 5));
      }
    });
    p.on('request',async data => {
      this.requestCount = this.requestCount + 1;
      // This is primarily useful to see the state of a page just before it is
      // submitted. So, if this is the very first request, then we don't need to
      // see what the page looks like before anything has happened.
      if (this.requestCount === 1 || !this.listen) {
        return;
      }
      if (data.method() !== 'get' && data.resourceType() !== 'document') {
        if ( this.logAssetRequests ) {
          console.log(`🆕 requesting ${data.url()}`);
        }
        return;
      }
      console.log(`🆕 requesting ${data.url()}`);
      if (this.screenshots) {
        await this.printScreenshot();
      }
    });
    p.on('requestfinished', async data => {
      if (!this.listen) {
        return;
      }
      if (data.method() !== 'get' && data.resourceType() !== 'document') {
        if ( this.logAssetRequests ) {
          console.log(`🆕 requesting ${data.url()}`);
        }
        return;
      }
      console.log(`🆕 requestfinished ${data.url()}`);
      if (this.screenshots) {
        await this.printScreenshot();
      }
    });
    p.on('response', async (response: Response) => {
      if (!this.listen) {
        return;
      }
      if (response.request().resourceType() !== 'document') {
        // console.log(`ignoring ${response.request().resourceType()}`);
        return;
      }
      if( responseStatus(response) === '🚀' ) {
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
      // if (this.screenshots) {
        // await this.printScreenshot();
      // }
    });
  };

  dumpformattedContent = async (response: Response) => {
    if (responseStatus(response) === '💩' || responseStatus(response) === '🚀' ) {
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
