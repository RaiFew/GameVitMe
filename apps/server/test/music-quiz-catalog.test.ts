import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePreviewUrl } from '../src/music-quiz/catalog.js';

const realFetch = globalThis.fetch;

/** Answers each call in turn, so a test can hand back a degraded response and
 *  then a good one — which is what Deezer actually does under load. */
function stubFetch(replies: Array<Record<string, unknown>>) {
  let call = 0;
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(String(url));
    const body = replies[Math.min(call++, replies.length - 1)];
    return { ok: true, status: 200, json: async () => body } as unknown as Response;
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('resolvePreviewUrl', () => {
  test('asks again when Deezer omits the preview from a 200', async () => {
    // A lone request always has the field; only a burst loses it.
    const calls = stubFetch([{}, { preview: 'https://cdn/preview.mp3' }]);
    assert.equal(await resolvePreviewUrl('deezer', '42'), 'https://cdn/preview.mp3');
    assert.equal(calls.length, 2);
  });

  test('gives up after the retry rather than looping', async () => {
    const calls = stubFetch([{}]);
    assert.equal(await resolvePreviewUrl('deezer', '99'), null);
    assert.equal(calls.length, 2);
  });

  test('does not ask twice when the first answer is good', async () => {
    const calls = stubFetch([{ preview: 'https://cdn/ok.mp3' }]);
    assert.equal(await resolvePreviewUrl('deezer', '7'), 'https://cdn/ok.mp3');
    assert.equal(calls.length, 1);
  });

  test('a cached url is served without touching the provider', async () => {
    stubFetch([{ preview: 'https://cdn/cached.mp3' }]);
    assert.equal(await resolvePreviewUrl('deezer', '555'), 'https://cdn/cached.mp3');
    const calls = stubFetch([{ preview: 'https://cdn/other.mp3' }]);
    assert.equal(await resolvePreviewUrl('deezer', '555'), 'https://cdn/cached.mp3');
    assert.equal(calls.length, 0);
  });
});