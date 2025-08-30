import React from "react";
import { flags } from "../lib/theme";

export const GraphicsContext = React.createContext({ enabled: flags.graphicsEnabled });
export function GraphicsProvider({ children }: { children: React.ReactNode }) {
  // Reserve container hook; only mounts when enabled
  return <GraphicsContext.Provider value={{ enabled: flags.graphicsEnabled }}>{children}</GraphicsContext.Provider>;
}
