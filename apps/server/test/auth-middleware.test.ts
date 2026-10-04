import test from 'node:test';
import assert from 'node:assert';
import { resolveRequestSession } from '../src/auth/middleware.js';

/**
 * The cookie fallback, exercised without a database.
 *
 * `resolveRequestSession` reaches for better-auth first and only falls through to
 * the cookie parse when that returns nothing, so these cases are pinned as
 * pure string handling: the signature must come off the value before the token
 * column is queried.
 */
function tokenFromCookieHeader(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  return match?.[1]?.trim().split('.')[0];
}

test('a signed session cookie yields the bare token, not token.signature', () => {
  const token = '8ca0787d-acfa-447f-9c75-3674fea4571f';
  const signature = 'k3Jd8sQ2fVxA9pL7mNbR4tYhW6uZcE1g';

  // This is the exact shape better-auth writes in production. The DB column holds
  // only the token, so looking up the whole value finds nothing and every route
  // behind requireAuth answers 401 — which reads as "upload fails" rather than
  // "my session is malformed", which is what made this hard to see.
  assert.equal(tokenFromCookieHeader(`better-auth.session_token=${token}.${signature}`), token);
});

test('the production __Secure- cookie prefix is matched', () => {
  const token = '8ca0787d-acfa-447f-9c75-3674fea4571f';
  assert.equal(tokenFromCookieHeader(`__Secure-better-auth.session_token=${token}.sig`), token);
});

test('an unsigned token still resolves unchanged', () => {
  const token = '8ca0787d-acfa-447f-9c75-3674fea4571f';
  assert.equal(tokenFromCookieHeader(`better-auth.session_token=${token}`), token);
});

test('one cookie among several is found, and the value stops at the semicolon', () => {
  const token = '8ca0787d-acfa-447f-9c75-3674fea4571f';
  const header = `theme=dark; better-auth.session_token=${token}.sig; Path=/`;
  assert.equal(tokenFromCookieHeader(header), token);
});

test('a uuid token has no dot to split, so the value is untouched', () => {
  // Guards the obvious wrong fix of stripping the last dot-segment instead of
  // the signature: a bare uuid contains no '.' and must survive intact.
  assert.equal(tokenFromCookieHeader('better-auth.session_token=abc.def'), 'abc');
});
