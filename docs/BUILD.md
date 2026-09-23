# FILE47 — client services site

FILE47 is a **client's** design and brand services site. MKBLV built it; MKBLV
is not in it. It carries no MKBLV identity, borrows no MKBLV tokens, and credits
the builder exactly once — `BUILT BY · MKBLV` on the studio spread.

**It is its own repository and its own deployment.** This is the whole site:
its own Next.js app, its own tests, its own converters, its own deploy history.
The client owns all of it, and there is no MKBLV source in here to own by
accident.

It got here in two moves. It was a route at `/file47` inside MKBLV's OS shell
first, and the inheritance leaked in three places: the OS root layout's title
template appended `· MKBLV WORLD` to every page, the OS's share card stood in
for FILE47's, and a fixed starfield was painted behind a site that had to opt
out of it. Each was patched at the leaf. Splitting it into its own app inside
that monorepo removed the patches; splitting it into this repository removed
the last reason a client would ever be handed MKBLV's product source. It
carried no workspace imports by the time it moved, so nothing had to be
rewritten to make the move — only the two dependencies a deleted API route had
left behind had to be dropped.

Everything below is the client's to replace: the palette, the section copy, the
deliverables, the phase shapes, and the name itself. `--signal` (the blue) is
still a placeholder; it survives only as the focus ring.

**Three colours, and each one says something different.** Black and the paper
grey are the ground. The marker yellow `#f2f04a` is _where you are_ — the
current tab, the open drawer, the selected piece. The pointer red `#ff3b2f` is
_what you are on_ — every hover and every keyboard focus, on both surfaces.
They used to be one colour, which meant a hovered row and the current tab said
the same thing in the same yellow and neither could be read at a glance.

The red is `:root { --pop }` in `file47.css`, deliberately not scoped to
`.f47`: the room's chrome and the plate sit outside that class, and a rule
naming a variable they cannot see is silently dropped rather than reported.
`#ff3b2f` and not a deeper red because the black ink stays on it at 5.55:1,
which clears AA — a red dark enough to need white text would have made every
hover swap two properties instead of one.

It is public, unauthenticated, and deliberately a different artifact from the OS
shell it was built alongside: printed matter that was _issued_.

The decisions that shaped this, and the ones that were reversed:
`docs/DECISIONS.md`.

## Deployment

|                   |                                                   |
| ----------------- | ------------------------------------------------- |
| Domain            | `file47.studio` — apex 308s to `www`              |
| DNS               | Cloudflare, pointed at Vercel                     |
| Vercel project    | `file47site` (`prj_BVKYVt9I6EDAPgxAUNUx5HnX9oEw`) |
| Repository        | `mkblvcreates/file47site`, git-linked             |
| Root directory    | the repository root                               |
| Production branch | `main`                                            |

Production is served from `main`. The domain is registered and resolved at
Cloudflare and points at Vercel, which holds the certificate and serves the
site. `file47site.vercel.app` still answers, and is the address to test against
when DNS is the thing in question.

**A note if those records are ever touched.** Cloudflare's proxy — the orange
cloud — in front of Vercel causes redirect loops and certificate failures
unless SSL/TLS is set to Full (strict). These records are DNS only, which is
why it works. Turning the proxy on is the one change that takes the site down
without anything in this repository changing.

**Environment.** None. The app has no dynamic route and no secret to
hold — the booking screen composes a `mailto:` in the browser, so there is no
mail key, no sending domain and no database. The whole app builds static. That
is worth keeping: a client site that cannot be broken by an unset variable
cannot be broken by an unset variable at 2am.

## The room

The site is one 3D room: a surveillance suite, a curved bank of some twenty
CRTs, equipment racks, a chair, cable runs. It is a licensed Sketchfab asset —
author, licence, and the compression pipeline that took it from 15 MB to
2.79 MB are in `docs/ROOM.md`. **Read the licence section there
before this route goes anywhere public**; the constraint is real and unresolved.

Everything in it is unlit with baked textures, so the scene adds no lights: the
bake is the lighting, and anything added only washes it out. The bake is a
yellow/black duotone close enough to FILE47's marker `#f2f04a` that the palette
needed no reconciliation. Luck, not design.

FILE47 carries **its own screen**, standing among the bank at the focal point
the monitor arc curves around. Nothing is mounted on a modelled monitor: the
meshes are `Object_0`…`Object_15`, no CRT is a named node, and two attempts at
locating screen faces by raycast landed on a bezel. Hanging a client's booking
form off a reverse-engineered weld is a foundation one re-export would break.

