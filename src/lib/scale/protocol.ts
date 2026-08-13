// frontend/src/lib/scale/protocol.ts
import { ParsedScaleReading, ScaleSerialSettings } from "./types";

// Strips control characters (STX/ETX/DLE/ACK/... — common frame bytes on
// cheap ASCII scale protocols) so a regex doesn't have to account for them.
function stripControlChars(line: string): string {
  return line.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ").trim();
}

// Constructed via `new RegExp(...)` rather than a literal so it isn't
// subject to the project's ES2017 TS target (regex literals with named
// capture groups require targeting ES2018+ at the syntax-check level,
// even though every runtime this ships to supports them fine).
const AUTO_PATTERN = new RegExp("(?<w>[+-]?\\d+\\.?\\d*)");

function unitToKg(value: number, unit: ScaleSerialSettings["wireUnit"]): number {
  switch (unit) {
    case "g":
      return value / 1000;
    case "lb":
      return value * 0.45359237;
    case "kg":
    default:
      return value;
  }
}

/**
 * Parses a single line of raw text received from the scale into a weight
 * reading, using either the generic "grab the first number" parser or a
 * user-calibrated custom regex.
 */
export function parseScaleLine(
  rawLine: string,
  settings: ScaleSerialSettings,
): ParsedScaleReading {
  const cleaned = stripControlChars(rawLine);
  let pattern: RegExp;

  if (settings.parserMode === "custom" && settings.customPattern) {
    try {
      pattern = new RegExp(settings.customPattern);
    } catch {
      pattern = AUTO_PATTERN;
    }
  } else {
    pattern = AUTO_PATTERN;
  }

  const match = cleaned.match(pattern);
  const reportedStable = detectStabilityToken(cleaned, match?.groups?.mode);

  if (!match || match.groups?.w === undefined) {
    return { raw: rawLine, weightKg: null, reportedStable, receivedAt: Date.now() };
  }

  const num = parseFloat(match.groups.w);
  if (Number.isNaN(num)) {
    return { raw: rawLine, weightKg: null, reportedStable, receivedAt: Date.now() };
  }

  return {
    raw: rawLine,
    weightKg: unitToKg(num, settings.wireUnit),
    reportedStable,
    receivedAt: Date.now(),
  };
}

// A lot of ASCII continuous-output scales (CAS/DIGI/A&D and the many
// unbranded clones built on the same reference firmware, which is likely
// what the CECON TM-30Ab is) prefix each frame with a two-letter mode
// token — "ST" while the reading is settled, "US"/"QT" while it's still
// moving. We opportunistically look for that convention, but never *rely*
// on it: the client-side stability window (see useLiveScale) is always the
// source of truth for whether "Add to sale" is enabled.
function detectStabilityToken(line: string, capturedMode?: string): boolean | null {
  const haystack = (capturedMode ?? line).toUpperCase();
  if (/\bST\b/.test(haystack)) return true;
  if (/\bUS\b|\bQT\b|\bMOT\b/.test(haystack)) return false;
  return null;
}

/**
 * Splits a raw chunk of incoming bytes into complete lines based on the
 * configured line ending, returning the complete lines plus any leftover
 * partial line to prepend to the next chunk.
 */
export function splitLines(
  buffer: string,
  lineEnding: ScaleSerialSettings["lineEnding"],
): { lines: string[]; rest: string } {
  const sep = lineEnding === "crlf" ? "\r\n" : lineEnding === "cr" ? "\r" : "\n";
  const parts = buffer.split(sep);
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.length > 0), rest };
}
