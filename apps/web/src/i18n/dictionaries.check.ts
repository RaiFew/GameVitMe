/**
 * Self-check for the Thai/English tables. Run with: npx tsx src/i18n/dictionaries.check.ts
 * The tables are plain data, so the only things that can silently break are a
 * missing Thai string, a key typo, and a broken {placeholder}.
 */
import { translate, en, th, type TranslationKey } from './dictionaries.js';

const results: string[] = [];
const check = (name: string, ok: boolean) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);

const enKeys = Object.keys(en) as TranslationKey[];

// A Thai table that is missing or inventing a key is the failure this guards.
const missing = enKeys.filter((k) => !th[k]);
const extra = (Object.keys(th) as string[]).filter((k) => !(k in en));
check(`every one of ${enKeys.length} English keys has a Thai string`, missing.length === 0);
if (missing.length) results.push(`      missing: ${missing.join(', ')}`);
check('Thai invents no key English does not have', extra.length === 0);
if (extra.length) results.push(`      extra: ${extra.join(', ')}`);

check('English translates itself', translate('en', 'nav.games') === 'Games');
check('Thai actually differs from English', translate('th', 'nav.games') === 'เกม');

// The auto-detect default must be reachable, so Thai cannot be the fallback.
check('an unknown key falls back to English text', translate('th', 'nope' as TranslationKey) === 'nope');

check(
  'placeholders are filled',
  translate('th', 'dashboard.friendsOnline', { count: 3 }).includes('3'),
);
check(
  'a missing placeholder variable is left visible rather than printing undefined',
  translate('en', 'dashboard.friendsOnline', {}).includes('{count}'),
);
check(
  'Thai does not leak an English sentence for a translated key',
  !translate('th', 'dashboard.errJoinTimeout').includes('timed out'),
);

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
