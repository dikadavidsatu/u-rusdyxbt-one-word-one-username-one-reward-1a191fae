/**
 * One Word, One Username, One Reward — make.fun entry.
 *
 * The whole job of this program is deliberately tiny: write the entrant's
 * own make.fun username, as one word and nothing else, to
 * `/output/entry.txt` (or to `$MAKEFUN_OUTPUT_DIR/entry.txt` when the
 * grader points the output elsewhere).
 *
 * The bounty is judged by a model that reads two usernames at a time and
 * picks the funnier or more interesting one. The first thing it weighs is
 * whether the text is a real make.fun username — the entrant's own handle.
 * So there is nothing clever to invent here: the entry is the handle
 * itself, `dikadavidsatu`, sent exactly as it is, with no explanation,
 * no links, no pitch and no padding tacked on.
 *
 * What this program does add, on top of the one-word write, is a strict
 * local check of the same gate the sealed scorer applies:
 *
 *   - the text is UTF-8, 1 to 30 characters long;
 *   - it is not only white space;
 *   - it is a single word (no spaces, no padding, no gloss).
 *
 * The program refuses to write anything that fails that gate, and after
 * writing it reads the file back and confirms byte-for-byte that what
 * landed on disk is exactly the handle it meant to send. The run is fully
 * deterministic: the same input always produces the same single file.
 *
 * Only Node built-ins are used, so the entry runs anywhere Node 22 does,
 * with nothing to install.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// The entry itself
// ---------------------------------------------------------------------------

/** The entrant's own make.fun handle. One word, 13 characters. */
const HANDLE = "dikadavidsatu";

/** The sealed gate, as the competition publishes it. */
const GATE = {
  /** Minimum length in characters (code points, not bytes). */
  MIN_CHARS: 1,
  /** Maximum length in characters. */
  MAX_CHARS: 30,
  /** Where the entry is written when the environment says nothing. */
  DEFAULT_OUTPUT_DIR: "/output",
  /** The single file the grader reads. */
  ENTRY_FILE: "entry.txt",
} as const;

// ---------------------------------------------------------------------------
// Small helpers, one job each
// ---------------------------------------------------------------------------

/**
 * Count characters the way the gate does: one count per Unicode code
 * point, so a multi-byte character still counts as one character.
 * (For this handle the count equals the byte count, which the ASCII
 * check below also pins down.)
 */
function countChars(text: string): number {
  return [...text].length;
}

/** True when the text holds at least one non-white-space character. */
function hasVisibleContent(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * True when the text is exactly one word: no white space anywhere and
 * no leading or trailing padding.
 */
function isSingleWord(text: string): boolean {
  return text.length > 0 && !/\s/.test(text) && text === text.trim();
}

/**
 * A handle is plain lowercase letters and digits. That keeps the entry
 * free of punctuation, separators and anything a reader could mistake
 * for an explanation or a second word, and it keeps the UTF-8 byte
 * length identical to the character count.
 */
function isPlainHandle(text: string): boolean {
  return /^[a-z0-9]+$/.test(text);
}

/** UTF-8 byte length of a string, for the read-back comparison. */
function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * Collect every way `text` breaks the published gate, as human-readable
 * reasons. An empty list means the text passes and may be written.
 */
function gateProblems(text: string): string[] {
  const problems: string[] = [];

  if (typeof text !== "string") {
    problems.push("entry must be a string");
    return problems;
  }

  const chars = countChars(text);
  if (chars < GATE.MIN_CHARS || chars > GATE.MAX_CHARS) {
    problems.push(
      `entry must be ${GATE.MIN_CHARS} to ${GATE.MAX_CHARS} characters ` +
        `(got ${chars})`,
    );
  }

  if (!hasVisibleContent(text)) {
    problems.push("entry must not be only white space");
  }

  if (!isSingleWord(text)) {
    problems.push("entry must be a single word with no spaces or padding");
  }

  if (!isPlainHandle(text)) {
    problems.push("entry must be lowercase letters and digits only");
  }

  // For a plain-ASCII handle, bytes equal characters; if that ever stops
  // being true, the gate's character count and the file's byte size would
  // disagree, so refuse rather than guess which one the scorer sees.
  if (byteLength(text) !== chars) {
    problems.push("entry must be plain ASCII so bytes equal characters");
  }

  return problems;
}

/**
 * Throw a single error listing every gate problem, or return quietly
 * when the text passes. Failing loudly here is the point: an invalid
 * entry is never written, so the grader never sees a file we knew was
 * wrong.
 */
function assertPassesGate(text: string): void {
  const problems = gateProblems(text);
  if (problems.length > 0) {
    throw new Error(`entry fails the gate: ${problems.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Where the entry goes. The grader sets MAKEFUN_OUTPUT_DIR; running by
 * hand with no variable falls back to /output, the path the rules name.
 */
function resolveOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  return GATE.DEFAULT_OUTPUT_DIR;
}

/**
 * Write `text` to `<dir>/entry.txt` and read it back to prove the file
 * on disk is byte-for-byte the text we meant to send. Returns the path
 * written, for the summary line.
 */
function writeEntry(dir: string, text: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, GATE.ENTRY_FILE);
  writeFileSync(path, text, "utf8");

  // Read-back: a write that silently truncated or re-encoded the text
  // would hand the judge a different entry, so verify before reporting.
  // Compare both the decoded text and the raw byte length, so an
  // encoding surprise cannot slip past a matching string comparison.
  const written = readFileSync(path, "utf8");
  if (written !== text || byteLength(written) !== byteLength(text)) {
    throw new Error(
      `read-back mismatch in ${path}: expected ${JSON.stringify(text)} ` +
        `(${byteLength(text)} bytes), ` +
        `found ${JSON.stringify(written)} (${byteLength(written)} bytes)`,
    );
  }
  return path;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function main(): void {
  // 1. The entry is the entrant's own handle, one word, nothing else.
  const entry = HANDLE;

  // 2. Refuse to write anything that fails the published gate.
  assertPassesGate(entry);

  // 3. Write it, then prove the file on disk matches exactly.
  const path = writeEntry(resolveOutputDir(), entry);

  // 4. One short summary line for the run log; the file itself stays
  //    bare — the judge reads the file, not stdout.
  console.log(
    `wrote ${countChars(entry)}-character entry to ${path}: ${entry}`,
  );
}

main();
