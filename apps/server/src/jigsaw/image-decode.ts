/**
 * Image header inspection for jigsaw uploads.
 *
 * The engine lays the grid out from the stored width and height, so those must
 * come from the bytes rather than from the request body — a client that claims
 * `width: 4, height: 4` would otherwise get a 96-piece board out of a cell
 * either side. That makes this a trust boundary, so the declared MIME type is
 * never believed: the format is identified from the magic bytes and only the
 * matching header is parsed.
 *
 * Header parsing rather than a decoding library on purpose. Full decode would
 * mean a native dependency (sharp and friends) to learn three integers, and it
 * would also expose the server to decompression bombs we do not need to
 * understand — the byte and pixel caps below bound those.
 */

export interface ImageHeader {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 6000;
/** Beyond this a 1400px-wide client downscale is either absent or a lie. */
export const MAX_IMAGE_PIXELS = 16_000_000;

export type DecodeResult =
  | { ok: true; image: ImageHeader }
  | { ok: false; error: string };

function readU16BE(buf: Buffer, at: number): number {
  return buf.readUInt16BE(at);
}

function readU32BE(buf: Buffer, at: number): number {
  return buf.readUInt32BE(at);
}

/** JPEG: walk the marker chain to the first Start Of Frame. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let at = 2;
  while (at + 4 <= buf.length) {
    if (buf[at] !== 0xff) {
      at++;
      continue;
    }
    let marker = buf[at + 1]!;
    // Fill bytes: any run of 0xFF before the marker is not a new marker.
    while (marker === 0xff && at + 2 < buf.length) {
      at++;
      marker = buf[at + 1]!;
    }
    at += 2;

    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (at + 2 > buf.length) return null;

    const length = readU16BE(buf, at);
    if (length < 2) return null;

    // SOF0..SOF15, minus the three that are not frame headers.
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isSof) {
      if (at + 7 > buf.length) return null;
      return { height: readU16BE(buf, at + 3), width: readU16BE(buf, at + 5) };
    }
    // Entropy-coded data begins here; the frame header would already have been
    // found, so anything past it means the file is not what it claims.
    if (marker === 0xda) return null;
    at += length;
  }
  return null;
}

function pngSize(buf: Buffer): { width: number; height: number } | null {
  // 8-byte signature, then an IHDR chunk whose payload starts at 16.
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) return null;
  if (buf.readUInt32BE(12) !== 0x49484452) return null; // 'IHDR'
  return { width: readU32BE(buf, 16), height: readU32BE(buf, 20) };
}

function webpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;

  const chunk = buf.toString('ascii', 12, 16);

  if (chunk === 'VP8 ') {
    // Lossy: a 3-byte frame tag, then the 0x9d012a start code, then 14-bit dims.
    const at = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (at < 0 || at + 7 > buf.length) return null;
    return {
      width: buf.readUInt16LE(at + 3) & 0x3fff,
      height: buf.readUInt16LE(at + 5) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    // Lossless: one signature byte, then 14 bits of width-1 and height-1.
    if (buf[20] !== 0x2f || buf.length < 25) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (chunk === 'VP8X') {
    // Extended: 24-bit little-endian canvas dimensions, minus one.
    return {
      width: (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)) + 1,
      height: (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16)) + 1,
    };
  }

  return null;
}

/**
 * Identifies an image from its magic bytes and reads its real dimensions.
 * Rejects anything oversized or degenerate before it can reach the grid layout.
 */
export function decodeImageHeader(buf: Buffer): DecodeResult {
  if (buf.length === 0) return { ok: false, error: 'The image is empty.' };
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'The image is too large. Keep it under 2 MB.' };
  }

  let size: { width: number; height: number } | null = null;
  let mimeType: ImageHeader['mimeType'] | null = null;

  const png = pngSize(buf);
  const jpeg = png ? null : jpegSize(buf);
  const webp = png || jpeg ? null : webpSize(buf);

  if (png) {
    mimeType = 'image/png';
    size = png;
  } else if (jpeg) {
    mimeType = 'image/jpeg';
    size = jpeg;
  } else if (webp) {
    mimeType = 'image/webp';
    size = webp;
  }

  if (!mimeType || !size) {
    return { ok: false, error: 'Only JPEG, PNG and WebP images are supported.' };
  }

  if (size.width < 16 || size.height < 16) {
    return { ok: false, error: 'The image is too small to cut into pieces.' };
  }
  if (size.width > MAX_IMAGE_EDGE || size.height > MAX_IMAGE_EDGE) {
    return { ok: false, error: 'The image is too large.' };
  }
  if (size.width * size.height > MAX_IMAGE_PIXELS) {
    return { ok: false, error: 'The image has too many pixels.' };
  }

  return { ok: true, image: { mimeType, width: size.width, height: size.height } };
}

/** Splits a `data:<mime>;base64,<payload>` URL and decodes it. */
export function decodeDataUrl(dataUrl: unknown): DecodeResult {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'No image was uploaded.' };

  const match = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return { ok: false, error: 'The image must be a base64 data URL.' };

  let buf: Buffer;
  try {
    buf = Buffer.from(match[1]!, 'base64');
  } catch {
    return { ok: false, error: 'The image could not be decoded.' };
  }

  return decodeImageHeader(buf);
}