import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateJigsawSettings } from '../src/rooms/settings-validation.js';
import { decodeImageHeader, decodeDataUrl, MAX_IMAGE_BYTES } from '../src/jigsaw/image-decode.js';
import { PIECES_BY_DIFFICULTY } from '@party/jigsaw';

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('validateJigsawSettings', () => {
  test('accepts a difficulty and derives the piece count from it', () => {
    const r = validateJigsawSettings({ difficulty: 'HARD' });
    assert.ok(r.ok);
    assert.equal(r.settings.difficulty, 'HARD');
    assert.equal(r.settings.pieceCount, PIECES_BY_DIFFICULTY.HARD);
  });

  test('a client cannot dictate the piece count', () => {
    const r = validateJigsawSettings({ difficulty: 'EASY', pieceCount: 96 });
    assert.ok(r.ok);
    assert.equal(r.settings.pieceCount, PIECES_BY_DIFFICULTY.EASY);
  });

  test('accepts a uuid image id and an explicit clear', () => {
    const r = validateJigsawSettings({ imageId: UUID });
    assert.ok(r.ok);
    assert.equal(r.settings.imageId, UUID);

    const cleared = validateJigsawSettings({ imageId: '' });
    assert.ok(cleared.ok);
    assert.equal(cleared.settings.imageId, null);
  });

  test('rejects a bad difficulty or a non-uuid image id', () => {
    const bad = [
      { difficulty: 'IMPOSSIBLE' },
      { difficulty: 12 },
      { difficulty: { $ne: null } },
      { imageId: "' OR 1=1 --" },
      { imageId: 'not-a-uuid' },
      { imageId: 42 },
      { imageId: { toString: 'x' } },
    ];
    for (const patch of bad) {
      assert.equal(validateJigsawSettings(patch).ok, false, `should reject ${JSON.stringify(patch)}`);
    }
  });

  test('drops unknown keys rather than rejecting them', () => {
    // `gameSettings` also carries the settings of other games once the host
    // changes game type, so a leftover key must not fail the whole patch.
    const r = validateJigsawSettings({ difficulty: 'EASY', variant: 'CHAOS', imageWidth: 9999 });
    assert.ok(r.ok);
    assert.equal(r.settings.variant, undefined);
    assert.equal(r.settings.imageWidth, undefined);
    // and the dimensions stay server-owned
    assert.equal(r.settings.imageWidth, undefined);
  });
});

/** Minimal but structurally valid headers — the parser never looks past them. */
function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function jpeg(width: number, height: number): Buffer {
  const b = Buffer.alloc(32);
  b[0] = 0xff;
  b[1] = 0xd8; // SOI
  // APP0: marker at 2, length field at 4, so its payload ends at 20 and the
  // next marker begins there.
  b[2] = 0xff;
  b[3] = 0xe0;
  b.writeUInt16BE(16, 4);
  b[20] = 0xff;
  b[21] = 0xc0; // SOF0
  b.writeUInt16BE(17, 22); // segment length, including these two bytes
  b[24] = 8; // sample precision
  b.writeUInt16BE(height, 25);
  b.writeUInt16BE(width, 27);
  return b;
}

describe('decodeImageHeader', () => {
  test('reads real dimensions from png and jpeg magic bytes', () => {
    const p = decodeImageHeader(png(1600, 900));
    assert.ok(p.ok);
    assert.deepEqual(p.image, { mimeType: 'image/png', width: 1600, height: 900 });

    const j = decodeImageHeader(jpeg(800, 600));
    assert.ok(j.ok);
    assert.deepEqual(j.image, { mimeType: 'image/jpeg', width: 800, height: 600 });
  });

  test('rejects something that is not an image at all', () => {
    for (const buf of [
      Buffer.from('GIF89a'),
      Buffer.from('<html><body>nope</body></html>'),
      Buffer.from('%PDF-1.7'),
      Buffer.alloc(0),
      // A png signature followed by nothing usable.
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ]) {
      assert.equal(decodeImageHeader(buf).ok, false);
    }
  });

  test('rejects dimensions that would break the grid or the layout', () => {
    assert.equal(decodeImageHeader(png(4, 4)).ok, false, 'too small');
    assert.equal(decodeImageHeader(png(9000, 100)).ok, false, 'edge too long');
    assert.equal(decodeImageHeader(png(5000, 5000)).ok, false, 'too many pixels');
    assert.equal(decodeImageHeader(png(0, 0)).ok, false);
  });

  test('rejects an oversized body', () => {
    assert.equal(decodeImageHeader(Buffer.alloc(MAX_IMAGE_BYTES + 1)).ok, false);
  });

  test('a truncated jpeg without a frame header is refused, not guessed at', () => {
    const b = Buffer.alloc(12);
    b[0] = 0xff;
    b[1] = 0xd8;
    b[2] = 0xff;
    b[3] = 0xda; // start of scan, before any frame header
    assert.equal(decodeImageHeader(b).ok, false);
  });
});

describe('decodeDataUrl', () => {
  const toDataUrl = (buf: Buffer) => `data:image/png;base64,${buf.toString('base64')}`;

  test('decodes a base64 data url', () => {
    const r = decodeDataUrl(toDataUrl(png(400, 300)));
    assert.ok(r.ok);
    assert.equal(r.image.width, 400);
  });

  test('the declared mime type is never believed', () => {
    // Claims JPEG, is a PNG — the bytes decide.
    const r = decodeDataUrl(`data:image/jpeg;base64,${png(400, 300).toString('base64')}`);
    assert.ok(r.ok);
    assert.equal(r.image.mimeType, 'image/png');
  });

  test('rejects a non-data-url body', () => {
    for (const body of [
      undefined,
      null,
      123,
      'https://example.com/x.png',
      'data:text/html;base64,PHNjcmlwdD4=',
      `data:image/png;base64,${'not base64!!'}`,
    ]) {
      assert.equal(decodeDataUrl(body).ok, false);
    }
  });
});
