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
  public screenshots: boolean;
  private page: Page;

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

  printFile = (file: string) => {
    this.printImage(file);
  };

  printScreenshot = async () => {
    const tempFile = temporaryFile({ extension: 'png' });

    await this.page.screenshot({ path: tempFile, fullPage: this.fullPage });
    this.printFile(tempFile);
  };

  printImage = (file: string) => {
    const output = execSync(`${this.command} ${file}`);
    console.log(output.toString());
  };

  addListener = () => {
    this.page.on('response', async (response: Response) => {
      if (!this.listen) {
        return;
      }
      if (response.request().resourceType() !== 'document') {
        return;
      }

      console.log(
        [
          response.status(),
          responseStatus(response),
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
      this.printFile(tempFile);
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