Two camera positions. Click the screen and the camera moves in until it fills
the frame; click back and you are at the operator's seat. Nothing orbits,
nothing free-flies. A client looking to hire a studio should never have to
learn to fly.

The screen is real DOM in CSS3D, not a texture — sharp type, and a booking form
that is a form rather than a picture of one. `GLASS_SCALE` maps the authored
720×540 screen onto it exactly; it is derived from the panel's dimensions and
drei's 40-pixels-per-world-unit transform, with a unit test holding the
mapping, because a scale dialled in by eye is how a screen ends up cropped or a
postage stamp in the middle of the room.

### Framing is fitted, never authored

`SHOTS` holds two hand-placed shots and neither is used as written. They are
seeds: `roomShot` and `shotForPanel` fit the real one to the viewport, and
three rules hold both.

**Fit both axes, not just the height.** A vertical field of view alone is a
desktop assumption. A 4:3 screen framed to fill the height of a phone held
upright is two-thirds wider than the frame, and the first thing to run off the
sides is the row of navigation across the top of it.

**Fit at the depth of the thing being framed.** The panels hang the better part
of a metre in front of the back wall and the frustum is narrower where they
are, so a shot fitted to the wall clipped the top row of work off every
viewport.

**Fit into what the sheet leaves, then aim.** Framing to the whole canvas and
nudging the aim afterwards frames the subject perfectly and then slides part of
it under the controls. The sheet's share of the frame comes out of the fit
first; the aim moves camera and target together, so the subject slides across
the frame square-on instead of going into keystone.

On a portrait phone there is no distance that both shows the whole bank and
fills the frame, so the trade is taken deliberately: the lens widens
(`PORTRAIT_FOV`), the pullback is capped (`PORTRAIT_PULLBACK`), the bank runs
off the sides, and the visitor is _in_ the room rather than across the street
from it. The strip in the sheet is the index of the work; the room is the place
it lives.

### When the glass is too small to read

Below roughly square (`GLASS_MIN_ASPECT`), the site comes **off** the CRT and
fills the viewport as ordinary DOM, with the room still behind it and a bezel
still around it. No camera move fixes a 4:3 screen in a 9:19.5 frame: fit its
height and the navigation leaves the frame, fit its width and 720px of authored
type renders at half size. Same component, same flow, same booking path — the
CRT is the setting, not the toll. The sheet steps away while the screen is up,
on the glass or off it, because a screen carrying its own four words of
navigation does not need a second menu across the bottom of it.

## The tube

The room is rendered into a **540-line buffer**, ordered-dithered with a
recursive Bayer 8×8, quantised to eight levels per channel, and blown back up
with no smoothing. That is the whole effect, and it is the same bargain a
sixth-generation console made: the buffer is small, so the dither does the
shading the colour depth cannot.

It is not decoration bolted on top. Rendering at device resolution and
dithering _that_ is a contradiction — the pattern vanishes into the pixel grid
and all that is left is the cost. The small buffer is also why the room runs on
a phone at all: the canvas is pinned to `dpr={1}` because the picture's
resolution is the buffer, not the display.

Written by hand in `File47Dither.tsx` rather than composed from an effects
library. It is twenty lines of shader; a library's version quirks are the
bigger liability.

**The treatment is not constant.** It is the room's material, not the work's.
When a piece of work fills the frame the buffer more than doubles in height and
the quantisation eases almost all the way out (`ditherFor`), so a client's
design is seen as it was made rather than reduced to a handful of levels per
channel.
Quantising someone's packaging to a sixth-generation palette is not a treatment
of the design, it is damage to it. The two settings are one damped uniform, so
the tube resolves rather than cuts, and the OSD readout clears off the picture
at the same moment for the same reason.

**One honest limit.** The pass dithers the WebGL frame only. The booking screen
is real DOM on the glass and the browser composites it above the canvas, out of
the shader's reach. It gets a matched treatment in CSS — same scanline pitch,
a dot grid standing in for the dither — deliberately lighter, because an
illegible form takes no bookings. The room can be a tube; the type cannot.

## The work, on screens

Fourteen of them hang on screens in a ring around FILE47's own: LUCILIGHT's
identity, mark and device, the DAT-STUFF dieline, two Houdini's tees, two
Crystal Clear Water sets, Bookie & Sons and LOVSICK lettering, the Día de los
Muertos campaign, and the Wrap Kings cards. They are textures
on planes inside the scene, so **at a distance the dither hits them like
everything else** — the work lives in the room rather than being pasted over
it.

