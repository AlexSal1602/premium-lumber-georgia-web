# Supabase security review — 16 October 2026

Status: **approved and applied** on 16 October 2026 (Tbilisi), with Prisma migration
`202610160001_database_security`. All ten public tables now have RLS enabled and direct
client privileges revoked. Function permissions and postgres defaults were hardened.
Customer/business records, Auth settings and Storage configuration were not changed;
Prisma recorded the new migration in its bookkeeping table. No application source files
were changed. The findings and inventory below describe the pre-approval state.

## Applied result and evidence

- Applied migration: `../prisma/migrations/202610160001_database_security/migration.sql`.
  The two approved SQL drafts were combined into one transaction without changing their
  permission rules. The applied checksum matches the local migration file.
- `isolated-validation.json`: **135 checks passed** using an in-memory PGlite PostgreSQL
  engine and minimal local Auth/Storage fixtures. Covered client read/write/truncate and
  sequence denial, restrictive policy protection against later permissive grants, enabled/
  disabled/non-admin storage authorization, owner checkout/items/outbox writes, inventory
  writes/immutability, future-object defaults, service access and migration bookkeeping.
- `post-deployment-verification.json`: live read-only checks passed. All ten public tables
  have RLS, all 140 client table privilege checks and 12 sequence checks deny access,
  no client column grants remain, and all ten anonymous Data API probes return **401**.
  Existing Storage policies/bucket configuration and Supabase-owned defaults are unchanged.
  All 80 owner/service-role CRUD grants are preserved. The actual server catalog conversion
  and private read paths work. The real enabled-admin helper returns true with its user
  identity, and a missing identity returns false; no login/session was created.
- Existing application tests: **47 passed, 0 failed, 3 database-writing integration tests
  skipped**. Production verification performed no business writes, uploads or email sends.
- Credential scan repeated: 215 checked files, no findings.
- `http-smoke-results.json`: **11 GET-only checks passed** against the existing local
  production build backed by the updated live database. Catalog, news, checkout, public
  inventory and login returned 200; the admin page redirected to login and five private
  admin endpoints returned 401. This verifies this build/configuration, not another remote
  deployment's environment.

`deployment-result.json` records completion/checksum. Baseline evidence is preserved in
`before-approval-metadata.json` and `before-approval-access.json`. These supersede the
original proposal-only status; the proposed SQL copies remain as the approval record.

The temporary-schema integration-test helper now skips this public-schema ACL migration:
running public-qualified security SQL from a random-schema fixture could otherwise mutate
the real public schema. Its dedicated isolated validation remains available through
`node security-review/validate-proposals.cjs`; the local engine was installed under the
ignored `.validation` directory without changing application dependencies.

## Scope and evidence

Reviewed the Premium Lumber Georgia workspace and the live Supabase database configured
by its local `.env`. The unrelated transit URL visible in the browser was not used as
the target. Live catalog inspection used READ ONLY transactions. Anonymous API probes
used HTTP HEAD with limit=0. Role simulations selected only EXISTS booleans, never
customer records. Pre-change evidence: `before-approval-metadata.json` and
`before-approval-access.json`. The original `live-metadata.json` and `access-checks.json`
also contain baseline snapshots, not the current post-migration state.

Inspected all non-system-schema relations, public-table grants (including column grants),
RLS policies, public functions, default grants, schema privileges, role memberships,
sequences, bucket configuration, Realtime publication membership, and applied migrations.
Also traced frontend/server access and scanned source/public/existing browser bundles
for configured secret values, database passwords, Supabase secret keys and service-role JWTs.

Runtime and migration connection project identities, roles and histories were checked
before application and matched the reviewed Supabase project. This is not proof that
every deployed environment matches this checkout. Supabase
Dashboard-only controls (MFA enforcement, password/breach protections, network restrictions,
backups, organization permissions and secrets in other deployments) were not available
through these credentials/APIs and remain outside the verified scope. No real-user login,
write attack, destructive probe, email send or upload was performed.

## Public table inventory before approval

