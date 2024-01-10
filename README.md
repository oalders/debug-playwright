# Getting Started

## Run Tests in Headed Mode

```bash
npx playwright test --headed --project chromium
```

## Run Tests in Headless Mode

```bash
npx playwright test --project chromium
```

## Expected Output

```text
$ npx playwright test --project chromium

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
