# PREMIUM LUMBER GEORGIA

Next.js 15 / React 19 / TypeScript timber storefront with Georgian, English and Russian routes, Prisma PostgreSQL persistence, Supabase Auth and Supabase Storage.

## Setup

1. Run `npm install` and copy `.env.example` to `.env` if absent.
2. Set `DATABASE_URL` and `DIRECT_URL`. URL-encode the password, including `?`, `&`, `#` and any literal brackets. Placeholder brackets from Supabase's connection template are not part of the password. For IPv4 networks use the **Session pooler** connection from Supabase → Connect, port **5432**; do not guess its region or hostname. Direct `db.*.supabase.co` addresses normally require IPv6. `DIRECT_URL` must support migrations (direct or session pooler). If using transaction pooling at runtime, add the appropriate Prisma `pgbouncer=true` configuration to `DATABASE_URL` only.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (publishable or legacy anon key). They are read server-side; no service-role key is needed.
4. Run `npm run db:setup` to generate Prisma Client and apply PostgreSQL migrations. This never resets the database. Existing unrelated tables are not removed.
5. Optionally run `npm run db:seed` to import the 12 illustrative products and 10 categories. Existing products/categories are not overwritten. Replace seed prices, claims and photography with real inventory before launch.
6. Run `npm run db:storage`, or execute `prisma/supabase-storage.sql` in the Supabase SQL editor. This creates the public `product-images` bucket and admin-only write policies. JPG, PNG and WebP are limited to 5 MB.
7. Create and confirm an email/password user under Supabase → Authentication → Users. Run `npm run admin:grant -- admin@example.com` to authorize that exact account. There is no public registration or self-promotion route. To revoke access, set its `AdminUser.enabled` to false in the database.
8. Run `npm run dev`. Open `/admin/login` to sign in and `/admin` to manage the store. Set `APP_ORIGIN` to the exact public HTTPS origin in production, especially behind a reverse proxy.

Database credentials stay in `.env` or the deployment's secret environment configuration. `.env` is Git-ignored. Production auth cookies are Secure and require HTTPS. Sessions last up to one hour; after expiry, sign in again. Password management/recovery is available through Supabase; a self-service recovery UI is not included.

## Admin and storefront

- Products: create/edit/delete, hide/show, translated descriptions, custom categories, upload or HTTPS image URLs, wood species, grade, moisture, units, dimensional variants, coverage width, GEL prices and availability. Product and existing variant IDs stay stable across edits. Variants and parent products save atomically.
- Orders: paginated list, filters for NEW / PROCESSING / SHIPPED / COMPLETED / CANCELLED, customer/delivery details, item snapshots, internal notes and status changes. Concurrent changes return a conflict and require reloading. Orders cannot be deleted through this panel.
- Categories: translated names and CRUD. Deleting a category used by products is blocked.
- News: translated title, excerpt and plain-text body, cover photo, draft/published state and CRUD. Public routes: `/{ka|en|ru}/news` and `/{ka|en|ru}/news/[slug]`. Drafts return 404 publicly. Text is escaped, not interpreted as HTML.
- Catalog, featured products, cart and checkout read active products from PostgreSQL. Checkout independently reads current database prices, validates references and commits order/item snapshots atomically with database-enforced retry idempotency. Deleting a product does not erase historical order snapshots. No payments are collected.

Prices use integer tetri in storage. Dimensions are millimetres; nominal rectangular volume and effective width drive unit conversions. This is a pricing calculation, not an engineering assessment. Delivery charges and fulfillment are confirmed manually.

Every admin API operation verifies the Supabase user and server-managed `AdminUser` allowlist. Mutations validate Origin and input. Customer tables have RLS enabled without public policies; the trusted server connection reads them. Storage insertion checks the same allowlist through a restricted security-definer function. New photos use random paths. Removing a photo from a product preserves its storage object so shared photos are not deleted. Unused assets can be cleaned up in Supabase Storage.

The storefront receives its current catalog when the localized layout loads. Reload to see recent catalog edits; checkout always reprices from the database. Very large catalogs should move to server filtering and pagination. Order emails/SMS and realtime browser inventory updates are not included.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm start
```

Tests cover pricing/filtering, checkout validation, authorization boundaries, cross-origin mutations, admin validation and stale order revisions. PostgreSQL integration tests run only when `TEST_DATABASE_URL` points to an explicitly selected PostgreSQL test connection. They use a random temporary schema, remove only that schema afterward, and never fall back to `DATABASE_URL`. A dedicated test database is recommended. All test objects are confined to a unique temporary schema and no public application rows are modified. Without an explicit test connection, the test is skipped. For a running app, `node tests/admin-api-smoke.cjs http://localhost:3000` checks unauthenticated protection without creating data.

Production output uses `.next-production`; development uses `.next`, so builds do not overwrite an active dev cache.

## SQLite transition

The former SQLite migration is archived under `prisma/legacy-sqlite/`; existing `prisma/*.db` files are preserved. PostgreSQL uses a separate migration history. SQLite orders are not automatically copied or deleted. For an installation containing real SQLite orders, export/import them with their IDs and item snapshots and reset the PostgreSQL sequence before switching traffic. This workspace's `prisma/orders.db` contained **0 orders** when inspected during integration.

## Main files

- `prisma/schema.prisma`: orders/items, categories, products/variants, posts and admin allowlist.
- `prisma/migrations/`: PostgreSQL schema and RLS.
- `prisma/supabase-storage.sql`: bucket and upload authorization.
- `src/app/admin/`, `src/components/admin/`: Georgian admin panel.
- `src/app/api/admin/`, `src/lib/admin/`: protected APIs, validation and auth.
- `src/lib/catalog/repository.ts`: database-to-storefront mapping.
- `src/lib/checkout/order-service.ts`: authoritative pricing and durable orders.

References: [Supabase Prisma setup](https://supabase.com/docs/guides/database/prisma), [database connection options](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase Auth](https://supabase.com/docs/guides/auth).
# Content translation in the admin panel

Set the server-only `GOOGLE_TRANSLATE_API_KEY` in `.env` (and in the production hosting environment), enable Google Cloud Translation Basic v2 with billing, then restart the server. Restrict the key to the Cloud Translation API and configure Google project quotas. Never prefix it with `NEXT_PUBLIC_`.

Enter Georgian text in products, categories, news and photo descriptions. **ყველა ველის თარგმნა** fills missing/outdated English, Russian, Ukrainian, Hebrew and Arabic translations. Expand **თარგმანების გადახედვა** to edit text or regenerate selected languages. Existing text is replaced only after confirmation. Source fingerprints are saved inside existing JSON fields, so source changes remain marked after reopening. After reviewing an outdated translation, use **გადამოწმებულია — შენარჩუნება** to retain it.

Products and news may be saved hidden/unpublished with incomplete translations; publication requires complete, current translations. Categories are immediately usable and require all translations when saved. Translation results are persisted only when the form is saved. Existing content is not automatically translated or replaced. Static site interface dictionaries and technical identifiers are unaffected.

Translation requests require an authenticated admin and same-origin requests, use bounded text and timeouts, and return per-language errors. A per-process rate limit supplements Google project quotas; it is not a distributed billing cap. The provider receives only the Georgian content to translate. No API key is returned to the browser. API reference: https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate
