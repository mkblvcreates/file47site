import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT, PRIVACY } from '@/lib/file47';
import './privacy.css';

/**
 * FILE47 — privacy notice.
 *
 * Every claim on this page is a statement about what the code on this site
 * actually does, checked against it. It got shorter when the booking flow lost
 * its server: there is no route to post to, no mail relay in the path, no rate
 * limiter holding a value derived from an address, and no reference number.
 * The form composes a `mailto:` in the browser and hands it to the visitor's
 * own mail client, so this site receives nothing at all. A privacy notice is
 * the one page a reader is entitled to take literally, so nothing here is
 * aspirational and nothing is boilerplate that happens not to be true.
 *
 * What MKBLV cannot know comes from `PRIVACY` in `lib/file47.ts` and renders as
 * TO CONFIRM until FILE47 supplies it. Both are supplied now — FILE.47, of
 * Denver, Colorado — and they stay separate fields so that having one can
 * never make the page assert the other.
 *
 * There is no retention period to state: the site keeps nothing, so the
 * only copy is the one in FILE47's inbox. Review with counsel before relying on
 * it as a compliance document.
 *
 * Its own route rather than the OS's `/privacy`: that page is MKBLV's, and
 * FILE47 is a client's site that is credited to MKBLV exactly once.
 */

const TITLE = 'FILE47 — privacy notice';
const DESCRIPTION =
  'What the booking form does with what you type, where it goes, and how to have it deleted.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: 'FILE47',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'FILE47',
    type: 'article',
    images: [],
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION, images: [] },
};

/** A value FILE47 has not supplied yet, marked rather than invented. */
function ToConfirm() {
  return <mark className="doc-todo">TO CONFIRM</mark>;
}

function Mail() {
  return <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>;
}

export default function File47PrivacyPage() {
  return (
    <main className="doc">
      <header className="doc-head">
        <Link href="/" className="doc-back">
          ← FILE47
        </Link>
        <span className="doc-date">UPDATED {PRIVACY.updated}</span>
      </header>

      <h1 className="doc-title">PRIVACY NOTICE</h1>

      <p className="doc-lede">
        This site has no accounts, sets no cookies and runs no analytics. It handles no
        personal information at all: the booking form opens your own mail app, and what
        you write goes from you to FILE47&rsquo;s inbox without passing through here.
      </p>

      <h2>Who this is</h2>
      <p>
        FILE47 is a design and brand services practice in {CONTACT.city}, reachable at{' '}
        <Mail />. Registered as {PRIVACY.entity ?? <ToConfirm />},{' '}
        {PRIVACY.address ?? <ToConfirm />}. The site is built and hosted for FILE47 by
        MKBLV.
      </p>

      <h2>What is collected</h2>
      <p>
        <strong>Nothing.</strong> This site has no server to send anything to. The booking
        form runs entirely in your browser: what you type stays on your device until you
        send it yourself.
      </p>
      <p>
        Pressing <strong>WRITE IT</strong> takes the fields you filled in — the service,
        your name, your contact, your organisation if you gave one, your brief, and the
        budget band — and opens your own mail application with that message written and
        addressed to <Mail />. You press send, in your own mail client, from your own
        address. Until you do, nobody has it but you.
      </p>
      <p>
        There is no account, no profile, and no hidden field. There is no reference
        number, because no record is created anywhere for one to point at.
      </p>

      <h2>What is not collected</h2>
      <ul>
        <li>No cookies are set by this site, on any page.</li>
        <li>No analytics, tracking pixels, session recording or advertising.</li>
        <li>No location, device fingerprinting or browsing history.</li>
        <li>
          Nothing is sold, rented, or shared for advertising — there is no mechanism here
          that could.
        </li>
      </ul>

      <h2>Where it goes</h2>
      <p>
        From your mail provider to FILE47 at <Mail />, the same way any email you write
        does. This site is not in that path and no third-party mail service is acting for
        it: there is no relay, no sending domain, and no delivery log here. Whoever
        carries your mail is whoever you already send mail through.
      </p>
      <p>
        This site keeps no database and makes no requests of its own. Nothing you type in
        the form is transmitted to it, before or after you send.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Your message stays in FILE47&rsquo;s inbox until FILE47 deletes it — and in your
        own Sent folder, which is yours. There is no third copy for this site to keep or
        to delete.
      </p>

      <h2>Your choices</h2>
      <p>
        Write to <Mail /> to ask what is held about you, to have it corrected, or to have
        it deleted. FILE47 will answer within 30 days.
      </p>
      <p>
        Depending on where you live you may have further rights — under the UK and EU
        GDPR, the California Consumer Privacy Act, or comparable law — including the right
        to complain to your data protection authority. FILE47 does not sell personal
        information as those laws define it.
      </p>

      <h2>Children</h2>
      <p>
        This site is not directed at children, and FILE47 does not knowingly collect
        information from anyone under 16.
      </p>

      <h2>Changes</h2>
      <p>
        The date at the top is the date this notice last changed. Material changes will be
        dated here rather than applied quietly.
      </p>

      <footer className="doc-foot">
        <Link href="/" className="doc-back">
          ← BACK TO FILE47
        </Link>
        <span>BUILT BY MKBLV</span>
      </footer>
    </main>
  );
}
