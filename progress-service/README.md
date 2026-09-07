# Independent progress saving

This service runs in the owner's Cloudflare account using Workers and D1.
The lesson stays on GitHub Pages. No ChatGPT login or Sites runtime is required
by the new service. It exposes only `/api/progress` and `/health`.

**Status: prepared, not provisioned or activated.** The live lesson still uses
the existing save service until the replacement is deployed, data is transferred,
and the GitHub Pages configuration is switched.

## Provision in the owner's account

1. Create a Cloudflare account and use the official Wrangler login flow.
2. From `progress-service/`, run `npx wrangler login` and
   `npx wrangler d1 create matter-lab-progress`.
3. Run `node configure.mjs DATABASE_UUID` with the UUID returned by Cloudflare.
   The generated `wrangler.json` is ignored by Git. Do not paste API tokens into
   source files or chat.
4. Apply the schema: `npx wrangler d1 migrations apply matter-lab-progress --remote`.
5. Deploy: `npx wrangler deploy`. Retain the actual HTTPS URL it returns.
6. Check `/health`, then verify a test code can save and reopen from the school
   network and from a second browser. Check preflight and error responses too.
   A successful deployment alone does not prove school-network accessibility.
   If the default domain is restricted, arrange an IT-approved custom domain.

The API retains the same 256-bit private progress codes, SHA-256 identifiers,
field keys and database schema. Browser access is restricted to the exact
GitHub origin `https://mrsep01.github.io` (and same-origin requests).
No cookies, teacher accounts, or new student accounts are required.

## Transfer existing progress before switching

1. Agree a short changeover window without student edits. Preserve a private
   backup of the old database. The account owner must export all rows of
   `lesson_progress` through authorized administration tools, including every
   page of results. Keep records out of this public repository and logs.
2. Use an empty destination database for the initial transfer. Supply the export
   as a JSON array (or `{ "rows": [...] }`) with the five original columns:
   `key_hash`, `state`, `revision`, `recent_mutations`, `updated_at`.
3. From the repository root run
   `node scripts/prepare-progress-import.mjs /private/path/export.json`.
4. From `progress-service/`, import using
   `npx wrangler d1 execute matter-lab-progress --remote --file ../.private-progress/import.sql`.
   Retrying skips matching identifiers and never overwrites destination saves.
   A newer source snapshot needs explicit reconciliation, not a blind retry.
5. Verify record counts and an owner-controlled test record, including matching
   state, revision and timestamps. Test the old private code against the new API.
   Do not infer migration success merely from the import command returning.
6. Set `progressApi` in root `progress-config.json` to the new service's exact
   HTTPS `/api/progress` URL. Run `npm run build`, then commit the configuration
   and generated `docs/index.html` together. No frontend code edit is needed.
7. Verify GitHub Pages displays **Saved**, survives refresh and reopens the same
   work on a second device. Keep the old database as a backup during verification;
   do not delete it or direct students to keep editing the old lesson address.

Keeping the same GitHub origin preserves each device's code and draft. Copying
the original hashes lets previously issued codes continue working. A draft on
an offline device syncs to the new API when that device reloads the updated app.
Do not clear browser storage as part of the transfer.

## Updates

Run `node --test tests/*.test.mjs` before a change. Schema changes must use new
migration files. Releases must never recreate the database or change progress
keys. Back up the independent database before data migrations.

References: [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/),
[schema migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[data import](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
