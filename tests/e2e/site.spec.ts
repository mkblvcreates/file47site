import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { WORK, workInSection } from '../../src/lib/file47-room';

/**
 * How many tiles a drawer shows: the whole shelf, plus the tile back out of it.
 *
 * Counted from the site's own archive rather than written down, because the
 * archive grows every time the studio hands over more work and a number typed
 * here would have to be chased each time. What is being proved is that a
 * drawer holds the shelf — not that the shelf is any particular size.
 */
const PRODUCTION_TILES = workInSection('production').length + 1;

/**
 * FILE47 — a client's design and brand services site.
 *
 * Its own app (apps/file47) and its own Vercel project, so these run against
 * `/` on their own server: on the client's domain the site is the site, not a
 * route inside somebody else's product.
 *
 * The site is a room with a CRT, and the site is on the CRT's glass. Three
 * things are worth proving. That it is genuinely public. That the room is never
 * in the way of hiring the studio — the identical screen renders on a page for
 * anyone who cannot have the room, and it books. And that the copy stays short,
 * because a design studio is judged on what it shows.
 */

/**
 * Pins the mode before the page loads. The site picks between the room and the
 * flat page from what the device reports, which would otherwise make every test
 * depend on whether the runner has WebGL. A mode chosen during a visit is held
 * in `sessionStorage`, so the tests use the same door — and the fact that it is
 * session-scoped is what makes every fresh arrival land in the room.
 */
async function useMode(page: Page, mode: 'room' | 'flat') {
  await page.addInitScript((m) => {
    try {
      window.sessionStorage.setItem('file47.mode', m);
    } catch {
      /* the default decision applies */
    }
  }, mode);
}

async function flat(page: Page) {
  await useMode(page, 'flat');
  await page.goto('/');
  await expect(page.locator('.f47')).toBeVisible();
}

async function room(page: Page) {
  await useMode(page, 'room');
  await page.goto('/');
  await expect(page.locator('.rm canvas')).toBeVisible();
}

const nav = (page: Page) => page.locator('.f47-nav button');

/**
 * WORK opens on four drawers now, so a spec that wants a piece has to open one
 * first. Named rather than inlined — a dozen specs need the same two taps, and
 * they should all break in one place if the shelf changes.
 */
async function openDrawer(page: Page, name = 'PRODUCTION') {
  await page.locator('.f47-folder', { hasText: name }).click();
  await expect(page.locator('.f47-grid button').first()).toBeVisible();
}

/** The same, in the room's sheet. */
async function openRoomDrawer(page: Page, name = 'PRODUCTION') {
  await page.locator('.rm-drawer', { hasText: name }).click();
}

/** The studio's own address. Kept here so a change to it fails a test. */
const EMAIL = 'file47studios@pm.me';

