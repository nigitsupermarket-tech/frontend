// frontend/src/lib/scale/ScaleContext.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useLiveScale, LiveScaleApi } from "./useLiveScale";

const ScaleContext = createContext<LiveScaleApi | null>(null);

export function ScaleProvider({ children }: { children: ReactNode }) {
  const scale = useLiveScale();
  return <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>;
}

export function useScale(): LiveScaleApi {
  const ctx = useContext(ScaleContext);
  if (!ctx) {
    throw new Error("useScale must be used inside a <ScaleProvider>");
  }
  return ctx;
}
