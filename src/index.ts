/**
 * This module provides utilities for debugging Playwright tests.
 *
 * It exports two handlers `beforeEachHandler` and `afterEachHandler` that can be used in Playwright tests.
 * It also exports a `DebugPlaywright` class that provides methods for debugging Playwright pages.
 *
 * Additionally, it exports two utility functions `maybeConvertMovie` and `movieToGIF` for handling video to GIF conversion.
 *
 * `maybeConvertMovie` is an async function that takes a Playwright page and test info as parameters, and returns a promise that resolves to the path of the GIF or null if the conversion was not successful.
 *
 * `movieToGIF` is a function that takes a command, video path, and GIF path as parameters, and returns a boolean indicating whether the conversion was successful.
 *
 * @module DebugPlaywright
 */
import type {
  BrowserContext,
  Page,
  Response,
  TestInfo,
} from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { temporaryFile } from 'tempy';
import path from 'path';
import fs from 'fs';

const DEFAULT_COMMAND = 'wezterm imgcat';
const LOAD_STATE = 'domcontentloaded';

/**
 * This function is intended to be used as a beforeEach handler in Playwright tests.
 * It sets up a debugger on the page for each test.
 *
 * @returns {Function} An async function to be run before each test.
 */
export function beforeEachHandler() {
  return async ({ page }: { page: Page }, testInfo: any) => {
    console.log(`🐝 setting debugger on page in "${testInfo.title}"`);
    new DebugPlaywright({ page: page });
  };
}

/**
 * This function is intended to be used as an afterEach handler in Playwright tests.
 * It takes a screenshot and prints it if the test fails.
 * It also converts the video of the test to a gif and prints it.
 *
 * @returns {Function} An async function to be run after each test.
 */
export function afterEachHandler() {
  return async (
    { page, context }: { page: Page; context: BrowserContext },
    testInfo: any,
  ) => {
    if (testInfo.status === 'failed') {
      console.log('📷 screenshot on failure');
      await new DebugPlaywright({
        page: page,
        listen: false,
      }).printScreenshot();
    }

    // ensure video file has been written to disk. otherwise it might just be a zero byte file
    await context.close();

    const gifPath = await maybeConvertMovie(page, testInfo);
    if (gifPath) {
      new DebugPlaywright({
        page: page,
        listen: false,
      }).printImage(gifPath);
    }
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
  verbose?: boolean;
}
/**
 * This class provides methods for debugging Playwright pages.
 *
 * @property {Page} page - The Playwright page to debug.
 * @property {string} command - The command to print images. Defaults to the DP_IMG_CMD environment variable or 'wezterm imgcat'.
 * @property {boolean} formattedContent - Whether to dump formatted content of responses. Defaults to false.
 * @property {boolean} fullPage - Whether to take full page screenshots. Defaults to true.
 * @property {boolean} listen - Whether to listen to page events. Defaults to true.
 * @property {boolean} logAssetRequests - Whether to log asset requests. Defaults to false.
 * @property {boolean} logPOSTParams - Whether to log POST request parameters. Defaults to true.
 * @property {boolean} screenshots - Whether to take screenshots. Defaults to true.
 * @property {boolean} verbose - Whether to log verbose messages. Defaults to false.
 */
export class DebugPlaywright {
  public page: Page;
  public command: string;
  public formattedContent: boolean;
  public fullPage: boolean;
  public listen: boolean;
  public logAssetRequests: boolean;
  public logPOSTParams: boolean;
  public methodPadLength: number;
  public screenshots: boolean;
  public verbose: boolean;
  private requestCount: number;

  constructor({
    page,
    screenshots = true,
    fullPage = true,
    listen = true,
    command = process.env.DP_IMG_CMD || DEFAULT_COMMAND,
    logAssetRequests = false,
    logPOSTParams = true,
    formattedContent: formattedContent = false,
    verbose = false,
  }: DebugOptions) {
    this.page = page;
    this.command = command;
    this.formattedContent = formattedContent;
    this.fullPage = fullPage;
    this.listen = listen;
    this.logAssetRequests = logAssetRequests;
    this.logPOSTParams = logPOSTParams;
    this.methodPadLength = 4;
    this.requestCount = 0;
    this.screenshots = screenshots;
    this.verbose = verbose; // Set verbose property

    if (this.listen) {
      this.addListener();
    }
  }

  printScreenshot = async (page?: Page) => {
    const p = page ?? this.page;
    if (p.isClosed() && this.verbose ) {
      console.log('Not taking screenshot. page is already closed.');
      return;
    }

    const tempFile = temporaryFile({ extension: 'png' });
    try {
      await p.waitForLoadState(LOAD_STATE);
      await p.screenshot({ path: tempFile, fullPage: this.fullPage });
    } catch (e) {
      if (e instanceof Error) {
        if (e.stack?.includes('Target page, context or browser has been closed') && !this.verbose) {
            return;
        }
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
        maxBuffer: 20 * 1024 * 1024,
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
      // decode everything and console.log the first X characters
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

  private dumpformattedContent = async (response: Response) => {
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

    lynx(await response.text());
  };

  private handleRequestEvent = async (data: any, eventName: string) => {
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
    console.log(
      `🆕 ${eventName.padEnd(15, ' ')} ${data.method().padEnd(4, ' ')} ${data.url()}`,
    );
    if (
      eventName === 'requestfinished' &&
      data.method().toLowerCase() === 'post' &&
      this.logPOSTParams
    ) {
      const params = new URLSearchParams(data.postData());
      const paramsMap = new Map(params.entries());
      console.dir(paramsMap);
    }
    if (this.screenshots) {
      await this.printScreenshot();
    }
  };
}

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
};

/**
 * This function converts a movie to a GIF using ffmpeg.
 *
 * @param {string} command - The command to convert the movie to a GIF.
 * @param {string} video - The path to the video file.
 * @param {string} gif - The path to the output GIF file.
 * @returns {boolean} Whether the conversion was successful.
 */
export const movieToGIF = (command: string, video: string, gif: string): boolean => {
  const cmd = `${command} ${video} ${gif}`;
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch (e: any) {
    if (e instanceof Error) {
      console.log(`🤯 ${e.message}`);
    } else {
      console.log(`🤯 ${e}`);
    }
    return false;
  }
};
/**
 * This function converts the video of a test to a GIF if it exists.
 *
 * @param {Page} page - The Playwright page of the test.
 * @param {TestInfo} testInfo - The test info object.
 * @returns {Promise<string|null>} The path to the GIF file, or null if the conversion was not successful.
 */
export const maybeConvertMovie = async (page: Page, testInfo: TestInfo): Promise<string | null> => {
  const video = await page.video()?.path();
  if (!video) {
    return null;
  }
  if (!fs.existsSync(video)) {
    console.error(`No movie exists at ${video}`);
    return null;
  }

  const gifPath = path.join(testInfo.outputPath(), `${path.basename(video)}.gif`);
  return movieToGIF('ffmpeg -i', video, gifPath) ? gifPath : null;
};

const responseStatus = (response: Response) => {
  const code = response.status();
  return code < 300 ? '💖' : code < 400 ? '🚀' : '💩';
};

const contentType = async (response: Response) => {
  return await response.headerValue('content-type');
};
