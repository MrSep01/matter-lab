# Matter Lab

## GitHub Pages

The lesson, simulations, questions and all images can be published from GitHub.
Run `npm run build` to prepare `docs/`. Commit the generated `docs/`
and choose **Settings → Pages → Deploy from a branch → main → /docs → Save**.
The intended student address is `https://mrsep01.github.io/matter-lab/` after
GitHub confirms publication. Repository files alone do not activate Pages.

GitHub Pages hosts static files. The progress service continues at the existing
Sites address and uses the existing database. The server explicitly permits the
GitHub origin; every save still requires the student's private progress code.
The repository contains app source and schema only, never student records or codes.

Students moving from the previous address should copy their code from **Save &
continue**, then paste it into **Continue with a saved code** at the new address.
Browser storage is separate for each website, so a new address cannot automatically
read the old address's code. Existing online records are not erased or migrated.

If the save service is blocked on the school network, the GitHub lesson still
opens and keeps a device draft, but online sync and opening another device's code
will wait until the save service is reachable. Test both the lesson and the Saved
status on the school network before adopting the new address for a class.

Update files in `public/`, rebuild `docs/`, and commit both for future GitHub
updates. Preserve progress IDs and keys across releases.

## Existing Sites hosting

The student lesson is authored in `public/`. The existing progress service is
managed separately. Its private deployment configuration is intentionally excluded
from this public repository. The Worker source and database schema are included
for maintenance; GitHub Pages does not execute them.

Progress lives in D1. A random private progress code identifies an anonymous save;
the database stores only its SHA-256 hash. Codes are not put in URLs. Students can
use the same code on another device without an account. Browser storage holds the
code and a temporary draft/outbox for reconnecting after a network failure.

Preserve form IDs, radio group names and progress keys when changing styling or
updating the app. Do not include a release number in storage keys. Add explicit
mapping if a lesson activity's identity changes. Do not clear student rows during
builds or releases. Database changes use appended Drizzle migrations.

Saves merge changed fields using revision checks; stable mutation IDs make retries
idempotent. Server responses cannot replace edits made while a save was in flight.
Restoring a session leaves energy transfer paused. Saving an active session does
not interrupt its simulation.

Run `npm test` for the SQLite-backed progress service checks. Test real Safari
touch/keyboard behaviour separately when device/browser QA is available.
