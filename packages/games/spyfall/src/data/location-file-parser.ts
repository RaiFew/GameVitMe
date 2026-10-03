import type { LocationData } from './locations.js';

/**
 * An uploaded location set, as stored and as fed to `setup()`.
 *
 * Unlike a bare word list, an uploaded location has to carry its own roles --
 * there is no shared role pool for a custom place. The upload format is
 * therefore two-column CSV, one location per row:
 *
 *   Location,Role;Role;Role
 *   Submarine,Captain;Navigator;Engineer
 *
 * A location without roles would leave everyone holding the same role, so a
 * row with fewer than two is rejected rather than silently padded.
 */
export interface LocationFileParseResult {
  success: boolean;
  locations?: LocationData[];
  locationCount?: number;
  error?: string;
}

/** Matches the `locationCount` floor, so a valid upload can always fill the grid. */
export const MIN_SPYFALL_LOCATIONS = 8;
export const MAX_SPYFALL_LOCATIONS = 200;
export const MAX_LOCATION_ROLES = 12;
export const MAX_LOCATION_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

const MAX_NAME_LENGTH = 40;
const MAX_ROLE_LENGTH = 30;

export function parseLocationFileContent(fileName: string, content: string): LocationFileParseResult {
  if (!content || typeof content !== 'string') {
    return { success: false, error: 'File content is empty.' };
  }

  // Guard on bytes, not characters: `length` counts UTF-16 units, so a file of
  // multi-byte characters can be well over 1 MB while `length` is under it.
  if (Buffer.byteLength(content, 'utf8') > MAX_LOCATION_FILE_SIZE_BYTES) {
    return { success: false, error: 'File size exceeds the 1MB limit.' };
  }

  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext !== 'csv' && ext !== 'txt') {
    return { success: false, error: `Unsupported file format ".${ext}". Please upload a .csv or .txt file.` };
  }

  const seen = new Set<string>();
  const locations: LocationData[] = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    // A header row is the documented way to make the file self-describing.
    if (!line || line.toLowerCase().startsWith('location,')) continue;

    const comma = line.indexOf(',');
    if (comma === -1) {
      return {
        success: false,
        error: `Line "${line.slice(0, 40)}" is not "Location,Role;Role;Role".`,
      };
    }

    const name = line.slice(0, comma).trim().replace(/^["']|["']$/g, '');
    if (!name || name.length > MAX_NAME_LENGTH) continue;

    const roles = line
      .slice(comma + 1)
      .split(';')
      .map((r) => r.trim().replace(/^["']|["']$/g, ''))
      .filter((r) => r.length > 0 && r.length <= MAX_ROLE_LENGTH);

    if (roles.length < 2) {
      return {
        success: false,
        error: `"${name}" has ${roles.length} role(s). Each location needs at least 2, separated by ";".`,
      };
    }
    if (roles.length > MAX_LOCATION_ROLES) {
      return {
        success: false,
        error: `"${name}" has ${roles.length} roles. The maximum is ${MAX_LOCATION_ROLES}.`,
      };
    }

    // Dedupe on the name so a repeated location cannot appear twice in the
    // reference grid, but keep the roles as written -- role casing is the
    // author's, and no built-in set is consulted.
    const key = name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({ id: `custom-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, roles });
  }

  if (locations.length < MIN_SPYFALL_LOCATIONS) {
    return {
      success: false,
      locationCount: locations.length,
      error: `Not enough locations. Found ${locations.length}, but at least ${MIN_SPYFALL_LOCATIONS} are required.`,
    };
  }

  if (locations.length > MAX_SPYFALL_LOCATIONS) {
    return {
      success: false,
      locationCount: locations.length,
      error: `Location count exceeds the maximum of ${MAX_SPYFALL_LOCATIONS}.`,
    };
  }

  return { success: true, locations, locationCount: locations.length };
}