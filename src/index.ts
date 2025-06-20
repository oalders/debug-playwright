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
export function beforeEachHandler(): Function {
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
export function afterEachHandler(): Function {
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
  logPOSTParams?: boolean;
  screenshots?: boolean;
  verbose?: boolean;
}
/**
 * This class provides methods for debugging Playwright pages.
 *
 * @property {Page} page - The Playwright page to debug.
 * @property {string} command - The command to print images. Defaults to the DP_IMG_CMD environment variable or 'wezterm imgcat'.
 * @property {boolean} formattedContent - Whether to dump formatted content of responses. Defaults to false.
 * @property {boolean} fullPage - Whether to take full page screenshots. Defaults to true. Disable for more consistent movie output.
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
  private logger: string[][];
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
    this.logger = [];

    if (this.listen) {
      this.addListener();
    }
  }

  /**
   * Takes a screenshot of the current page or a specified page and displays it using the configured image viewer.
   *
   * @param {Page} [page] - Optional Playwright page. If not provided, uses this.page
   * @returns {Promise<void>} A promise that resolves when the screenshot has been taken and displayed
   */
  async printScreenshot(page?: Page): Promise<void> {
    const p = page ?? this.page;
    if (p.isClosed() && this.verbose) {
      console.log('Not taking screenshot. page is already closed.');
      return;
    }

    const tempFile = temporaryFile({ extension: 'png' });
    try {
      await p.waitForLoadState(LOAD_STATE);
      await p.screenshot({ path: tempFile, fullPage: this.fullPage });
    } catch (e) {
      if (e instanceof Error) {
        if (
          e.stack?.includes(
            'Target page, context or browser has been closed',
          ) &&
          !this.verbose
        ) {
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
    // maybe fall back to viu if we are in an env where imgcat probably won't work
    if (this.command.includes('imgcat') && process.env.TMUX) {
      try {
        const commands = ['chafa', 'viu'];
        for (const command of commands) {
          try {
            const path = execSync(`which ${command}`, { stdio: 'pipe' })
              .toString()
              .trim();
            if (path) {
              this.command = command;
              console.log(
                `🤔 falling back to ${command}, since we appear to be inside tmux`,
              );
              break;
            }
          } catch (e) {
            console.error(`Error finding ${command}: ${e}`);
          }
        }
      } catch (e) {
        console.error(`Error finding image viewer: ${e}`);
      }
    }
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

  printLogs = () => {
    const today = new Date().toISOString().slice(0, 10);
    console.log(`Coverage [${today}]:`);
    this.logger.forEach((line) => {
      console.log(line.join(' '));
    });
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
      this.printLogs();
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

      const url = new URL(response.url());
      const pathWithParameters = url.pathname + url.search;
      this.logger.push([
        response.status().toString(),
        response.request().method().padEnd(this.methodPadLength, ' '),
        pathWithParameters,
      ]);

      if (responseStatus(response) === '🚀') {
        return;
      }
      console.log(
        [
          responseStatus(response),
          response.status().toString().padEnd(15, ' '),
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
        console.log(`✨ ${eventName} ${data.method()} ${data.url()}`);
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
      `✨ ${eventName.padEnd(15, ' ')} ${data.method().padEnd(4, ' ')} ${data.url()}`,
    );
    if (
      eventName === 'requestfinished' &&
      data.method().toLowerCase() === 'post' &&
      this.logPOSTParams
    ) {
      const params = new URLSearchParams(data.postData());
      const paramsMap = new Map(params.entries());
      console.log('📤 POST parameters:');
      console.dir(paramsMap);
    }
    if (this.screenshots) {
      await this.printScreenshot();
    }
  };
}

/**
 * Uses the Lynx text-based web browser to format and print HTML content to the console.
 *
 * @param {string} text - The HTML content to format and print.
 *
 */
export const lynx = (text: string) => {
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
 * This function converts a movie to a GIF using ffmpeg. Set fullpage: false if
 * your movie does not have a consistent screen size.
 *
 * @param {string} template - The template for a command to convert the movie to a GIF. e.g. 'ffmpeg -i {video} {gif}'
 * @param {string} video - The path to the video file.
 * @param {string} gif - The path to the output GIF file.
 * @returns {boolean} Whether the conversion was successful.
 */
export const movieToGIF = (
  template: string,
  video: string,
  gif: string,
): boolean => {
  const cmd = template.replace('{video}', video).replace('{gif}', gif);
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
export const maybeConvertMovie = async (
  page: Page,
  testInfo: TestInfo,
): Promise<string | null> => {
  const v = page.video();
  if (!v) {
    console.log('🎬 No video');
    return null;
  }

  const video = await v.path();
  if (!video) {
    console.log('🎬 No path to video');
    return null;
  }
  if (!fs.existsSync(video)) {
    console.error(`No movie exists at ${video}`);
    return null;
  }

  const gifPath = path.join(
    testInfo.outputPath(),
    `${path.basename(video)}.gif`,
  );

  const template = 'ffmpeg -i {video} -vf "setpts=4.0*PTS,scale=1200:-1" {gif}';
  return movieToGIF(template, video, gifPath) ? gifPath : null;
};

const responseStatus = (response: Response) => {
  const code = response.status();
  return code < 300 ? '💖' : code < 400 ? '🚀' : '💩';
};

const contentType = async (response: Response) => {
  return await response.headerValue('content-type');
};
