// frontend/src/lib/scale/types.ts
//
// Types for the CECON TM-30Ab (and compatible) serial checkout-scale
// integration. The scale talks over RS232 — on the till PC that becomes a
// USB-to-serial COM port, which Chrome/Edge can open directly from the
// browser via the Web Serial API (no local bridge service required).
//
// We deliberately don't hard-code a single vendor protocol: cheap
// OEM/rebranded label-printing scales like this one rarely ship an English
// protocol spec, and guessing wrong would silently mis-price a sale. Instead
// we ship a robust generic ASCII parser plus a calibration workflow (raw
// data monitor + custom regex) so the exact framing can be confirmed
// against the real hardware once and then saved.

export type ParityOption = "none" | "even" | "odd";

export type ScaleTransport = "serial" | "network";

export interface ScaleSerialSettings {
  transport: ScaleTransport;
  // Local scale-agent WebSocket URL — used when transport === "network".
  // The agent runs on the same till PC as the browser (see scale-agent/),
  // relaying the DHNET box's TCP stream to this localhost socket, since a
  // browser can't reach the DHNET box on the LAN directly (mixed content)
  // and a serverless backend can't reach it at all (private network).
  agentUrl: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: ParityOption;
  // How the scale terminates each reading. Most continuous-output scales
  // send CRLF; some send bare CR or LF only.
  lineEnding: "crlf" | "cr" | "lf";
  // "auto" = generic decimal-number extraction (works for the vast
  // majority of ASCII continuous-output scales). "custom" = use
  // customPattern instead.
  parserMode: "auto" | "custom";
  // A JS regex *source* string. Must contain a named group `w` that
  // captures the numeric weight, e.g. "(?<w>[+-]?\\d+\\.?\\d*)".
  // Optional named group `mode` can capture a stability token (e.g. ST/US)
  // — if its captured text contains "U" we treat the reading as unstable.
  customPattern: string;
  // Unit the raw number is expressed in on the wire.
  wireUnit: "kg" | "g" | "lb";
  // Client-side stability detection (used in addition to / instead of any
  // stability flag the scale itself reports): weight is "stable" once the
  // last `stabilityWindowMs` of readings all sit within
  // `stabilityToleranceG` grams of each other.
  stabilityWindowMs: number;
  stabilityToleranceG: number;
  // Optional command string sent to the scale when the cashier presses
  // "Tare / Zero" in the app. Left blank by default since remote tare
  // commands aren't standardized across OEM scales — fill this in once
  // it's confirmed against the real unit (e.g. "T\r\n").
  tareCommand: string;
}

export const DEFAULT_SCALE_SETTINGS: ScaleSerialSettings = {
  transport: "network",
  agentUrl: "ws://localhost:4100",
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  lineEnding: "crlf",
  parserMode: "auto",
  customPattern: "(?<w>[+-]?\\d+\\.?\\d*)",
  wireUnit: "kg",
  stabilityWindowMs: 900,
  stabilityToleranceG: 2,
  tareCommand: "",
};

export type ScaleConnectionStatus =
  | "unsupported" // browser has no Web Serial API
  | "idle" // supported, not connected
  | "connecting"
  | "connected"
  | "error";

export interface ParsedScaleReading {
  raw: string;
  weightKg: number | null;
  // true/false when the line itself carries a recognizable stability
  // token, null when we can't tell from the line alone (we then fall back
  // to the client-side stability window).
  reportedStable: boolean | null;
  receivedAt: number;
}