| Table | Live RLS | Actual application access / sensitivity |
|---|---|---|
| AdminUser | Enabled | Server checks enabled admin allowlist; private IDs/emails; Storage admin helper reads it |
| Category | Enabled | Server serializes categories to visitors; admin CRUD |
| Product | Enabled | Server exposes active products; admin manages active/hidden products |
| ProductVariant | Enabled | Server exposes variants for active products; checkout prices/stock; admin updates |
| Post | Enabled | Server exposes published posts; admin also accesses drafts |
| Order | Enabled | Public checkout inserts through validated server route; admin reads/updates private customer details |
| OrderItem | Enabled | Server checkout creates price snapshots; admin reads order lines |
| InventoryMovement | Enabled | Admin inventory operations; private audit history protected by immutable trigger |
| OrderNotification | Enabled | Server email outbox; private customer email payload and delivery/lease information |
| _prisma_migrations | **Disabled** | Deployment tooling only; migration metadata and execution logs |

There are exactly ten public tables and no public views/materialized views/foreign tables.
All nine application tables have no permissive client policies: default-deny RLS applies.
Role simulations for both anon and authenticated returned no visible rows on these nine
tables, and visible migration records on `_prisma_migrations`. Anonymous HEAD requests
confirmed all ten names are reachable through the Data API; HTTP 200 alone does not
mean application rows are visible.

Other base tables without RLS were enumerated in managed schemas:
`auth.custom_oauth_providers`, `auth.mfa_recovery_code_sets`, `auth.mfa_recovery_codes`,
`auth.oauth_authorizations`, `auth.oauth_client_states`, `auth.oauth_clients`,
`auth.oauth_consents`, `auth.scim_tokens`, `auth.scim_users`, `auth.webauthn_challenges`,
`auth.webauthn_credentials`, `realtime.schema_migrations`, `realtime.subscription`,
and `vault.secrets`. These are platform-owned internals, not application public tables;
RLS=false there is not by itself evidence of anonymous exposure. Do not alter their
ownership, policies or grants as part of this application fix.

## Findings and proposed fixes

1. **High: exposed migration bookkeeping.** `_prisma_migrations` has RLS disabled and
   SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants to both client roles.
   Metadata is readable; existing grants permit direct API DML without a row policy.
   Tampering could disrupt future deployments. No writes were attempted, and this review
   does not establish that anyone has exploited it. Enable RLS and revoke all client/PUBLIC
   table privileges, keeping migration-owner access.

2. **Medium: excessive table/sequence privileges and unsafe creation defaults.** All ten
   public tables grant seven privileges to each client role; both order sequences grant
   read/use/update privileges. Existing RLS blocks row DML on the nine application tables,
   but does not cover TRUNCATE or sequence operations. No public truncate/sequence RPC was
   found, so this is a latent privilege risk, not a demonstrated anonymous HTTP attack
   against customer data. Revoke these grants. Remove postgres-created objects' automatic
   client grants so a future forgotten RLS statement does not immediately expose data.
   Supabase-owned defaults also exist for supabase_admin; these remain unchanged and
   objects created by other roles must be reviewed separately.

3. **Low: unnecessary function exposure.** `gw_is_admin()` is executable by anon despite
   the storage setup script revoking PUBLIC: Supabase's explicit default anon grant survives
   that statement. It returns an allowlist boolean, not admin records; no escalation is
   established. Keep execution for authenticated image uploads and revoke anon/PUBLIC.
   The immutable-history trigger function also has unnecessary public/client execution and
   no fixed search_path. Revoke direct client execution and set an empty search_path.
   Both live function bodies were compared with their checked-in definitions and matched.

4. **Residual architectural risk: server connection bypasses RLS.** The configured runtime
   connects as postgres, owns the public tables and has BYPASSRLS. Application-level auth
   is therefore essential for every private route. The reviewed admin routes call
   requireAdmin(), verify the token with Supabase Auth, and check the enabled database
   allowlist. Mutations check origin and validate input. Ordinary signup is enabled, but
   signing up does not grant admin access; anonymous Auth users are disabled and email
   auto-confirm is off. Admin-only signup restrictions, login/checkout rate limiting and
   a dedicated least-privilege server role are separate hardening options, not changes
   silently bundled into these SQL proposals. A compromised server credential remains
   privileged after these fixes. FORCE RLS does not constrain a BYPASSRLS role.

