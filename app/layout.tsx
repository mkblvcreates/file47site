import type { Metadata, Viewport } from 'next';

/**
 * FILE47 — the root of a client's site.
 *
 * Deliberately almost nothing. When FILE47 lived as a route inside the MKBLV
 * OS app it inherited that app's root layout, and the inheritance leaked:
 * the title template appended "· MKBLV WORLD" to every page, the OS's share
 * card stood in for FILE47's, and a fixed starfield element was painted behind
 * a site that has to opt out of it. Every one of those was patched at the leaf.
 * Standing on its own, there is nothing to patch — this layout says what FILE47
 * is and nothing else.
 */

const TITLE = 'FILE47 — design + brand services';
const DESCRIPTION = 'Identity, art direction, interface, print. Book a section.';

export const metadata: Metadata = {
  // A plain string, not a template: a client's pages are titled by the
  // client's pages, and this is the title for the ones that set none.
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'FILE47',
  openGraph: {
    type: 'website',
    siteName: 'FILE47',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  /* The ground the room sits on, so a phone's chrome matches it. */
  themeColor: '#07060a',
  colorScheme: 'dark',
};

export default function File47Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
