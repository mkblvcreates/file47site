# Decisions

The record of what was decided, and what was later reversed, in the order it
happened. Amendments are appended rather than folded in: a decision that was
wrong is more useful with the reasoning that made it look right still attached.

**Paths in the earlier entries are the paths as they were.** This site began as
a route inside MKBLV's OS monorepo and moved twice; a reference to `apps/file47`
or `apps/web` below describes where something lived at the time, not where it is
now. The final amendment is the move to this repository.

- Status: Accepted
- Opened: 2026-09-12

## Context

MKBLV OS is an authenticated operating system behind the Origin Gate. The
studio also needs an outward-facing surface for its design and brand services:
somewhere a prospective client, who by definition has no account, can read what
the practice does and book it.

That surface raises three questions the rest of the system has not had to
answer:

1. **Tenancy.** Every repository method takes an explicit `TenantContext`
   (ADR-003). A visitor has no session, so there is no tenant to resolve.
2. **Truthfulness.** CLAUDE.md forbids representing anything with fabricated
   data. A services site is the place that temptation is strongest — invented
   case studies, invented logos, invented results.
3. **Visual language.** The Pixelwave system is a midnight-glass OS surface. A
   public dossier read cold by a stranger is a different artifact.

## Decision

**A public route at `/file47`, outside the OS shell.** _(Superseded 2026-09-13
— see the second amendment.)_ It renders without a session and never redirects
to `/origin`. `app/os/layout.tsx` remains the access boundary for everything
operational; FILE47 sits beside it, not inside it.

**Intake has its own declared tenant.** `FILE47_TENANT`
(`org_file47` / `ws_file47_intake` / `public_intake`, in
`src/lib/file47-intake.ts`) is passed explicitly on every read and
write. The rule that there is no ambient tenant holds; what changes is that one
tenant is owned by the public surface rather than by a user. A brief can
therefore never land in — or be read from — an operator's workspace. Tenant
isolation for the new table is covered by a test in `packages/db`.

**The reference is the capability.** Filing returns `47-` plus six characters
drawn from `randomBytes` over an unambiguous alphabet (no `O`/`0`, `I`/`1`).
`GET /api/bookings?ref=` returns status, service, and filing date only —
never the contact details, organization, or brief text. Knowing a reference
proves you filed it; it does not re-open the contents.

**The archive is empty and says so.** Case-file records ship as declared slots
with `classification: 'REDACTED'` and no body. The sheet prints the true count
(`0/6 released`) and explains why. `DATA: CORRUPTED`, borrowed from the
reference visual language, is doing honest work here: it is the actual state of
an unreleased archive, not decoration over invented case studies. Rate bands are
labelled indicative; a number is committed in a written scope, and no payment
path exists on the page (financial actions are R5 under
`docs/SECURITY_GOVERNANCE.md` and are out of scope for a public surface).

**Delivery is email; the row is the record.** _(Amended 2026-09-12 — see
below.)_ Filing emails the brief to the studio and writes a row. The mail goes
first, because a brief that reaches a human has arrived and a row nobody is
watching has not. The confirmation panel renders only on a 2xx that carried a
reference, and it only says the brief was emailed when the relay said so — per
CLAUDE.md, an action is reported when the result confirms it and not before.
Filing still calls no connector and takes no payment.

**Its own visual register.** FILE47 inverts Pixelwave into printed matter: paper
ground, hard black rule, marker highlight, monospace stamps, square dashes,
CSS-drawn specimen plates. It carries electric indigo as the one shared signal
color so the sheet still reads as MKBLV. Because the root layout paints a fixed
starfield and pins `body { overflow: hidden }` for the OS shell, FILE47 opts
both out via `body:has(.f47)` — declarative, so there is no dark flash before
hydration.

## Amendment — 2026-09-12: intake is delivered by email

The original decision made a database row the delivery. In practice that was
the wrong promise: FILE47 is one studio, not an operations team watching a
queue, and the row only reaches them if someone opens a dashboard. Worse, on
the serverless host the site is deployed to, the row does not survive the
instance unless a hosted database is configured — so the honest version of the
original copy was "held on this server only, and lost on restart", which is not
a thing to say to someone who has just written out a brief.

**Briefs are emailed to the studio** (`src/lib/file47-mail.ts`), at
`CONTACT.email`, via Resend's HTTP API called directly with `fetch` — one JSON
POST is not worth an SDK dependency. Configured from `FILE47_MAIL_KEY` and
`FILE47_MAIL_FROM`, in the same env-gated shape as `google.ts`. The body is
`text/plain`: it is entirely untrusted input typed by a stranger, and plain text
has no markup for it to escape into. `Reply-To` is set to the sender's contact
when it parses as an address, so answering is one keystroke. The reference is
sent as the idempotency key, so a double POST is one email.

