# Getting Started

## Installation

```bash
npm install
npx playwright install
```

You may also need to install `wezterm` and `lynx`.

## Run Tests

```bash
npx playwright test --project chromium --workers=1
```

## Run Tests in Headed Mode

```bash
npx playwright test --project chromium --workers=1 --headed
```

## Expected Output

```text
$ npx playwright test --project chromium --workers=1

Running 1 test using 1 worker
[chromium] › example.spec.ts:4:5 › has title
200 https://example.com/
Example Domain

   This domain is for use in illustrative examples in documents. You may
   use this domain in literature without prior coordination or asking for
   permission.

   [1]More information...

References

   1. https://www.iana.org/domains/example

  1 passed (1.5s)

To open last HTML report run:

  npx playwright show-report
```

## Usage

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
