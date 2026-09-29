import { createHash, timingSafeEqual } from 'node:crypto';
import type { SalemRole } from '../types/index.js';

/**
 * The server cannot check who is actually holding a physical role card, so
 * the claim is a self-asserted secret: the holder alone knows this passphrase.
 * The derived token is what gets stored, so neither the state nor a leaked
 * snapshot carries anything the player could not recompute themselves.
 *
 * This gates the digital action, not the card. It stops a casual tap from
 * locking the real Witch out of the round; it is not proof of identity.
 */
const PEPPER = process.env.SALEM_CLAIM_PEPPER || 'salem-claim-pepper';

export const MIN_PASSPHRASE_LENGTH = 4;

export function isValidPassphrase(passphrase: unknown): passphrase is string {
  return typeof passphrase === 'string' && passphrase.trim().length >= MIN_PASSPHRASE_LENGTH;
}

export function deriveRoleToken(
  role: SalemRole,
  round: number,
  playerId: string,
  passphrase: string
): string {
  return createHash('sha256')
    .update(`${PEPPER}|${role}|${round}|${playerId}|${passphrase}`)
    .digest('hex');
}

export function tokenMatches(expected: string, provided: unknown): boolean {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