Tapping one flies the camera to it and the tube resolves: the buffer goes to
1080 lines, the quantisation drops to a twelfth, the scanline to a whisper. The
framing is `shotForPanel` — sit on the panel's normal, at the distance where it
fills the frame the sheet leaves, less a margin — and unit tests hold every
panel inside the frame and clear of the sheet at seven viewport shapes.

**The wall is not the portfolio.** Sixty-five pieces are filed in the drawers;
fourteen of them also have a screen. Those were two views of one list until the
list stopped fitting: the room has fourteen slots composed by hand against its
geometry, so tying the index to the wall meant everything else the studio
supplied — three quarters of it — existed as files on disk and appeared nowhere
a visitor could reach. `WORK` is now the whole archive, read straight from the
generated manifest, and `PIECES` is the subset with a placement. A drawer shows
the whole shelf, wall pieces first. See `docs/WORK.md`.

**Every mode gets it.** The flat page's WORK tab used to be a reel of six drawn
marks — a placeholder from before there was real work to show, which meant
anyone who took the flat route (a phone on data saver, reduced motion, or just
the FLAT button) was looking at a portfolio site with no portfolio in it. It is
the real archive now, as an index you tap into, and it opens the same plate
with the same zoom. In the room the camera flies to the piece and the room's
plate opens; flat, the plate fills the screen. One component either way.

### The plate — a piece, close up

The camera move is the transition. The picture you actually read is a **plate
in DOM**, opened over the room: the HD master at up to 2560px, at the device's
own resolution, with pinch, wheel, drag and double-tap.

It has to be DOM, not the canvas. The canvas runs at `dpr={1}` because the
room's picture _is_ the small dither buffer — so showing fine detail is the one
thing it can never do, no matter how sharp the texture. Same reasoning that
takes the booking screen off the glass on a narrow frame: when something has to
be _read_, it comes off the CRT.

Inset rather than full-bleed, so the dithered room stays visible around it: the
work is being looked at in the room, not in a lightbox that replaced it. The
label, the zoom readout and the how-to sit **under** the picture and never on
it — a hint printed across a client's design is the same objection the dither
was.

Two rules, both in `file47-zoom.ts` and unit-tested:

- **You cannot zoom past the pixels that exist.** The ceiling is the master's
  own resolution times the device pixel ratio. Past that a viewer is showing a
  guess about somebody's work.
- **Zoom is only offered where it does something.** Any master smaller than its
  frame is upscaled to fit, so on a retina screen even a 251px page technically
  has ~1.4× of headroom back to its own pixels — and a pinch that moves almost
  nothing reads as a broken site. Below `WORTH_ZOOMING` the plate says
  `FULL SIZE` and means it. Nothing on the wall is in that case today; see
  `docs/WORK.md`.

The room's own 512px texture sits underneath as the first frame — already
decoded, the same picture at less resolution, which beats a spinner.

Provenance and sizes: `docs/WORK.md`.

## The overlay — a HUD, not a chrome

The interface over the room is a game HUD, set in an OSD face.

- **Four corner brackets** frame the picture. They are inert and hidden from
  assistive tech: every control they draw the eye to is a real element
  somewhere else.
- **`CH47 · 00:00:00 · ● REC`** counts from the moment you arrive. It is
  written straight to the node on an interval rather than held in state — a
  timecode in state re-renders the tree once a second for the whole visit,
  which is a real tax to pay for atmosphere.
- **`[ WORK ]` / `SERVICES`** take brackets rather than a pill, the selected
  one only.
- **Slot numbers and a `▶` cursor** on the menu, so the strip reads as a rack
  and the list as something you move a cursor down.
- **One key-press button.** `BOOK A PROJECT` presses in rather than clicking
  through.

The OSD readout belongs to the room, so it clears off while a piece of work is
filling the frame — a timecode printed across a client's packaging is the same
objection as the dither.

**The flat screen keeps a way back.** It was a 10px ghost label in the bottom
corner, which on a phone — where the flat screen fills the viewport — is a
control nobody finds, and being unable to get back reads as the site losing the
room rather than as a preference being honoured. It is now the same toggle as
the room's own `FLAT` control, in the same register, at a fingertip's size,
with the reason beside it when the room was withheld rather than chosen. Still
gated on WebGL: a door into a room the device cannot render is a broken thing
to offer.

Chrome measurements are published by `ResizeObserver` rather than guessed:
`--top`, the top bar's height, which the site starts below when it comes off
the glass and which the landscape sheet hangs from; and `--sheet-h` /
`--sheet-w`, the sheet's measured size. Each was hard-coded once and each was
wrong — the lower brackets were buried behind the sheet, the screen's own
navigation ran underneath the OSD readout.

