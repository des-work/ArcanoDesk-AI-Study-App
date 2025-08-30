import * as React from "react";
import { cn } from "../../lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"ghost" };
export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button({ className, variant="default", ...props }, ref){
  const base = "px-4 py-3 rounded-md font-bold transition-colors";
  const maps = {
    default: "bg-[var(--accent)] text-[#0c0a14] hover:opacity-95",
    ghost: "bg-transparent border border-edge/70 text-[var(--ink)] hover:bg-[#1a1530]"
  } as const;
  return <button ref={ref} className={cn(base, maps[variant], className)} {...props}/>;
});
