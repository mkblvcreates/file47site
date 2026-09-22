import { File47Entry } from '@/components/File47Entry';

/**
 * FILE47's front door.
 *
 * FILE47 is the client's brand; MKBLV built the site and is credited once, on
 * the studio screen. Nothing here carries MKBLV's identity or borrows its
 * tokens.
 *
 * Public and unauthenticated: a prospective client has no account, and the
 * whole point is to be readable before any relationship exists.
 *
 * The metadata this page used to declare — an absolute title, FILE47's own
 * share card — was here to override an OS root layout it no longer has. The
 * layout beside this file states it once, for the whole site.
 */
export default function File47Page() {
  return <File47Entry />;
}
