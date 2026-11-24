import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The entry is the entrant's own make.fun handle, sent as one word.
const ENTRY = "dikadavidsatu";

function validate(text: string): void {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("entry must be a non-empty string");
  }
  if (text.length < 1 || text.length > 30) {
    throw new Error("entry must be 1 to 30 characters");
  }
  if (text.trim().length === 0) {
    throw new Error("entry must not be only whitespace");
  }
  if (/\s/.test(text)) {
    throw new Error("entry must be a single word with no whitespace");
  }
  if (text !== text.trim()) {
    throw new Error("entry must have no padding");
  }
  // A handle is plain lowercase letters and digits: no punctuation,
  // no separators, and its UTF-8 byte length must match its character
  // count so what the gate counts is exactly what is written.
  if (!/^[a-z0-9]+$/.test(text)) {
    throw new Error("entry must be lowercase letters and digits only");
  }
  if (new TextEncoder().encode(text).length !== text.length) {
    throw new Error("entry must be plain ASCII so bytes equal characters");
  }
}

validate(ENTRY);

const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "entry.txt"), ENTRY, "utf8");
