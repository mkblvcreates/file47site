/**
 * Which pieces are still showing a filename instead of a name.
 *
 * The converter can only uppercase a filename, and a filename is a working
 * name, not a client's: `sick.png` reads SICK on a portfolio whose artwork says
 * LOVSICK. `LABELS` in `src/lib/file47-room.ts` is where that judgement lives,
 * and a piece with no entry there falls back to its filename — legible, and
 * plainly a placeholder.
 *
 * This prints the ones still waiting. It is a report, not a gate: a piece
 * without a name is on the site and working, it is simply not introduced
 * properly yet. The Work action puts this in its run summary so nobody has to
 * go looking.
 *
 *   node scripts/unnamed.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(
  readFileSync(join(root, 'src/lib/file47-work.generated.json'), 'utf8'),
);
const source = readFileSync(join(root, 'src/lib/file47-room.ts'), 'utf8');

/**
 * The keys of the LABELS block.
 *
 * Read out of the source rather than imported, because this runs under plain
 * node and that file is TypeScript that imports JSON. Only the keys matter, and
 * a regex that over-matches would under-report — it would claim a piece is
 * named when it is not, which is the wrong way round for a reminder. Scoped to
 * the block so an id appearing elsewhere in the file cannot pass for a label.
 */
const block = /const LABELS: Readonly<Record<string, string>> = \{([\s\S]*?)\n\};/.exec(
  source,
);
if (!block) {
  console.log('Could not find the LABELS block in src/lib/file47-room.ts.');
  process.exit(0);
}
const named = new Set(
  [...block[1].matchAll(/^\s*'?([a-z0-9-]+)'?:\s*['"]/gm)].map((m) => m[1]),
);

const waiting = manifest.pieces.filter((p) => p.section && !named.has(p.id));

if (waiting.length === 0) {
  console.log('### Names\n\nEvery piece has a name. Nothing to do.');
  process.exit(0);
}

console.log(`### ${waiting.length} piece(s) still showing a filename\n`);
console.log('These are on the site and working, but labelled from the file they');
console.log('came from. Give each one a real name — read it off the artwork, not');
console.log('the filename — in `LABELS` in `src/lib/file47-room.ts`:\n');
console.log('```ts');
for (const p of waiting) {
  console.log(`  '${p.id}': '${p.label}', // ${p.section} · from ${p.source.file}`);
}
console.log('```');