The stylesheet, not the measurement, decides what those mean: `.rm` derives
`--sheet` (how much of the bottom edge is covered) and `--rail` (how much of
the left edge) from them, and the landscape rule flips both. That indirection
is load-bearing — an inline style beats a media query, so publishing one number
straight into `--sheet` silently overrode the landscape rule and parked the
lower corner brackets two-thirds of the way up a desktop screen.

## The OSD face

`VCR OSD Mono`, the face a VCR burned into the top of the picture.

Supplied by MKBLV and converted here from the 76 KB TTF to an 18 KB WOFF2 at
`/file47/fonts/vcr-osd-mono.woff2`. Verified loading and in use locally:
`document.fonts` reports it loaded and the same string measures 352px in it
against 361px in the fallback.

**The binary is committed under a named exception.** `.gitignore` blocks
`*.woff2` and `.claude/rules/security.md` forbids committing font binaries;
`scripts/import-local-fonts.sh` permits it once distribution rights are
confirmed, and MKBLV confirmed them for this copy on 2026-09-12. The negation
names one path, so every other font — including this face under any other
filename — is still blocked. Deleting the file and that line reverses it, and
the fallback takes over. See `public/fonts/README.md`.

`@font-face` resolves `local('VCR OSD Mono')` first, so a machine that has the
face installed fetches nothing; then the served file; then the platform's
monospace.

It is declared at `font-weight: 100 900` from a single Regular cut. The HUD asks
for 700, and a face declared only at 400 gets synthesised into a fake bold by
smearing the outlines — on a face built from hard pixel stems that is precisely
the wrong failure.

The paper booking screen keeps its own mono stack. An OSD face on a form the
client types into costs legibility the room can afford and the form cannot.

## Navigation — built for a thumb

One sheet, in the bottom third, where a hand already is.

- **WORK** — four drawers (LOGOS, PRODUCTION, CLOTHING, MARKETING), then the
  whole shelf inside one of them, wall pieces first.
- **SERVICES** — five rows; tapping one opens the booking screen with that
  service already selected.
- **BOOK A PROJECT** — always in the same place, always the same words.

Nothing important sits in the top corners and no control is under 44px. There
are three places to be and no fourth — the room, a piece of work, the booking
screen — and every one of them is one tap from the sheet. No menu opens another
menu. `Escape` always goes back.

From 760px up the same sheet becomes a column against the left edge and the
camera steps left so the room slides out from behind it. The order of the
controls never changes between the two.

**The room is no longer withheld from phones.** It was, on width alone, which
withheld it from most of the people who will ever open this. A 540-line buffer
and an unlit scene is something a phone runs comfortably.

## The screen

Four words of navigation. That is the whole menu.

- **WORK** — a reel of drawn specimens: mark, type, colour, grid, halftone,
  separation. Click either half to move, or use the arrow keys. A number, a tag,
  six dots. No captions.
- **SERVICES** — five rows, one line each, a band letter. Clicking a row books
  it.
- **STUDIO** — two lines and the build credit.
- **BOOK** — five fields and one button, which hands the brief to your mail app.

**The whole site is under two hundred words, and a unit test keeps it there.** A
design studio is judged on what it shows, so the specimens carry the argument
and the copy stays out of their way. If a line is not doing work, delete it.

## The flat page

The identical screen component, rendered on a page. It is the automatic choice
without WebGL, with reduced motion, on a narrow screen, on a connection asking
for less data, and the fallback if the scene throws. An e2e test asserts the whole booking flow works there with no
canvas on the page at all — nothing about hiring this studio depends on a GPU.

**Flat is the panel pulled closer, not a different page.** Where the frame has
room for it, the flat view is the authored 720x540 screen scaled up and centred
with dark around it — a CSS `transform`, so it is pixel-for-pixel what the room
maps onto the glass, every rule and type size in the same proportion. Fitting
it by layout instead would reflow it, and the flat page would drift into being
a second design sharing a stylesheet. `flatScale` fits it on both axes, so the
whole screen is always in the window and the page never scrolls; long lists
scroll inside the screen, as they do on the glass.

It was a fixed 820x620 box — neither the panel's shape nor big enough to be
worth leaving the room for — and full-bleed below 760px.

`flatFitsPanel` decides which treatment applies, and it asks the scale rather
than the aspect. A phone held sideways is 844x390: wide enough to pass the
glass aspect test, nowhere near tall enough for 540 rows, so the panel would
come out at two thirds size and leaving the room would make the screen
_smaller_. At a scale of 1 or under the screen fills the frame instead, which
is what a portrait phone already got and for the same reason.

