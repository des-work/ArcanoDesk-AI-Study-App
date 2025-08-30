import React, { createContext, useContext, useMemo, useState } from "react";

export type Screen = "gate" | "desk";

type FlowState = {
  screen: Screen;
  setScreen: (s: Screen) => void;
  gotoDesk: () => void;
  gotoGate: () => void;
};

const FlowCtx = createContext<FlowState | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>("gate");
  const value = useMemo<FlowState>(() => ({
    screen,
    setScreen,
    gotoDesk: () => setScreen("desk"),
    gotoGate: () => setScreen("gate"),
  }), [screen]);

  return <FlowCtx.Provider value={value}>{children}</FlowCtx.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowCtx);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}
