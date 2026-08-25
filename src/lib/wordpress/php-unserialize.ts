/**
 * A small, purpose-built parser for PHP's serialize() format.
 *
 * Why this exists: the Traveler WordPress theme's REST API returns some
 * fields (day-by-day itinerary, FAQ, map coordinates) as PHP's native
 * serialized-array text format instead of JSON, e.g.:
 *   a:2:{i:0;a:2:{s:5:"title";s:9:"Day One";s:4:"desc";s:11:"<p>Hi</p>";}}
 * There's no built-in way to read that in JavaScript, and pulling in a
 * general-purpose PHP-serialization library for four fields felt like
 * more dependency than the job needs -- this covers exactly the types
 * this API actually sends (arrays, strings, integers, doubles, booleans,
 * null) and nothing else.
 *
 * Throws on anything it doesn't recognize, on purpose: silently returning
 * partial/wrong data for a field like pricing would be worse than a
 * visible sync error.
 */
export function phpUnserialize(input: string): unknown {
  const state = { str: input, pos: 0 };
  const value = parseValue(state);
  return value;
}

interface ParseState {
  str: string;
  pos: number;
}

function parseValue(state: ParseState): unknown {
  const type = state.str[state.pos];
  switch (type) {
    case "a":
      return parseArray(state);
    case "s":
      return parseString(state);
    case "i":
      return parseInt_(state);
    case "d":
      return parseDouble(state);
    case "b":
      return parseBool(state);
    case "N":
      expect(state, "N;");
      return null;
    default:
      throw new Error(
        `phpUnserialize: unsupported type "${type}" at position ${state.pos}`
      );
  }
}

function readUntil(state: ParseState, char: string): string {
  const idx = state.str.indexOf(char, state.pos);
  if (idx === -1) {
    throw new Error(`phpUnserialize: expected "${char}" after position ${state.pos}`);
  }
  const result = state.str.slice(state.pos, idx);
  state.pos = idx + 1;
  return result;
}

function expect(state: ParseState, literal: string) {
  const actual = state.str.slice(state.pos, state.pos + literal.length);
  if (actual !== literal) {
    throw new Error(
      `phpUnserialize: expected "${literal}" at position ${state.pos}, got "${actual}"`
    );
  }
  state.pos += literal.length;
}

function parseInt_(state: ParseState): number {
  expect(state, "i:");
  const digits = readUntil(state, ";");
  return parseInt(digits, 10);
}

function parseDouble(state: ParseState): number {
  expect(state, "d:");
  const digits = readUntil(state, ";");
  return parseFloat(digits);
}

function parseBool(state: ParseState): boolean {
  expect(state, "b:");
  const digit = readUntil(state, ";");
  return digit === "1";
}

function parseString(state: ParseState): string {
  expect(state, "s:");
  const lengthStr = readUntil(state, ":");
  // PHP's declared length is a BYTE length (UTF-8), not a JS character
  // count, so we can't just slice by `length` when the string has any
  // multi-byte characters (accents, curly quotes, emoji -- all common in
  // real tour descriptions). Decode from the byte offset instead.
  const byteLength = parseInt(lengthStr, 10);
  expect(state, '"');
  const bytes = Buffer.from(state.str.slice(state.pos), "utf-8");
  const value = bytes.subarray(0, byteLength).toString("utf-8");
  // Advance state.pos by the equivalent number of UTF-16 code units, not
  // bytes -- re-decode just the consumed slice to find that length.
  state.pos += value.length;
  expect(state, '";');
  return value;
}

function parseArray(state: ParseState): unknown[] | Record<string, unknown> {
  expect(state, "a:");
  const countStr = readUntil(state, ":");
  const count = parseInt(countStr, 10);
  expect(state, "{");

  const entries: [unknown, unknown][] = [];
  for (let i = 0; i < count; i++) {
    const key = parseValue(state);
    const value = parseValue(state);
    entries.push([key, value]);
  }
  expect(state, "}");

  // PHP arrays are ordered maps. If the keys are exactly 0..n-1 in order
  // (the common case for these list-like fields), return a plain JS
  // array; otherwise return a plain object so no information is lost.
  const isPlainList = entries.every(([key], i) => key === i);
  if (isPlainList) {
    return entries.map(([, value]) => value);
  }
  const obj: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    obj[String(key)] = value;
  }
  return obj;
}

/** Convenience wrapper: parses and returns `undefined` instead of
 * throwing, for optional fields where a malformed value shouldn't fail
 * the whole sync -- callers that need to know about failures should call
 * `phpUnserialize` directly instead. */
export function tryPhpUnserialize(input: string | null | undefined): unknown {
  if (!input) return undefined;
  try {
    return phpUnserialize(input);
  } catch {
    return undefined;
  }
}
