import React from "react";
import { flags } from "../lib/theme";

export const MotionContext = React.createContext({ enabled: flags.motionEnabled });
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionContext.Provider value={{ enabled: flags.motionEnabled }}>{children}</MotionContext.Provider>;
}
