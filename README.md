# Getting Started

## Installation

```bash
npm install
npx playwright install
```

You may also need to install `wezterm` and `lynx`.

## Configuration

You can globally set the command used to print images via the `DP_IMG_CMD`
environment variable.

`export DP_IMG_CMD=imgcat`

## Documentation

See the inline documentation `src/index.ts` for more comprehensive help.

## Run Tests

```bash
npx playwright test
```

## Run Tests in Headed Mode

```bash
npx playwright test --headed
```

## Expected Output

### HTML formatted as text

```text
npx playwright test -g lynx

Running 1 test using 1 worker
[chromium] › example.spec.ts:16:1 › 2xx lynx
➕ adding listener
🆕 requesting https://example.com/
💖 200 GET  https://example.com/ text/html; charset=UTF-8
✋ closed https://example.com/
Example Domain

   This domain is for use in illustrative examples in documents. You may
   use this domain in literature without prior coordination or asking for
   permission.

   [1]More information...

References

   1. https://www.iana.org/domains/example

  1 passed (1.9s)

To open last HTML report run:

  npx playwright show-report
```

## Usage

```typescript
import { DebugPlaywright } from 'debug-playwright/dist/index.js';
```

### Default

Run debugging with the defaults. Requires you to be running inside `wezterm`
but **not** inside `tmux`.

```typescript
const dp = new DebugPlaywright({ page: page });
```

### Configure

```typescript
const dp = new DebugPlaywright({ page: page });

// take full page screenshots
dp.fullPage = true;

// or, turn off automatic screenshots
dp.screenshots = false;

// dump lynx output
dp.formattedContent = true;

// print a screenshot on demand
await dp.printScreenshot();
```

### Attach to a BrowserContext

```typescript
context.on('page', (p) => {
  new DebugPlaywright({ page: p});
});
```

### Debug on Every Test in File

#### Default beforeEach Handler

```typescript
import { test } from '@playwright/test';
import { beforeEachHandler } from 'debug-playwright/dist/index.js';

test.beforeEach(beforeEachHandler());
```

#### Custom beforeEach Handler

Pleas note:

* `testinfo` is also available if you need it
* mark the function as `async` if there's anything you need to `await`

```typescript
test.beforeEach(({ page }) => {
  new DebugPlaywright({page: page});
});
```

#### Default afterEach Handler

```typescript
import { test } from '@playwright/test';
import { afterEachHandler } from 'debug-playwright/dist/index.js';

test.afterEach(afterEachHandler());
```

#### Custom afterEach Handler

##### Print Screenshot on Failure

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    await new DebugPlaywright({ page: page, listen: false }).printScreenshot();
  }
});
```

##### Print Animated GIF of Screen Recording, if a Recording Exists

```typescript
test.afterEach(async ({ context, page }, testInfo) => {
  const dp = new DebugPlaywright({ page: page, listen: false });
  // ensure video file has been written to disk. otherwise it might just be a
  // zero byte file
  await context.close();

  const gifPath = await maybeConvertMovie(page, testInfo);
  if (gifPath) {
    dp.printImage(gifPath);
  }
});
```

### Screenshots

If your full page screenshots are hard to read (e.g. a navbar is clobbering
content in the middle of the page), try increasing the height of the viewport
to the maximum that makes sense for your monitor.

```typescript
await page.setViewportSize({
  width: 1200,
  height: 2000,
});
```

### lynx

To get a screen dump of every page as lynx sees it:

```typescript
const dp = new DebugPlaywright({
    page: page,
    listen: true,
    screenshots: false,
    formattedContent: true,
});
```
