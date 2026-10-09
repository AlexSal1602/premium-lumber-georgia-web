# Order email notifications

New orders create an `OrderNotification` row atomically with the order and item snapshots. After commit, checkout awaits a bounded Resend request. Notification failures never roll back the order or turn the saved checkout into an error. A process crash leaves a durable row visible in the admin panel. Historical orders are not backfilled or emailed.

## Configuration and deployment

1. Verify `lumber.ge` in Resend using the records shown in its dashboard. DNS is managed in Vercel, while Cleannet is the registrar. Preserve existing records and nameservers; leave receiving disabled.
2. Create a **Sending access** API key restricted to **lumber.ge**. Store `RESEND_API_KEY` only in the server `.env` and the Vercel project's Production environment. Never commit it or use `NEXT_PUBLIC_`.
3. Set `ORDER_EMAIL_FROM="Lumber.ge <orders@lumber.ge>"`. The recipient is fixed server-side to `asalbishvili@hotmail.com`; customer email is informational only.
4. Run `npm run db:migrate` before deploying the new code, then `npm run build`. Existing orders and tables are preserved; the new table has RLS and no public policy.
5. Deploy the application with the new environment variables. Local configuration alone does not configure Vercel.

## Retry and status semantics

- `PENDING`: saved but not attempted; use the admin order's retry button.
- `SENDING`: a worker holds a 60-second database lease. A subsequent retry may reclaim an expired lease.
- `FAILED`: missing configuration, provider rejection, or an ambiguous network result. The admin button retries with the same provider idempotency key and frozen payload.
- `ACCEPTED`: Resend returned an email ID. No further sends are permitted for this notification. This does **not** prove delivery or inbox receipt.
- `REVIEW_REQUIRED`: the first provider attempt is over 23 hours old. Sending is blocked because Resend retains idempotency keys for only 24 hours. Inspect Resend Emails before any manual remediation. Do not reset a row blindly.

The admin endpoint authenticates and authorizes through the existing Supabase admin allowlist, checks Origin, and accepts only an order ID. The database stores safe error codes, attempts, timestamps, and the provider ID. Email HTML escapes customer data. A frozen payload contains personal order data and is protected like the order itself. No provider response bodies or credentials are logged.

Delivery is checked in the Resend dashboard, not inferred from API acceptance. There is no delivery webhook or claim of inbox receipt. User confirmation is required to establish that the email appeared in the intended inbox. There is no scheduled retry worker: retry pending/failed rows through the admin panel. Checkout retries also retry eligible notifications.

## Verification

`npm test`, `npm run typecheck`, and `npm run build` cover local behavior. PostgreSQL tests use `TEST_DATABASE_URL` and isolated random schemas, never application rows. Email test doubles do not contact Resend.

`node scripts/test-order-email.cjs` is an explicitly authorized **single** real-email smoke test. It persists a cancelled, clearly marked synthetic order without touching inventory, reads it back through the same notification service, and sends only to the owner. Re-running reuses the same order and notification; it cannot send a second accepted email. Keep the cancelled order for the audit trail.

Reference: https://resend.com/docs/dashboard/emails/idempotency-keys

## Configuration progress — 2026-10-09

- Supabase migration `202610090001_order_notifications` applied successfully.
- Full suite: 50 passed, 0 failed, 0 skipped, including isolated PostgreSQL tests. TypeScript, production build and unauthenticated admin HTTP smoke checks passed.
- Resend domain `lumber.ge` created (ID `0a523503-516e-4d27-b965-7756e75fc924`, Tokyo region); verified in the Resend dashboard.
- Vercel authoritative DNS confirmed. Existing apex/wildcard ALIAS and CAA records were preserved. After explicit user approval of the wildcard override, DKIM (resend._domainkey TXT), SPF (send TXT), and bounce MX (send MX, priority 10) were added and verified. Nameservers remain unchanged.
- 2026-10-10: Sending-access key scoped to lumber.ge created after confirmation, stored in ignored local .env and Vercel Production Secret. ORDER_EMAIL_FROM is configured in Production. No paid service enabled.
- One synthetic cancelled order ORD-1026 was sent: provider ID 01a122a3-f374-7203-b4c3-faba75cffc60. Database status ACCEPTED, attempts 1; Resend dashboard confirms Sent and Delivered. Inbox receipt awaits the user.
- Deployment is triggered by pushing this tested change to the existing main production branch.
