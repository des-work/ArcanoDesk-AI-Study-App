import * as React from "react";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-[var(--card)] border border-edge/70 rounded-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]", className)} {...props} />;
}
