import { describe, expect, it } from 'vitest';
import {
  BOOT_LINES,
  BOOT_STEP,
  CONTACT,
  SCREENS,
  SERVICES,
  STUDIO,
  bootLinesAt,
  isScreenId,
  mailtoBrief,
  serviceByN,
} from './file47';
import { PIECES } from './file47-room';

describe('services', () => {
  it('is five, numbered in order, one line each', () => {
    expect(SERVICES).toHaveLength(5);
    expect(SERVICES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
    for (const s of SERVICES) {
      expect(s.title).not.toBe('');
      expect(s.band).not.toBe('');
      // One line means one line. A service that needs a paragraph is two
      // services, or a conversation.
      expect(s.line.length).toBeLessThan(56);
      expect(s.line.split(' ').length).toBeLessThan(9);
    }
  });

  it('resolves by number', () => {
    expect(serviceByN(3)?.title).toBe('INTERFACE');
    expect(serviceByN(9)).toBeUndefined();
  });
});

describe('screens', () => {
  it('is four words of navigation, no more', () => {
    expect(SCREENS).toHaveLength(4);
    expect(SCREENS.map((s) => s.label)).toEqual(['WORK', 'SERVICES', 'STUDIO', 'BOOK']);
    for (const s of SCREENS) expect(isScreenId(s.id)).toBe(true);
    expect(isScreenId('nope')).toBe(false);
  });
});

describe('the whole site', () => {
  it('stays under two hundred words, which is the point of it', () => {
    const words = [
      ...SERVICES.flatMap((s) => [s.title, s.line]),
      ...PIECES.map((p) => p.label),
      ...SCREENS.map((s) => s.label),
      ...STUDIO.lines,
      STUDIO.credit,
    ]
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);

    expect(words.length).toBeLessThan(200);
  });
});

describe('boot', () => {
  it('is three lines and reveals them in order', () => {
    expect(BOOT_LINES).toHaveLength(3);
    expect(bootLinesAt(0)).toHaveLength(0);
    expect(bootLinesAt(BOOT_STEP)).toEqual([BOOT_LINES[0]]);
    expect(bootLinesAt(BOOT_STEP * 3)).toEqual([...BOOT_LINES]);
  });

  it('never hides the site for more than a couple of seconds', () => {
    expect(BOOT_LINES.length * BOOT_STEP).toBeLessThan(2000);
  });
});

describe('the brief as a mail link', () => {
  it('addresses the studio and carries every field the client filled in', () => {
    const url = new URL(
      mailtoBrief({
        service: 'ART DIRECTION',
        name: 'A. Client',
        contact: 'client@example.test',
        organization: 'Example Co',
        brief: 'A full identity system for a new label.',
        budgetBand: '15–40K',
      }),
    );

    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(CONTACT.email);

    // The subject is what the studio sees in a list of unread mail, so it
    // carries who it is from and what they are asking about.
    const subject = url.searchParams.get('subject') ?? '';
    expect(subject).toContain('FILE47');
    expect(subject).toContain('ART DIRECTION');
    expect(subject).toContain('A. Client');

    const body = url.searchParams.get('body') ?? '';
    for (const value of [
      'ART DIRECTION',
      'A. Client',
      'Example Co',
      'client@example.test',
      '15–40K',
      'A full identity system for a new label.',
    ]) {
      expect(body).toContain(value);
    }
  });

  it('omits the rows the client left blank rather than printing empty labels', () => {
    const body =
      new URL(
        mailtoBrief({
          service: 'IDENTITY',
          name: 'A',
          contact: 'a@b.test',
          brief: 'Short brief text here.',
        }),
      ).searchParams.get('body') ?? '';

    expect(body).not.toContain('ORG');
    expect(body).not.toContain('BUDGET');
  });

  it('carries no reference, because nothing is filed to refer to', () => {
    // A reference number is a promise that a record exists somewhere. Nothing
    // is stored anywhere in this flow, so there is nothing to look up and the
    // brief must not carry an id that implies otherwise.
    const url = new URL(
      mailtoBrief({
        service: 'RETAINER',
        name: 'A',
        contact: 'a@b.test',
        brief: 'Short brief text here.',
      }),
    );
    expect(url.searchParams.get('subject')).not.toMatch(/47-[A-Z0-9]{6}/);
    expect(url.searchParams.get('body')).not.toContain('REFERENCE');
  });
});
