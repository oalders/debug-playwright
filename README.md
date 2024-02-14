# Getting Started

## Installation

```bash
npm install
npx playwright install
```

You may also need to install `wezterm` and `lynx`.

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
import { DebugPlaywright } from '../debug-playwright/lib/debug.js';
```

### Default

Run debugging with the defaults. Requires you to be running inside `wezterm`
but **not** inside `tmux`.

```typescript
const dp = new DebugPlaywright(page);
```

### Configure

```typescript
const dp = new DebugPlaywright(page);

// take full page screenshots
dp.fullPage = true;

// or, turn off automatic screenshots
dp.screenshots = false;

// dump lynx output
dp.formatContent = true;

// print a screenshot on demand
await dp.printScreenshot();
```

### Attach to a BrowserContext

```typescript
context.on('page', (p) => {
  new DebugPlaywright(p);
});
```

### Print Screenshot on Test Failure

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    const dp = new DebugPlaywright(page, true,true);
    await dp.printScreenshot();
  }
});
```

### Screenshots

If your full page screenshots are hard to read (e.g. a navbar is clobbering
content in the middle of the page), try increasing the height of the viewport
to the maximum that makes sense for your monitor.

```nodejs
await page.setViewportSize({
  width: 1200,
  height: 2000,
});
```
