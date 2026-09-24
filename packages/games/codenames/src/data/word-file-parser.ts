export interface WordFileParseResult {
  success: boolean;
  words?: string[];
  wordCount?: number;
  format?: 'TXT' | 'CSV' | 'JSON';
  error?: string;
}

export const MIN_CODENAMES_WORDS = 25;
export const MAX_CODENAMES_WORDS = 5000;
export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export function parseWordFileContent(fileName: string, content: string): WordFileParseResult {
  if (!content || typeof content !== 'string') {
    return { success: false, error: 'File content is empty.' };
  }

  if (content.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: 'File size exceeds the 1MB limit.' };
  }

  const ext = fileName.toLowerCase().split('.').pop() || '';
  let format: 'TXT' | 'CSV' | 'JSON';
  let rawWords: string[] = [];

  try {
    if (ext === 'json') {
      format = 'JSON';
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        rawWords = parsed.map((item) => String(item || ''));
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.words)) {
        rawWords = parsed.words.map((item: unknown) => String(item || ''));
      } else {
        return { success: false, error: 'Invalid JSON structure: expected an array of strings or { words: [...] }' };
      }
    } else if (ext === 'csv') {
      format = 'CSV';
      // Split on newlines, then split on comma or semicolon
      const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      for (const line of lines) {
        const tokens = line.split(/[,;\t]/);
        for (const token of tokens) {
          rawWords.push(token);
        }
      }
    } else if (ext === 'txt') {
      format = 'TXT';
      const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      rawWords = lines;
    } else {
      return { success: false, error: `Unsupported file format ".${ext}". Please upload .txt, .csv, or .json.` };
    }
  } catch (err: any) {
    return { success: false, error: `Failed to parse file: ${err.message || 'Malformed file'}` };
  }

  // Normalize, clean, deduplicate
  const seen = new Set<string>();
  const normalizedWords: string[] = [];

  for (const raw of rawWords) {
    const trimmed = raw.trim().replace(/["']/g, ''); // strip quotes
    if (!trimmed) continue;
    // Disallow pure symbols or excessively long entries
    if (trimmed.length < 2 || trimmed.length > 30) continue;

    const upper = trimmed.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      normalizedWords.push(upper);
    }
  }

  if (normalizedWords.length < MIN_CODENAMES_WORDS) {
    return {
      success: false,
      format,
      wordCount: normalizedWords.length,
      error: `Not enough valid words. Found ${normalizedWords.length}, but at least ${MIN_CODENAMES_WORDS} are required to generate a 5x5 board.`,
    };
  }

  if (normalizedWords.length > MAX_CODENAMES_WORDS) {
    return {
      success: false,
      format,
      wordCount: normalizedWords.length,
      error: `Word count exceeds the maximum limit of ${MAX_CODENAMES_WORDS} words.`,
    };
  }

  return {
    success: true,
    format,
    words: normalizedWords,
    wordCount: normalizedWords.length,
  };
}