test.describe('FILE47', () => {
  test('is public, and opens on the work', async ({ page }) => {
    await flat(page);
    await expect(page).toHaveURL('/');
    await expect(nav(page)).toHaveCount(4);
    await expect(nav(page).first()).toHaveAttribute('aria-current', 'true');
    // Four drawers, not sixty-five pieces in a pile. Filed by discipline, the
    // first screen answers "do you do what I need" instead of asking a visitor
    // to sort other people's clients themselves.
    await expect(page.locator('.f47-folder')).toHaveCount(4);
    await expect(page.locator('.f47-grid button')).toHaveCount(0);

    // And every piece is still reachable — each drawer holds some, none is
    // empty, and together they account for the whole archive rather than for
    // the fourteen that happened to get a screen in the room.
    let counted = 0;
    for (const name of ['LOGOS', 'PRODUCTION', 'CLOTHING', 'MARKETING']) {
      await openDrawer(page, name);
      const n = await page.locator('.f47-grid button').count();
      expect(n, `${name} is empty`).toBeGreaterThan(0);
      counted += n;
      await page.getByRole('button', { name: /ALL WORK/ }).click();
    }
    expect(counted).toBe(WORK.length);
  });

  test('the flat page opens a piece at full resolution, and zooms it', async ({
    page,
  }) => {
    // The whole point of this one. Anyone who takes the flat route — a phone
    // on data saver, reduced motion, or just the FLAT button — must get the
    // same HD viewer the room has, not a portfolio they cannot look at.
    await flat(page);
    await openDrawer(page);
    await page.locator('.f47-grid button').first().click();

    const master = page.locator('.pl--flat .pl-img:not(.pl-img--placeholder)');
    await expect(master).toBeVisible();
    await expect(master).toHaveAttribute('src', /\/work\/hd\//);
    // Bigger than the wall texture is the whole claim — 512 on the long edge
    // is what the room hangs, and anything larger came from /work/hd/.
    expect(
      await master.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(512);

    await expect(page.locator('.pl-zoom')).toHaveText('FIT');
    await page.locator('.pl-frame').dblclick();
    await expect(page.locator('.pl-zoom')).not.toHaveText('FIT');

    await page.getByRole('button', { name: 'FIT', exact: true }).click();
    await page.getByRole('button', { name: 'CLOSE' }).click();
    // Back to the drawer it was opened from, not all the way out to the shelf.
    await expect(page.locator('.f47-grid button').first()).toBeVisible();
  });

  test('the way back into the room never sits on top of a piece', async ({ page }) => {
    // `.rm-flat` is fixed, so it makes its own stacking context and the plate's
    // z-index is scoped inside it — which put the floating return control above
    // a full-screen plate and swallowed taps meant for CLOSE.
    await flat(page);
    await expect(page.getByRole('button', { name: /ENTER THE ROOM/ })).toBeVisible();
    await openDrawer(page);
    await page.locator('.f47-grid button').first().click();
    await expect(page.locator('.pl--flat')).toBeVisible();
    await expect(page.getByRole('button', { name: /ENTER THE ROOM/ })).toBeHidden();
  });

  test('services is five lines, and each one books', async ({ page }) => {
    await flat(page);
    await nav(page).filter({ hasText: 'SERVICES' }).click();

    const rows = page.locator('.f47-row');
    await expect(rows).toHaveCount(5);
    await expect(
      page.getByText('Bands are indicative. Booking costs nothing.'),
    ).toBeVisible();

    await rows.nth(2).click();
    await expect(page.locator('#f47-service')).toHaveValue('3');
  });

  test('the studio screen is two lines, the direct line, and one credit', async ({
    page,
  }) => {
    await flat(page);
    await nav(page).filter({ hasText: 'STUDIO' }).click();
    await expect(page.locator('.f47-studio p')).toHaveCount(2);
    await expect(page.getByText('BUILT BY MKBLV')).toBeVisible();

    // The address is on the site, not only behind the form. A client who would
    // rather just write an email should not have to fill in a form to find out
    // where to write.
    await expect(page.locator(`.f47-contact a[href="mailto:${EMAIL}"]`)).toBeVisible();
  });

  test('offers the studio address before the form is filled in', async ({ page }) => {
    await flat(page);
    await nav(page).filter({ hasText: 'BOOK' }).click();
    await expect(page.locator(`.f47-book a[href="mailto:${EMAIL}"]`)).toBeVisible();
  });

  test('hands the brief to the mail client, and never says it was sent', async ({
    page,
  }) => {
    await flat(page);
    await nav(page).filter({ hasText: 'BOOK' }).click();

    await page.fill('#f47-name', 'E2E Sender');
    await page.fill('#f47-contact', 'e2e@example.test');
    await page.fill('#f47-brief', 'We need an identity system for a launch next spring.');

    // The button navigates to a mailto:, which a headless browser has no
    // handler for. Intercepted so the click does not hang the test on a
    // navigation that can never resolve.
    const opened: string[] = [];
    await page.route('mailto:**', (r) => {
      opened.push(r.request().url());
      return r.abort();
    });
    await page.getByRole('button', { name: 'WRITE IT' }).click();

    // The confirmation names the kind of enquiry, not a reference number:
    // nothing was filed anywhere, so there is nothing to refer to.
    await expect(page.locator('.f47-ref')).toHaveText('IDENTITY');
    await expect(page.locator('.f47-ref')).not.toHaveText(/47-[0-9A-Z]{6}/);

    // It must not claim a send it cannot possibly know about — the visitor
    // presses send somewhere this page never hears from. This is the
    // truthfulness rule the whole intake path exists to hold.
    await expect(page.getByText(/waiting in your mail app/i)).toBeVisible();
    await expect(page.getByText(/Nothing was sent from this page/i)).toBeVisible();
    await expect(page.getByText(/\bsent to\b|\bwe received\b|\bfiled\b/i)).toHaveCount(0);

    // And the link again, because a browser with no mail client registered
    // swallows a mailto: in silence.
    const send = page.getByRole('link', { name: /OPEN IT AGAIN/ });
    await expect(send).toBeVisible();

    const href = await send.getAttribute('href');
    expect(href).not.toBeNull();
    const url = new URL(href!);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(EMAIL);

    // Every word they typed is in it, and it says what they are asking about.
    expect(url.searchParams.get('subject')).toContain('IDENTITY');
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('We need an identity system for a launch next spring.');
    expect(body).toContain('E2E Sender');
    expect(body).toContain('e2e@example.test');
    expect(body).toContain('IDENTITY');
  });

  test('offers no status lookup, because there is nothing to look up', async ({
    page,
  }) => {
    await flat(page);
    await nav(page).filter({ hasText: 'BOOK' }).click();

    // The site keeps no records — it never receives a brief in the first
    // place. A CHECK box against a ledger that does not exist could only ever
    // answer "not held", which reads to a sender whose brief is sitting in the
    // studio's inbox as "you were never received".
    await expect(page.locator('#f47-ref')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'CHECK' })).toHaveCount(0);
  });

  test('has no intake endpoint at all — there is nothing to post to', async ({
    request,
  }) => {
    // The booking flow is a mailto composed in the browser. If a route ever
    // reappears here, something is quietly accepting personal data again and
    // the privacy notice stops being true.
    for (const res of [
      await request.get('/api/bookings'),
      await request.post('/api/bookings', { data: { name: 'X' } }),
    ]) {
      expect(res.status()).toBe(404);
    }
  });

  test('the room books a service from the sheet, on the glass @room', async ({
    page,
  }) => {
    await room(page);

    // Everything this site does is in the sheet, in the thumb's reach.
    const tabs = page.locator('.rm-tabs button');
    await expect(tabs).toHaveCount(2, { timeout: 30000 });
    await tabs.filter({ hasText: 'SERVICES' }).click();

    const rows = page.locator('.rm-list button');
    await expect(rows).toHaveCount(5);
    await rows.nth(2).click();

    await expect(page.locator('.rm-glass #f47-service')).toHaveValue('3', {
      timeout: 30000,
    });
    await expect(page.locator('.rm-glass #f47-name')).toBeVisible();

    // And back out again.
    await page.getByRole('button', { name: '← BACK' }).click();
    await expect(page.locator('.rm-tabs button')).toHaveCount(2, { timeout: 30000 });
  });

  test('the work is on screens in the room, and every piece is reachable @room', async ({
    page,
  }) => {
    await room(page);
    // Four drawers first, then what is in one — the whole shelf, plus the
    // tile that goes back — a count, not a floor, so a piece that stops
    // rendering is a failure rather than something nobody notices.
    await expect(page.locator('.rm-drawer')).toHaveCount(4, { timeout: 30000 });
    await openRoomDrawer(page);
    const tiles = page.locator('.rm-strip button');
    await expect(tiles).toHaveCount(PRODUCTION_TILES, { timeout: 30000 });

    // Every tile shows the work itself, not a placeholder.
    for (const img of await page.locator('.rm-strip img').all()) {
      expect(
        await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      ).toBeGreaterThan(0);
    }

    // Tapping a piece opens it and names it. One tap, no menu — index 0 is the
    // way back out of the drawer, so the first piece is 1.
    await tiles.nth(1).click();
    await expect(page.locator('.pl-label')).toContainText('LUCILIGHT', {
      timeout: 30000,
    });
  });

  test('one button books, from anywhere in the room @room', async ({ page }) => {
    await room(page);
    await page.getByRole('button', { name: 'BOOK A PROJECT' }).click();
    await expect(page.locator('.rm-glass #f47-name')).toBeVisible({ timeout: 30000 });
  });

  test.describe('on a phone held upright', () => {
    // The shape that broke it. A 4:3 screen authored at 720x540, framed inside
    // a 9:19.5 viewport, is the whole mobile problem: fit its height and the
    // navigation runs off both sides, fit its width and the type is half size.
    test.use({ viewport: { width: 390, height: 844 } });

    test('brings the site off the glass rather than cropping it @room', async ({
      page,
    }) => {
      await room(page);
      await page.getByRole('button', { name: 'BOOK A PROJECT' }).click();

      // Off the CRT and onto the viewport — same component, same flow.
      const form = page.locator('.rm-console #f47-name');
      await expect(form).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.rm-glass')).toHaveCount(0);

      // And every one of the four words of navigation is on screen, which is
      // the thing that used to be framed off the sides.
      const tabs = page.locator('.rm-console .f47-nav button');
      await expect(tabs).toHaveCount(4);
      for (const tab of await tabs.all()) {
        const box = await tab.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(391);
        // A fingertip, not a hyperlink.
        expect(box!.height).toBeGreaterThanOrEqual(32);
      }
    });

    test('takes the sheet away while the screen is up, and brings it back @room', async ({
      page,
    }) => {
      await room(page);
      await expect(page.locator('.rm-tabs button')).toHaveCount(2, { timeout: 30000 });

      await page.getByRole('button', { name: 'BOOK A PROJECT' }).click();
      await expect(page.locator('.rm-console')).toBeVisible({ timeout: 30000 });
      // The screen carries its own navigation; a second menu across the bottom
      // of it is what made the docked view read as two sites at once.
      await expect(page.locator('.rm-sheet')).toHaveCount(0);

      await page.getByRole('button', { name: '\u2190 BACK' }).click();
      await expect(page.locator('.rm-tabs button')).toHaveCount(2, { timeout: 30000 });
    });

    test('shows a piece of work whole, and clear of the sheet @room', async ({
      page,
    }) => {
      await room(page);
      await openRoomDrawer(page);
      const tiles = page.locator('.rm-strip button');
      await expect(tiles).toHaveCount(PRODUCTION_TILES, { timeout: 30000 });
      // Index 0 is the way back out of the drawer; 1 is the first piece.
      await tiles.nth(1).click();
      await expect(page.locator('.pl-label')).toContainText('LUCILIGHT', {
        timeout: 30000,
      });

      // The plate sits between the top bar and the sheet, on their measured
      // heights — a hard-coded sheet height is what used to park things behind
      // the controls on exactly this viewport.
      const plate = await page.locator('.pl').boundingBox();
      const sheet = await page.locator('.rm-sheet').boundingBox();
      const bar = await page.locator('.rm-top').boundingBox();
      expect(plate).not.toBeNull();
      expect(sheet).not.toBeNull();
      expect(plate!.y + plate!.height).toBeLessThanOrEqual(sheet!.y + 1);
      expect(plate!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1);

      // And the picture is whole: the master fits inside its frame.
      const img = await page.locator('.pl-img:not(.pl-img--placeholder)').boundingBox();
      const frame = await page.locator('.pl-frame').boundingBox();
      expect(img!.width).toBeLessThanOrEqual(frame!.width + 1);
      expect(img!.height).toBeLessThanOrEqual(frame!.height + 1);
    });
  });

  test('arrives in the room, even for someone who chose flat last time @room', async ({
    page,
  }) => {
    // Arriving at FILE47 means arriving in the room: it is the site, and the
    // flat page is the way through for a device that cannot have it. A visitor
    // who dropped to flat once used to get flat for good, because the choice
    // was written to localStorage — the room was gone and nothing said why.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('file47.mode', 'flat');
      } catch {
        /* nothing to strand them with, then */
      }
    });
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  });

  test('the room is never the only way to the offer', async ({ page }) => {
    // The scene is a 2.8 MB licensed asset behind a capability check. Every
    // service and the whole booking flow exist without it.
    await flat(page);
    await expect(page.locator('canvas')).toHaveCount(0);
    await nav(page).filter({ hasText: 'SERVICES' }).click();
    await expect(page.locator('.f47-row')).toHaveCount(5);
  });

  test('the flat page carries the whole booking flow with no canvas at all', async ({
    page,
  }) => {
    await flat(page);
    await expect(page.locator('canvas')).toHaveCount(0);
    await nav(page).filter({ hasText: 'BOOK' }).click();
    await expect(page.getByRole('button', { name: 'WRITE IT' })).toBeVisible();
  });

  test('carries its own name on the link, not the studio that built it', async ({
    page,
  }) => {
    await flat(page);
    // The root layout appends "· MKBLV WORLD" to every title and sets the OS's
    // share cards. A client's site inherits neither.
    await expect(page).toHaveTitle('FILE47 — design + brand services');
    const og = async (prop: string) =>
      page.locator(`meta[property="${prop}"]`).first().getAttribute('content');
    expect(await og('og:site_name')).toBe('FILE47');
    expect(await og('og:title')).not.toContain('MKBLV');
  });

  test('has no serious or critical accessibility violations', async ({ page }) => {
    await flat(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
  test.describe('looking closely at a piece', () => {
    test('opens the HD master, not the 512px texture off the wall @room', async ({
      page,
    }) => {
      await room(page);
      await openRoomDrawer(page);
      const tiles = page.locator('.rm-strip button');
      await expect(tiles).toHaveCount(PRODUCTION_TILES, { timeout: 30000 });
      // Index 0 is the way back out of the drawer; 1 is the first piece.
      await tiles.nth(1).click();

      const master = page.locator('.pl-img:not(.pl-img--placeholder)');
      await expect(master).toBeVisible({ timeout: 30000 });
      await expect(master).toHaveAttribute('src', /\/work\/hd\//);

      // The room's texture is 512 on the long edge — enough for a dithered CRT
      // face and nowhere near enough to zoom into. This is the master.
      const natural = await master.evaluate((el: HTMLImageElement) => ({
        w: el.naturalWidth,
        h: el.naturalHeight,
      }));
      expect(Math.max(natural.w, natural.h)).toBeGreaterThan(512);
    });

    test('zooms in and comes back to fit @room', async ({ page }) => {
      await room(page);
      await openRoomDrawer(page);
      await expect(page.locator('.rm-strip button')).toHaveCount(PRODUCTION_TILES, {
        timeout: 30000,
      });
      await page.locator('.rm-strip button').nth(1).click();
      await expect(page.locator('.pl-zoom')).toHaveText('FIT', { timeout: 30000 });

      await page.locator('.pl-frame').dblclick();
      await expect(page.locator('.pl-zoom')).not.toHaveText('FIT');

      await page.getByRole('button', { name: 'FIT', exact: true }).click();
      await expect(page.locator('.pl-zoom')).toHaveText('FIT');
    });

    test('never prints anything over the work @room', async ({ page }) => {
      await room(page);
      await openRoomDrawer(page);
      await expect(page.locator('.rm-strip button')).toHaveCount(PRODUCTION_TILES, {
        timeout: 30000,
      });
      await page.locator('.rm-strip button').nth(1).click();
      await expect(page.locator('.pl-frame')).toBeVisible({ timeout: 30000 });

      // The dither came off the work because it was our texture on their design.
      // A hint printed across it is the same objection, so the tip and the
      // controls live under the picture, not on it.
      const frame = await page.locator('.pl-frame').boundingBox();
      const tip = await page.locator('.pl-tip').boundingBox();
      expect(frame).not.toBeNull();
      expect(tip).not.toBeNull();
      expect(tip!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height - 1);
    });

    test('gives every piece on the wall something worth zooming @room', async ({
      page,
    }) => {
      await room(page);
      await openRoomDrawer(page);
      const tiles = page.locator('.rm-strip button');
      await expect(tiles).toHaveCount(PRODUCTION_TILES, { timeout: 30000 });

      // This used to assert the opposite for two DAT-STUFF pages, whose source
      // is vector and whose only rasteriser here returned a flat frame. It
      // renders properly now, so nothing on this wall opens without a master
      // and none of them should read FULL SIZE. The masterless path itself is
      // still real and still covered — see canZoom in file47-zoom.test.ts.
      // 0 is the way back, so the pieces start at 1.
      for (const i of [1, 2, 4]) {
        await tiles.nth(i).click();
        await expect(page.locator('.pl-zoom')).toHaveText('FIT', { timeout: 30000 });
        await page.getByRole('button', { name: 'CLOSE', exact: true }).click();
      }
    });
  });

  test.describe('getting back to the room', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the flat screen keeps a way back, at a fingertip size @room', async ({
      page,
    }) => {
      await flat(page);

      // This was a 10px ghost label in a corner. On a phone the flat screen fills
      // the viewport, so that is a control nobody finds — and being unable to get
      // back reads as the site losing the room, not as a preference honoured.
      const back = page.getByRole('button', { name: /ENTER THE ROOM/ });
      await expect(back).toBeVisible();
      const box = await back.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width).toBeLessThanOrEqual(391);

      await back.click();
      await expect(page.locator('.rm canvas')).toBeVisible({ timeout: 30000 });
    });

    test('and the room keeps a way out, so the toggle goes both ways @room', async ({
      page,
    }) => {
      await room(page);
      await expect(page.locator('.rm-tabs button')).toHaveCount(2, { timeout: 30000 });
      await page.getByRole('button', { name: 'FLAT', exact: true }).click();
      await expect(page.locator('.f47')).toBeVisible();
      await expect(page.getByRole('button', { name: /ENTER THE ROOM/ })).toBeVisible();
    });
  });

  test.describe('the privacy notice', () => {
    test('is reachable from the booking screen and carries FILE47 on the link', async ({
      page,
    }) => {
      await flat(page);
      await nav(page).filter({ hasText: 'BOOK' }).click();
      await page.getByRole('link', { name: /What happens to it/ }).click();

      await expect(page).toHaveURL('/privacy');
      // The client's site, not the studio that built it — the root layout would
      // otherwise append "· MKBLV WORLD".
      await expect(page).toHaveTitle('FILE47 — privacy notice');
      await expect(page.locator('.doc-title')).toHaveText('PRIVACY NOTICE');
    });

    test('says where a brief goes, and offers the way to have it deleted', async ({
      page,
    }) => {
      await page.goto('/privacy');
      // There is no processor in the delivery path any more — the brief goes
      // from the visitor's own mail provider to the studio, and this site is
      // not in it. Naming one would be as wrong as omitting one was.
      await expect(page.getByText(/Resend/)).toHaveCount(0);
      await expect(page.getByText(/no server to send anything to/i)).toBeVisible();
      await expect(page.locator(`a[href="mailto:${EMAIL}"]`).first()).toBeVisible();
      await expect(page.getByText(/deleted/)).toBeVisible();
    });

    test('marks what FILE47 has not supplied rather than inventing it', async ({
      page,
    }) => {
      await page.goto('/privacy');
      // What FILE47 has not supplied, the page says it has not supplied — on
      // the one page a reader takes literally, a plausible invention is the
      // worst possible failure.
      //
      // The registered name arrived, so it is printed. The address has not, so
      // one mark is left. They are separate fields for exactly this reason:
      // when the two shared one, supplying the name would have made the page
      // assert an address nobody had given.
      await expect(page.getByText(/Registered name: FILE\.47/)).toBeVisible();
      await expect(page.locator('.doc-todo')).toHaveCount(1);
      await expect(page.getByText(/Registered address:/)).toBeVisible();
      await expect(page.getByText(/keeps no database/)).toBeVisible();
    });

    test('gets back to the site without a dead end', async ({ page }) => {
      await page.goto('/privacy');
      await page.getByRole('link', { name: '← BACK TO FILE47' }).click();
      await expect(page).toHaveURL('/');
    });

    test('has no serious or critical accessibility violations', async ({ page }) => {
      await page.goto('/privacy');
      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      expect(serious.map((v) => v.id)).toEqual([]);
    });
  });
});