**The floor is a `mailto:` link.** `mailtoBrief` in `file47.ts` renders the same
brief as a link the visitor's own mail client opens, already addressed and
written. It needs no credentials, no relay and no database, and it is what the
confirmation panel offers whenever the send did not happen. A client who has
just written a brief is never handed an apology — they are handed their own
words with somewhere to put them. The address is also on the STUDIO screen and
above the SEND button, so nobody has to fill in a form to find out where to
write.

**The client-facing sentence carries no plumbing.** Whether the relay was
unconfigured or refused the message changes nothing a client can do, and it is
a sentence about us on a page that should be about them. Both failures read
"Nothing was emailed. Send it from your own mail below — everything you wrote is
already in it." The technical reason goes to an audit event
(`file47.intake.email_failed`), where an operator will look for it.

**Turso is now optional.** It buys one thing: the reference lookup answering
after a cold start. Intake no longer depends on it.

## Amendment — 2026-09-13: FILE47 is its own app and its own deployment

A route inside `apps/web` was the right call while FILE47 was a surface MKBLV
was designing. It is the wrong one for a client's site that is about to carry a
client's domain.

Three things made it wrong rather than merely untidy. The OS root layout's
`title.template` appended `· MKBLV WORLD` to every FILE47 page and its openGraph
card stood in for FILE47's, so sharing a link to a client's site produced MKBLV's
share card — patched at the leaf with `title: { absolute }` on each route, which
is a patch that has to be remembered on every route added afterwards. The layout
also paints a fixed starfield element that FILE47 had to opt out of with
`body:has(.rm) .mk-field { display: none }`. And a single Vercel project meant
one domain, one deploy history, one analytics view and one environment for two
products with different owners.

**`apps/file47` is a standalone Next.js app**, rooted at that directory in its
own Vercel project, still inside this monorepo and still using the workspace
packages it needs (`@mkblv/db` for the intake table, `@mkblv/domain` for
`TenantContext`). It has its own root layout, its own 404 — the OS's says
"RETURN TO SHELL" and links into `/os/dashboard`, which on a client's domain is
a dead end into somebody else's product — and its own `public/`, so the room,
the work and the OSD face are served from `/` rather than from `/file47/`.

`apps/web` no longer carries the route, the API, the components or the assets.
One home for the code, and no second copy to drift.

## Amendment — 2026-09-13: the intake keeps nothing

The email amendment above left the row in place as a secondary record. That row
is now gone, and it went because it broke the site.

`getStore()`'s fallback resolved `SQLITE_PATH` and called `mkdirSync` on it
without a guard. A serverless filesystem is read-only outside `/tmp`, so on the
first production deployment the call threw
`ENOENT: no such file or directory, mkdir '/var/task/.mkblv'` and
took the request with it: **`/api/bookings` answered 500 and no brief could be
filed at all.** The record was never the delivery — the previous amendment had
already established that — so a write that could only ever be ephemeral here was
being paid for with the endpoint itself.

**FILE47 now stores nothing.** `src/lib/store.ts` is deleted, the
route imports no store, `GET /api/bookings` is gone (the path answers 405), and
the CHECK-a-reference form is off the booking screen. A lookup against a ledger
that does not exist could only ever answer "not held", which reads to a sender
whose brief is in the studio's inbox as "you were never received" — the exact
failure the previous amendment worried about, now removed rather than worded
around. The reference survives as a handle quoted in the email's subject line
and its idempotency key, not as a key into a table.

The operator's record of an attempt is a runtime log line
(`file47.intake.emailed` / `file47.intake.email_failed`) carrying the reference
and the outcome and no contact details.

`packages/db` keeps `createFile47Booking`, `findFile47Booking` and the
`file47_bookings` table, unused by this site. They stay for the operator-side
queue view inside the OS, which is where a durable record belongs and where
somebody would actually watch it. Reintroducing a record on the client's site
means a hosted database and a privacy notice that says so again.

**The same defect was in `apps/web`.** `apps/web/src/lib/store.ts` had the
identical unguarded `mkdir`, and that app is deployed to Vercel too. Its
`chooseBacking` is now a pure, tested function of the environment that falls
back to `:memory:` — with a warning to the operator — when there is nowhere to
put a file, rather than throwing. `storeIsDurable()` is unchanged and still the
thing any surface must ask before promising a visitor their data was kept.

## Amendment — 2026-09-22: the intake has no server at all

The previous amendment removed the record and kept the send: a `POST` to
`/api/bookings` that relayed the brief through Resend, with a mailto link as the
fallback when no relay was configured. **The relay is gone. The mailto is the
whole flow.**

`WRITE IT` composes the brief into a `mailto:` in the browser and opens it. The
visitor presses send in their own mail client, from their own address. There is
no route, no rate limiter, no API key, no verified sending domain, and no
reference number.

### Why

