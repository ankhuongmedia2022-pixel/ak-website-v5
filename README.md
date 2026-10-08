# AK WEBSITE V6.4 — An Khương Media

Production: https://ak-website-v5.vercel.app/

Hotline: **0868 054 679**

V6.4:
- Dedicated white-label landing page for event agencies: /agency
- Real proof: DEVIE, INSEE, Royal Dental Lab
- Agency CTA prefills contact form
- Event Reels Sprint positioning
- Existing direct-business packages, FAQ, SEO and portfolio retained


## V6.5
Added AK AI Shop for Skill, App, Workflow and AI packages.

## Checkout reliability review — PR #1 (2026-10-08)

The checkout creates and saves an order code before making one API request.
A 15-second deadline includes response-body parsing. Network failures, HTTP
errors, malformed JSON, and missing/invalid receipt fields all remain
**unconfirmed**. A timeout does not establish that the server rejected the
request, so the customer is instructed to check the same code via SMS/hotline.
A valid API acknowledgment is not confirmation that An Khương Media has processed
or accepted the order.

The receipt URL includes the order code, preventing a stale local/session value
or another tab's order from being shown as the current order. Storage revisions
select the newer receipt for the same code. If both stores fail after the API
response, the actual result remains visible on the form instead of redirecting
to stale data. Malformed optional stored fields are safely ignored.

Duplicate protection is deliberately bounded: double clicks are blocked; a
matching most recent request still present in local/session storage is reused
for 24 hours after reload/back; Web Locks serialize same-origin tabs on supported
browsers. This is **not server-side idempotency**. Cleared storage, different
origins/devices, overwritten order history, and browsers without Web Locks are
not covered by a cross-tab/cross-device guarantee. Do not implement automatic
retry until the receiving service supports durable idempotency by order code.

Validation performed during review:

- `node --check order.js`
- `node --test tests/order.test.cjs`: 32 passed.
- `node tests/order.browser.cjs`: 7 Chromium scenarios passed, including two-tab
  submission, a real 15-second timeout, offline recovery, malformed success,
  post-response storage failure, and a mobile empty state. Requires Playwright
  and Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing
  Chromium executable. All external requests are blocked or mocked; zero
  production orders are submitted by these tests.
- `.github/workflows/order-tests.yml` runs the syntax/unit checks on pull requests
  and pushes to main. Browser checks are optional and run separately.

### Production boundary

`order.js` calls the dedicated `ak-ai-shop-orders-api.vercel.app` service.
The `api/order.js` included in this repository only emits `AK_ORDER_EVENT` to
runtime logs and returns a receipt. It has no durable order store, no server-side
deduplication, and no Google Sheets/Gmail delivery code. It has not been verified
that the separate production service deploys this exact source.

Local or CI success does **not** verify production order intake, durable storage,
Google Sheets delivery, or Gmail notification. Those require tracing an
explicitly identified production test order through the actual receiving service
and destination records, with durable deduplication implemented there before
claiming end-to-end delivery or exactly-once handling.
