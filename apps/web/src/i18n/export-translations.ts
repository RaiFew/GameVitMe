/**
 * Writes docs/THAI_TRANSLATIONS.md from the string tables, so the reference can
 * never drift from what the site actually renders. Run from the repo root:
 *   npx tsx apps/web/src/i18n/export-translations.ts
 *
 * Regenerate whenever a key is added; it is not imported by the app.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en, th, type TranslationKey } from './dictionaries.js';

const GROUPS: Record<string, string> = {
  app: 'App',
  common: 'Common',
  nav: 'Navigation',
  home: 'Home page',
  login: 'Sign in',
  dashboard: 'Dashboard',
  games: 'Games catalogue',
  profile: 'Profile',
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../docs/THAI_TRANSLATIONS.md');

const keys = Object.keys(en) as TranslationKey[];

// Group by the key's first segment, in GROUPS order, then anything unlisted.
const seen: string[] = [];
const groups = new Map<string, TranslationKey[]>();
for (const key of keys) {
  const group = key.split('.')[0]!;
  if (!groups.has(group)) {
    groups.set(group, []);
    seen.push(group);
  }
  groups.get(group)!.push(key);
}
seen.sort((a, b) => {
  const ai = Object.keys(GROUPS).indexOf(a);
  const bi = Object.keys(GROUPS).indexOf(b);
  return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
});

const lines = [
  '# English → Thai',
  '',
  'Every user-facing string on the shell and core pages, with the Thai the site',
  'renders for it. Generated from `apps/web/src/i18n/dictionaries.ts` by',
  '`export-translations.ts` — edit the dictionary, not this file.',
  '',
  `**${keys.length} strings.** Game screens are still English; a follow-up pass adds them.`,
  '',
];

for (const group of seen) {
  lines.push(`## ${GROUPS[group] ?? group}`, '', '| English | ไทย |', '| --- | --- |');
  for (const key of groups.get(group)!) {
    lines.push(`| ${en[key]} | ${th[key]} |`);
  }
  lines.push('');
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${keys.length} strings to ${out}`);