The relay was carrying real cost for a worse result. It needed a key held in
every environment, a sending domain kept verified, and a deliverability problem
owned — and what it produced was mail arriving at the studio _from the studio_,
with the client's real address buried in the body, unreplyable without a
copy-paste, and with no copy in the client's own Sent folder.

It also never worked in production. `FILE47_MAIL_KEY` and `FILE47_MAIL_FROM`
were never set on the `file47-site` deployment, so every brief filed against the
live site took the fallback path — the fallback was the only path that had ever
run. Deleting the one that did not was removing a configuration burden that was
buying nothing.

### What it costs

**The site cannot know whether a brief was sent.** The visitor presses send
somewhere this page will never hear from. So the page does not claim it: the
confirmation says the message is written and waiting in their mail app and that
the last step is theirs, and it offers the link again because a browser with no
mail client registered swallows a `mailto:` in silence.

A visitor who abandons it at that point is a brief the studio never sees, and
neither does anything else — there is nowhere it could have been recorded.
That is the same trade the previous amendment accepted, now without the relay
that made it look otherwise.

### What it removes

- `apps/file47/app/api/bookings/route.ts` — the app has no dynamic route left
  and builds fully static.
- `src/lib/file47-mail.ts`, `file47-intake.ts`, and their tests.
- `isReference` / `REF_PATTERN` — nothing issues a reference to check.
- `FILE47_MAIL_KEY`, `FILE47_MAIL_FROM`, `FILE47_INBOX` from `.env.example`.
- Resend as a processor in the privacy notice. The only party carrying the mail
  is whoever the visitor already sends mail through.

## Amendment — 2026-09-22: its own repository

FILE47 leaves MKBLV's monorepo. This repository is the whole site.

The previous split made it a standalone app with its own Vercel project, which
solved the technical problem — no inherited layout, no shared build — but not
the handoff problem: giving the client their site still meant giving them
`mkblv-os-platform`, and with it MKBLV's product source, agent runtime,
architecture decisions and internal docs. A client should receive their site.

### What moved

`apps/file47/{app,src,public}` to the root, the converters to `scripts/`, the
end-to-end suite to `tests/e2e/`, and the four FILE47 documents to `docs/`.

It carried **no workspace imports** — `@mkblv/db` and `@mkblv/domain` were
dependencies left behind by the intake route deleted in the previous amendment,
and the shared ESLint preset was the only other tie. So nothing had to be
rewritten to make the move; the package simply stopped depending on things it
had stopped using.

### What is new here

**`work-source/`, and the Action that watches it.** Four folders, one per
discipline. Drop a file in one on GitHub, commit, and
`.github/workflows/work.yml` converts it, commits the results, and Vercel
redeploys. Adding work no longer needs a checkout, a toolchain or a person who
knows what `pdftoppm` is.

**The originals are committed.** `work-source/` holds every supplied file, so
the site rebuilds from its own sources: a clean checkout plus `pnpm work`
reproduces `public/work/` byte for byte — verified, 130 of 130 files identical.
That costs 37 MB in the repository and buys a handoff that cannot rot, which is
the right trade for a portfolio whose sources would otherwise live in one
person's Drive.

**`scripts/unnamed.mjs`.** A new piece is labelled from its filename, which is a
placeholder and not a name. This lists the ones still waiting, and both
workflows print it in their run summary. It is a report, not a gate: an unnamed
piece is on the site and working, it just has not been introduced properly.

### What it costs

The site no longer runs in MKBLV's CI alongside the OS, so a change to shared
conventions will not be caught here. It has its own CI, running the same gate,
which is the trade any extraction makes.

## Consequences

- The OS no longer carries the client's site at all, which is a stronger
  boundary than the one this ADR originally reached for.
- Two Vercel projects build from one repository, distinguished by root
  directory. Anything that assumes one deployment per repo (CI, preview URLs,
  env var management) has to account for that.
- One tenant in the system is not owned by a user. Anything that enumerates
  tenants (future admin views, exports, retention jobs) must expect it.
- Briefs contain personal data that arrives without an account, and this site
  never receives any of it. There is no processor in the path to name, no
  retention policy to write, and nothing here to delete: the copies are the one
  in FILE47's inbox and the one in the visitor's Sent folder.
- There is no rate limit because there is nothing to flood — no endpoint exists.
- The intake has no record of its own and cannot confirm delivery. A visitor who
  closes their mail client without pressing send is a brief nobody has. That is
  the accepted cost of a site with no server behind its form.
- `TURSO_DATABASE_URL` is no longer read by this app at all.
- `apps/file47` has no dynamic route and builds fully static, so the deployment
  needs no environment variables of any kind.
- Releasing a case study is a content change, not a code change: set a record's
  `classification` to `DECLASSIFIED` and write its `body`. The counts, the
  archive notice, and the tests all follow from the data.