5. **Business exposure to confirm:** visitors currently receive tracked stock quantities
   and lowStockThreshold values through toProduct() and `/api/inventory`. This is existing
   application serialization, independent of Supabase's Data API. Quantities support the
   current shopping experience. If reorder thresholds are private, remove that field from
   both public serializers and browser props while retaining it in admin responses; an RLS
   change alone cannot hide data deliberately returned by the privileged server.

## Proposed access rules

For all ten public tables: anon and authenticated get no direct read/insert/update/delete
access, including authenticated administrators. Admin operations continue through the
verified server routes. Each table gets a restrictive `gw_block_direct_clients` policy
with USING(false) and WITH CHECK(false), in addition to revoked grants. This also blocks
future permissive policies from accidentally opening those client roles.

Public catalog/categories/news are still served by existing filtered server queries;
guests still submit orders through `/api/orders`, with server-calculated prices and
transactional order items/outbox creation. Do not add a public Order INSERT policy: it
would bypass this validation. Orders have no customer auth-owner relationship, so an
invented auth.uid() owner policy would not fit the current guest-checkout model.

Keep Storage's existing three policies: only authenticated users passing the enabled
AdminUser allowlist may insert/delete/list product-images objects; no UPDATE policy is
present. Preserve the public image bucket, 5 MB limit and JPEG/PNG/WebP allowlist. Product
image contents are intentionally public, including files whose product is later hidden;
private attachments must use a separate private bucket. No Realtime publication tables
were present in the inspected catalog.

## Credential review

No matching secrets were found in 215 checked source/public/browser-bundle files.
Configured database URLs/passwords, Resend and translation keys were checked by exact
value without printing them. No service-role credential environment variable was found;
Supabase uses its publishable key for Auth/Storage. Server keys are not NEXT_PUBLIC_,
next.config.mjs does not inject environment secrets, and the reviewed browser import paths
do not include the database/auth/notification server modules. `.env` is ignored, untracked,
and has no commits in the inspected local Git history. `.env.example` contains placeholders.
This does not attest to remote repository history, older deployments or secrets outside
the scanned surfaces. No credential rotation is proposed without evidence of exposure.

## Approved SQL and validation

- `proposed/01-table-access.sql`: enable all table RLS, revoke client table/sequence grants,
  add restrictive deny policies; fail if an unreviewed public relation or ownership drift exists.
- `proposed/02-functions-and-defaults.sql`: narrow function execution and postgres defaults.
- `verify-after-approval.sql`: read-only permission/policy/sequence checks.

Both proposed changes use transactions and timeouts. No table data or migration history
is edited. Runtime owner access, service_role access and authenticated execution of the
Storage helper are preserved. The local runtime role was verified; deployed runtime
credentials must also be checked before applying.

The SQL was exercised in an isolated in-memory PostgreSQL engine, then promoted to the
versioned Prisma migration and applied successfully to the confirmed Supabase project.
There was no separate Supabase staging instance configured. Local Auth/Storage fixtures
tested policy behavior, not the actual Supabase upload service or Auth login flow.
Post-application live checks confirmed the actual policies, function behavior, permission
matrix, server reads and anonymous HTTP denials. No production checkout mutation,
authenticated admin write, upload or email send was attempted. Such end-to-end production
tests still require agreed test records and credentials; isolated validation and current
application unit tests cover the corresponding database/auth logic without business writes.

On an SQL error the active transaction rolls back. If a subsequent application check fails,
inspect the backend role/grants and restore only the specific required server permission;
do not reopen anonymous access or disable RLS as a blanket rollback.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[API privileges](https://supabase.com/docs/guides/api/securing-your-api),
[PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
