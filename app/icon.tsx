import { ImageResponse } from 'next/og';

/**
 * FILE47's own mark, as the tab icon.
 *
 * When FILE47 was a route inside the OS it inherited MKBLV's favicon, which is
 * the same leak as the share card and the title template — a client's site
 * wearing the builder's mark in every tab and bookmark. Standing on its own it
 * had none at all, which is a 404 on every page load and a blank square in the
 * browser.
 *
 * Drawn rather than shipped as a binary: `47` in the OSD register on the
 * studio's black, generated at build time by Next's file convention. No asset
 * to keep in step with the palette, and nothing licensed to commit.
 */
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0b',
        color: '#f2f04a',
        fontSize: 40,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        fontFamily: 'monospace',
      }}
    >
      47
    </div>,
    size,
  );
}
