import type { Page, Response } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { temporaryFile } from 'tempy';

const DEFAULT_COMMAND = 'wezterm imgcat';
const LOAD_STATE = 'domcontentloaded';

const responseStatus = (response: Response) => {
  const code = response.status();
  return code < 300 ? '💖' : code < 400 ? '🚀' : '💩';
};

const contentType = async (response: Response) => {
  return await response.headerValue('content-type');
};

export function afterEachHandler() {
  return async ({ page }: { page: Page }, testInfo: any) => {
    if (testInfo.status === 'failed') {
      console.log('📷 screenshot on failure');
      await new DebugPlaywright({
        page: page,
        listen: false,
      }).printScreenshot();
    }
  };
}

export function beforeEachHandler() {
  return async ({ page }: { page: Page }, testInfo: any) => {
    console.log(`🐝 setting debugger on page in "${testInfo.title}"`);
    new DebugPlaywright({ page: page });
  };
}

interface DebugOptions {
  page: Page;
  command?: string;
  formattedContent?: boolean;
  fullPage?: boolean;
  listen?: boolean;
  logAssetRequests?: boolean;
  screenshots?: boolean;
}

export class DebugPlaywright {
  public page: Page;
  public command: string;
  public formattedContent: boolean;
  public fullPage: boolean;
  public listen: boolean;
  public logAssetRequests: boolean;
  public methodPadLength: number;
  public screenshots: boolean;
  private requestCount: number;

  constructor({
    page,
    screenshots = true,
    fullPage = true,
    listen = true,
    command = DEFAULT_COMMAND,
    logAssetRequests = false,
    formattedContent: formattedContent = false,
  }: DebugOptions) {
    this.page = page;
    this.command = command;
    this.formattedContent = formattedContent;
    this.fullPage = fullPage;
    this.listen = listen;
    this.logAssetRequests = logAssetRequests;
    this.methodPadLength = 4;
    this.requestCount = 0;
    this.screenshots = screenshots;

    if (this.listen) {
      this.addListener();
    }
  }

  printScreenshot = async (page?: Page) => {
    const p = page ?? this.page;
    if (p.isClosed()) {
      console.log('Not taking screenshot. page is already closed.');
      return;
    }

    const tempFile = temporaryFile({ extension: 'png' });
    try {
      await p.waitForLoadState(LOAD_STATE);
      await p.screenshot({ path: tempFile, fullPage: this.fullPage });
    } catch (e) {
      if (e instanceof Error) {
        console.log(`🤯 ${e.stack}`);
      } else {
        console.log(`🤯 ${e}`);
      }
      return;
    }
    this.printImage(tempFile);
  };

  printImage = (file: string) => {
    try {
      const output = execSync(`${this.command} ${file}`, {
        maxBuffer: 1048577,
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

  addListener = (page?: Page) => {
    console.log('➕ adding listener');
    const p = page ? page : this.page;
    p.on('close', (data) => {
      console.log(`✋ closed ${data.url()}`);
      // if data.url is a base64 encoded string, then it's a data url
      // decode and console.log the first 1024 characters
      if (data.url().startsWith('data:text/html;base64') && this.screenshots) {
        // This is not a screenshot, but it's in the spirit of the thing.
        const decoded = Buffer.from(
          data.url().split(',')[1],
          'base64',
        ).toString();
        console.log(decoded.slice(0, 1024 * 5));
      }
    });
    p.on('request', async (data) => {
      this.handleRequestEvent(data, 'request');
    });
    p.on('requestfinished', async (data) => {
      this.handleRequestEvent(data, 'requestfinished');
    });
    p.on('response', async (response: Response) => {
      if (!this.listen) {
        return;
      }
      if (response.request().resourceType() !== 'document') {
        // console.log(`ignoring ${response.request().resourceType()}`);
        return;
      }
      if (responseStatus(response) === '🚀') {
        return;
      }

      console.log(
        [
          responseStatus(response),
          response.status(),
          response.request().method().padEnd(this.methodPadLength, ' '),
          response.url(),
          await contentType(response),
        ].join(' '),
      );
      if (this.formattedContent) {
        await this.dumpformattedContent(response);
      }
    });
  };

  dumpformattedContent = async (response: Response) => {
    if (
      responseStatus(response) === '💩' ||
      responseStatus(response) === '🚀'
    ) {
      return;
    }

    const type = await contentType(response);
    if (type?.startsWith('image')) {
      const ext = type.split('/')[1] ?? 'png'; // default to 'png' if null
      const tempFile = temporaryFile({ extension: ext });
      const buffer = await response.body();
      if (buffer) {
        writeFileSync(tempFile, buffer);
        this.printImage(tempFile);
      }
      return;
    }

    executeLynxCommand(await response.text());
  };

  handleRequestEvent = async (data: any, eventName: string) => {
    if (!this.listen) {
      return;
    }
    if (data.method() !== 'get' && data.resourceType() !== 'document') {
      if (this.logAssetRequests) {
        console.log(`🆕 ${eventName} ${data.url()}`);
      }
      return;
    }

    if (eventName === 'request') {
      this.requestCount += 1;
      // This is primarily useful to see the state of a page just before it is
      // submitted. So, if this is the very first request, then we don't need to
      // see what the page looks like before anything has happened.
      if (this.requestCount === 1 || !this.listen) {
        return;
      }
    }
    console.log(`🆕 ${eventName} ${data.url()}`);
    if (this.screenshots) {
      await this.printScreenshot();
    }
  };
}

const executeLynxCommand = (text: string) => {
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
