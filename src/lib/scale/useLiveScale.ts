// frontend/src/lib/scale/useLiveScale.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SCALE_SETTINGS,
  ScaleConnectionStatus,
  ScaleSerialSettings,
} from "./types";
import { parseScaleLine, splitLines } from "./protocol";

const SETTINGS_STORAGE_KEY = "pos.scale.settings.v1";
const RAW_LOG_LIMIT = 60;

function loadSettings(): ScaleSerialSettings {
  if (typeof window === "undefined") return DEFAULT_SCALE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SCALE_SETTINGS;
    return { ...DEFAULT_SCALE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCALE_SETTINGS;
  }
}

function saveSettings(settings: ScaleSerialSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private mode etc) — settings just won't persist
  }
}

interface Sample {
  t: number;
  kg: number;
}

export interface LiveScaleState {
  status: ScaleConnectionStatus;
  supported: boolean;
  errorMessage: string | null;
  deviceLabel: string | null;
  weightKg: number | null;
  isStable: boolean;
  rawLog: string[];
  settings: ScaleSerialSettings;
}

export interface LiveScaleApi extends LiveScaleState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  tare: () => Promise<void>;
  updateSettings: (patch: Partial<ScaleSerialSettings>) => void;
  clearRawLog: () => void;
}

export function useLiveScale(): LiveScaleApi {
  const supported =
    typeof window !== "undefined" && !!(window.navigator as Navigator).serial;

  const [status, setStatus] = useState<ScaleConnectionStatus>(
    supported ? "idle" : "unsupported",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [rawLog, setRawLog] = useState<string[]>([]);
  const [settings, setSettings] = useState<ScaleSerialSettings>(DEFAULT_SCALE_SETTINGS);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReadingRef = useRef(false);
  const samplesRef = useRef<Sample[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const pushRaw = useCallback((line: string) => {
    setRawLog((prev) => {
      const next = [...prev, line];
      return next.length > RAW_LOG_LIMIT ? next.slice(next.length - RAW_LOG_LIMIT) : next;
    });
  }, []);

  const evaluateStability = useCallback((kg: number, reportedStable: boolean | null) => {
    const now = Date.now();
    const cfg = settingsRef.current;
    const samples = [...samplesRef.current, { t: now, kg }].filter(
      (s) => now - s.t <= cfg.stabilityWindowMs,
    );
    samplesRef.current = samples;

    const spanning = now - samples[0].t >= cfg.stabilityWindowMs * 0.8;
    const toleranceKg = cfg.stabilityToleranceG / 1000;
    const min = Math.min(...samples.map((s) => s.kg));
    const max = Math.max(...samples.map((s) => s.kg));
    const withinTolerance = max - min <= toleranceKg;

    // If the scale itself reports motion, trust that immediately even
    // before our window fills up. If it reports settled, still require our
    // own tolerance check to pass (belt-and-braces against a protocol
    // guess that turns out to be wrong).
    if (reportedStable === false) return false;
    return spanning && withinTolerance;
  }, []);

  const readLoop = useCallback(
    async (port: SerialPort) => {
      const readable = port.readable;
      if (!readable) return;
      const reader = readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          buffer += decoder.decode(value, { stream: true });
          const { lines, rest } = splitLines(buffer, settingsRef.current.lineEnding);
          buffer = rest;
          for (const line of lines) {
            pushRaw(line);
            const parsed = parseScaleLine(line, settingsRef.current);
            if (parsed.weightKg !== null) {
              setWeightKg(parsed.weightKg);
              setIsStable(evaluateStability(parsed.weightKg, parsed.reportedStable));
            }
          }
        }
      } catch (err) {
        if (keepReadingRef.current) {
          setErrorMessage(
            err instanceof Error ? err.message : "Lost connection to the scale",
          );
          setStatus("error");
        }
      } finally {
        reader.releaseLock();
      }
    },
    [evaluateStability, pushRaw],
  );

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    try {
      await readerRef.current?.cancel();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
    try {
      await portRef.current?.close();
    } catch {
      /* ignore */
    }
    portRef.current = null;
    setStatus(supported ? "idle" : "unsupported");
    setWeightKg(null);
    setIsStable(false);
    setDeviceLabel(null);
    samplesRef.current = [];
  }, [supported]);

  const connect = useCallback(async () => {
    if (!supported) return;
    setErrorMessage(null);
    setStatus("connecting");
    try {
      const port = await window.navigator.serial!.requestPort();
      await port.open({
        baudRate: settingsRef.current.baudRate,
        dataBits: settingsRef.current.dataBits,
        stopBits: settingsRef.current.stopBits,
        parity: settingsRef.current.parity,
      });
      portRef.current = port;
      const info = port.getInfo();
      setDeviceLabel(
        info.usbVendorId
          ? `USB ${info.usbVendorId.toString(16)}:${info.usbProductId?.toString(16) ?? "?"}`
          : "Serial device",
      );
      port.addEventListener("disconnect", () => {
        disconnect();
      });
      keepReadingRef.current = true;
      setStatus("connected");
      readLoop(port);
    } catch (err) {
      // User cancelled the picker — not really an "error" state, just go
      // back to idle quietly.
      if (err instanceof Error && err.name === "NotFoundError") {
        setStatus("idle");
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Could not open the scale");
      setStatus("error");
    }
  }, [disconnect, readLoop, supported]);

  const tare = useCallback(async () => {
    const port = portRef.current;
    const cmd = settingsRef.current.tareCommand;
    if (!port || !port.writable || !cmd) return;
    const writer = port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(cmd));
    } finally {
      writer.releaseLock();
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<ScaleSerialSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const clearRawLog = useCallback(() => setRawLog([]), []);

  // Best-effort cleanup if the component unmounts (e.g. cashier navigates
  // away from the POS screen) while still connected.
  useEffect(() => {
    return () => {
      keepReadingRef.current = false;
      readerRef.current?.cancel().catch(() => {});
      portRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    status,
    supported,
    errorMessage,
    deviceLabel,
    weightKg,
    isStable,
    rawLog,
    settings,
    connect,
    disconnect,
    tare,
    updateSettings,
    clearRawLog,
  };
}