`decideMode` makes the call and says why in plain words. A visitor's own choice
always beats the heuristics. Where the device cannot run the room at all, the
offer to enter it is withheld.

**Arriving means arriving in the room.** The choice is held in `sessionStorage`,
so it lasts the visit and no longer. It used to be `localStorage`: someone who
dropped to flat once to read something got the flat page for good, on a site
whose whole argument is the room, with nothing on screen to explain why it had
gone. The old key is cleared on read so returning visitors are not stranded on
it, and an e2e test arrives with `file47.mode=flat` in `localStorage` and
asserts a canvas.

## Truthfulness rules this surface holds to

These are load-bearing, not stylistic. `tests/e2e/file47.spec.ts` asserts each.

- **The archive is empty and says so.** Case-file records are declared slots
  with `classification: 'REDACTED'` and no body. The sheet prints the real count
  (`0/6 released`). `DATA: CORRUPTED` is the honest state of an unreleased
  archive, not decoration over invented case studies.
- **Rate bands are indicative.** They describe the shape of an engagement. A
  committed number appears in a written scope. No payment is taken anywhere on
  the page.
- **The page never says a brief was sent.** It cannot know — the send happens
  in the visitor's own mail client. So the confirmation says what did happen:
  the message is written and waiting there, and the last press is theirs. It
  states outright that nothing was sent from the page and nothing was stored
  on it, and it repeats the link for a browser that swallowed the `mailto:`.
- **Nothing claims a record that does not exist.** The site stores no briefs,
  so it offers no status lookup and issues no reference. A reference number is
  a promise that something was filed somewhere; nothing is. A CHECK box
  against a ledger that is not there could only ever answer "not held", which
  reads to a sender whose brief is in the studio's inbox as "you were never
  received".

## Releasing a case study

A content change, not a code change. In `src/lib/file47.ts`, set the record's
`classification` to `DECLASSIFIED` and write its `body`. The archive counts, the
notice text, and the tests all follow from the data.

## Intake — where a brief goes

**Email is the delivery, and there is nothing else.**

A brief that reaches a human at FILE47 has arrived. A row in a database that
nobody is watching has not. This site keeps no database at all — and, since
2026-09-22, no server either.

**The booking screen sends nothing.** `WRITE IT` builds the brief into a
`mailto:` with `mailtoBrief` and opens it; the visitor presses send in their
own mail client, from their own address. There is no `POST`, no route, no rate
limiter, no API key and no reference number. See the third amendment in
`docs/DECISIONS.md`.

It used to relay through Resend, and that was worse mail for more work: a key
to hold in every environment, a sending domain to keep verified, a
deliverability problem to own — and a message arriving at the studio _from the
studio_, with the client's real address in the body, unreplyable without a
copy-paste and absent from the client's own Sent folder. A mailto arrives from
the client, so replying works, and they keep a copy. It also never actually ran
in production: the two variables were never set on `file47-site`, so every live
brief had always taken the mailto path.

### What that costs, and how the page handles it

**The site cannot know whether the mail was sent.** The last step happens
somewhere this page will never hear from. So it does not claim it. The
confirmation names the service, says the brief is written and waiting in the
visitor's mail app, and says the send is theirs to press — and it repeats the
link, because a browser with no mail client registered swallows a `mailto:` in
silence and a visitor who saw nothing happen needs somewhere to go.

It also says, in as many words, that nothing was sent from the page and nothing
was stored on it. That is the truthfulness rule this surface is built on, and
here it costs nothing to keep, because it is simply what happened.

The address is on the STUDIO screen and under the form as well, so nobody has
to fill anything in to learn where to write.

### Outstanding

- The FILE47 e2e suite does not run in CI. Most of it drives the WebGL room,
  which needs a software rasteriser on a runner and would be a flaky gate
  rather than a useful one; the unit tests do run there. The flat-path
  specs — the work index, the plate, the booking flow, the privacy notice —
  need no WebGL and should be split out into a CI-safe project.
- An operator-side view of the queue inside the OS. `@mkblv/db` still carries
  `createFile47Booking` / `findFile47Booking` and the `file47_bookings` table,
  unused by this site and left in place for whenever that view is built; a
  queue view needs a hosted database (`TURSO_DATABASE_URL`) behind it, and
  bringing one back means saying so in the privacy notice again.
- A shared rate limiter if intake volume grows.
