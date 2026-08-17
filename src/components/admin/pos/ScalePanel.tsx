// frontend/src/components/admin/pos/ScalePanel.tsx
"use client";

import { useState } from "react";
import {
  Scale as ScaleIcon,
  X,
  Settings2,
  Terminal,
  Loader2,
  AlertCircle,
  Zap,
  ZapOff,
} from "lucide-react";
import { useScale } from "@/lib/scale/ScaleContext";
import { ScaleSerialSettings } from "@/lib/scale/types";

function formatKg(kg: number | null): string {
  if (kg === null) return "—";
  return kg.toFixed(3);
}

export default function ScalePanel() {
  const scale = useScale();
  const [open, setOpen] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);

  const statusColor =
    scale.status === "connected"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : scale.status === "connecting"
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : scale.status === "error"
          ? "bg-red-700 hover:bg-red-600 text-white"
          : "bg-gray-700 hover:bg-gray-600 text-gray-300";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${statusColor}`}
        title="Checkout scale"
      >
        {scale.status === "connecting" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : scale.status === "connected" ? (
          <Zap className="w-3 h-3" />
        ) : (
          <ZapOff className="w-3 h-3" />
        )}
        {scale.status === "connected"
          ? `${formatKg(scale.weightKg)} kg`
          : scale.status === "connecting"
            ? "Connecting…"
            : "Scale"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ScaleIcon className="w-4 h-4 text-green-700" />
                Checkout Scale
              </p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!scale.supported && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {scale.settings.transport === "network"
                      ? "This browser doesn't support WebSocket, which the local scale agent needs. Try a different browser."
                      : "This browser doesn't support the Web Serial API. Use desktop Chrome or Edge, or switch to the local network agent below."}
                  </span>
                </div>
              )}

              {scale.errorMessage && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{scale.errorMessage}</span>
                </div>
              )}

              {/* Live readout */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Live weight
                  </p>
                  <p className="text-3xl font-black text-gray-900 tabular-nums">
                    {formatKg(scale.weightKg)}{" "}
                    <span className="text-sm font-semibold text-gray-400">kg</span>
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    scale.status !== "connected"
                      ? "bg-gray-200 text-gray-500"
                      : scale.isStable
                        ? "bg-green-600 text-white"
                        : "bg-amber-400 text-white"
                  }`}
                >
                  {scale.status !== "connected"
                    ? "Offline"
                    : scale.isStable
                      ? "Stable"
                      : "Settling…"}
                </span>
              </div>

              {/* Connect / disconnect */}
              <div className="flex gap-2">
                {scale.status === "connected" ? (
                  <>
                    <button
                      onClick={() => scale.disconnect()}
                      className="flex-1 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={() => scale.tare()}
                      disabled={!scale.settings.tareCommand}
                      title={
                        scale.settings.tareCommand
                          ? "Send tare/zero command"
                          : "Set a tare command in settings first"
                      }
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Tare
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => scale.connect()}
                    disabled={!scale.supported || scale.status === "connecting"}
                    className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {scale.status === "connecting" ? "Connecting…" : "Connect scale"}
                  </button>
                )}
              </div>

              <ScaleSettingsForm
                settings={scale.settings}
                onChange={scale.updateSettings}
              />

              {/* Raw data monitor — this is the calibration tool: if the
                  live weight above doesn't track what's on the physical
                  scale, open this to see exactly what bytes are coming
                  over the wire and adjust the parser pattern to match. */}
              <div>
                <button
                  onClick={() => setShowMonitor((s) => !s)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  {showMonitor ? "Hide" : "Show"} raw data monitor
                </button>
                {showMonitor && (
                  <div className="mt-2 bg-gray-900 rounded-lg p-2 h-36 overflow-y-auto font-mono text-[10px] text-green-400 leading-tight">
                    {scale.rawLog.length === 0 ? (
                      <p className="text-gray-500">
                        Waiting for data from the scale…
                      </p>
                    ) : (
                      scale.rawLog.map((line, i) => <div key={i}>{line}</div>)
                    )}
                  </div>
                )}
                {showMonitor && scale.rawLog.length > 0 && (
                  <button
                    onClick={scale.clearRawLog}
                    className="mt-1 text-[10px] text-gray-400 hover:text-gray-700"
                  >
                    Clear log
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ScaleSettingsForm({
  settings,
  onChange,
}: {
  settings: ScaleSerialSettings;
  onChange: (patch: Partial<ScaleSerialSettings>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
      >
        <span className="flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5" />
          Connection settings
        </span>
        <span className="text-gray-400">{expanded ? "Hide" : "Show"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[10px] text-gray-400 leading-snug">
            &quot;Local network agent&quot; is the default and right choice for the
            CECON scale wired through the DHNET Ethernet box — see
            scale-agent/README.md. &quot;Direct USB serial&quot; only applies if a
            USB-to-RS232 cable runs straight from the scale into this PC.
          </p>

          <label className="text-[10px] font-semibold text-gray-500 block">
            Connection type
            <select
              value={settings.transport}
              onChange={(e) =>
                onChange({ transport: e.target.value as ScaleSerialSettings["transport"] })
              }
              className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
            >
              <option value="network">Local network agent (recommended)</option>
              <option value="serial">Direct USB serial cable</option>
            </select>
          </label>

          {settings.transport === "network" ? (
            <label className="text-[10px] font-semibold text-gray-500 block">
              Agent address
              <input
                value={settings.agentUrl}
                onChange={(e) => onChange({ agentUrl: e.target.value })}
                placeholder="ws://localhost:4100"
                className="mt-1 w-full text-xs font-mono border border-gray-200 rounded px-2 py-1.5"
              />
              <span className="text-[9px] text-gray-400 mt-1 block">
                Must be the scale-agent running on <b>this</b> till PC — always
                localhost, never the scale&apos;s own IP.
              </span>
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold text-gray-500">
                Baud rate
                <select
                  value={settings.baudRate}
                  onChange={(e) => onChange({ baudRate: Number(e.target.value) })}
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[10px] font-semibold text-gray-500">
                Data bits
                <select
                  value={settings.dataBits}
                  onChange={(e) => onChange({ dataBits: Number(e.target.value) as 7 | 8 })}
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  <option value={8}>8</option>
                  <option value={7}>7</option>
                </select>
              </label>

              <label className="text-[10px] font-semibold text-gray-500">
                Parity
                <select
                  value={settings.parity}
                  onChange={(e) =>
                    onChange({ parity: e.target.value as ScaleSerialSettings["parity"] })
                  }
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  <option value="none">None</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </label>

              <label className="text-[10px] font-semibold text-gray-500">
                Stop bits
                <select
                  value={settings.stopBits}
                  onChange={(e) => onChange({ stopBits: Number(e.target.value) as 1 | 2 })}
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>
          )}

          <label className="text-[10px] font-semibold text-gray-500 block">
            Line ending
            <select
              value={settings.lineEnding}
              onChange={(e) =>
                onChange({ lineEnding: e.target.value as ScaleSerialSettings["lineEnding"] })
              }
              className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
            >
              <option value="crlf">CR + LF</option>
              <option value="cr">CR only</option>
              <option value="lf">LF only</option>
            </select>
          </label>

          <label className="text-[10px] font-semibold text-gray-500 block">
            Weight unit on wire
            <select
              value={settings.wireUnit}
              onChange={(e) =>
                onChange({ wireUnit: e.target.value as ScaleSerialSettings["wireUnit"] })
              }
              className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="lb">lb</option>
            </select>
          </label>

          <div>
            <label className="text-[10px] font-semibold text-gray-500 flex items-center justify-between">
              Parser
              <select
                value={settings.parserMode}
                onChange={(e) =>
                  onChange({ parserMode: e.target.value as ScaleSerialSettings["parserMode"] })
                }
                className="text-xs border border-gray-200 rounded px-2 py-1"
              >
                <option value="auto">Auto (first number on the line)</option>
                <option value="custom">Custom pattern</option>
              </select>
            </label>
            {settings.parserMode === "custom" && (
              <input
                value={settings.customPattern}
                onChange={(e) => onChange({ customPattern: e.target.value })}
                placeholder="(?<w>[+-]?\d+\.?\d*)"
                className="mt-1.5 w-full text-xs font-mono border border-gray-200 rounded px-2 py-1.5"
              />
            )}
            <p className="text-[9px] text-gray-400 mt-1">
              Custom pattern must be a JS regex with a named group{" "}
              <code>(?&lt;w&gt;...)</code> around the weight digits. Use the raw
              data monitor below to see what the scale actually sends.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-gray-500">
              Stability window (ms)
              <input
                type="number"
                min={200}
                step={100}
                value={settings.stabilityWindowMs}
                onChange={(e) => onChange({ stabilityWindowMs: Number(e.target.value) })}
                className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
              />
            </label>
            <label className="text-[10px] font-semibold text-gray-500">
              Tolerance (g)
              <input
                type="number"
                min={0}
                step={1}
                value={settings.stabilityToleranceG}
                onChange={(e) => onChange({ stabilityToleranceG: Number(e.target.value) })}
                className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5"
              />
            </label>
          </div>

          <label className="text-[10px] font-semibold text-gray-500 block">
            Tare / zero command (optional)
            <input
              value={settings.tareCommand}
              onChange={(e) => onChange({ tareCommand: e.target.value })}
              placeholder="e.g. T\r\n — leave blank if unknown"
              className="mt-1 w-full text-xs font-mono border border-gray-200 rounded px-2 py-1.5"
            />
          </label>
        </div>
      )}
    </div>
  );
}
