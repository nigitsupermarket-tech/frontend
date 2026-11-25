"use client";

import { useEffect, useRef } from "react";

// Ctrl+P / Cmd+P as a keyboard alternative to the on-screen Print button.
//
// WHY THIS EXISTS: in the Calstins POS Bridge desktop app there is no
// browser print dialog behind Ctrl+P (the app menu has no Print item), so
// the keypress did nothing at all. Staff who couldn't reach the Print
// button — e.g. a very long receipt pushed it off-screen — had no way to
// print. Handling the key here routes it into the SAME print function the
// button uses (raw ESC/POS bridge first, browser print as fallback), so
// Ctrl+P and the button always behave identically.
//
// Pass `null` when there is nothing to print: the browser's own Ctrl+P is
// then left alone (so it still works normally on every other page).
const IFRAME_EVENT = "app:print-shortcut";

export function usePrintShortcut(handler: (() => void) | null) {
  // Always call the latest handler without re-subscribing on every render.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const active = handler !== null;

  useEffect(() => {
    if (!active) return;

    const run = () => handlerRef.current?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "p") return;
      e.preventDefault(); // never open the native print dialog as well
      e.stopPropagation();
      if (e.repeat) return; // holding the keys down must not print N times
      run();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener(IFRAME_EVENT, run);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener(IFRAME_EVENT, run);
    };
  }, [active]);
}

// Receipt previews are rendered in an <iframe srcDoc>. Once someone clicks
// or scrolls inside it, keyboard focus lives in the iframe's own document
// and its keydown events never reach the parent page — so Ctrl+P would
// silently stop working. Call this from the iframe's onLoad to forward
// that one shortcut up to usePrintShortcut.
export function forwardPrintShortcutFromIframe(
  iframe: HTMLIFrameElement | null,
) {
  const win = iframe?.contentWindow;
  if (!win) return;
  win.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "p") return;
      e.preventDefault();
      if (e.repeat) return;
      window.dispatchEvent(new Event(IFRAME_EVENT));
    },
    true,
  );
}
