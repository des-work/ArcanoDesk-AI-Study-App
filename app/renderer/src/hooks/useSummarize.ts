import * as React from "react";
import { api } from "@core/api";
import { useUI } from "@store/ui";

export function useSummarize(){
  const { setSummaryBusy, setProgress } = useUI() as any;

  const run = React.useCallback(async (args: { path?:string; query?:string; max_words?:number; preset?:string })=>{
    setSummaryBusy?.(true);
    setProgress?.(5);
    try{
      setProgress?.(12);
      const out = await api.summarize(args);
      if (!out?.ok) throw new Error(out?.error || "Summarize failed");
      setProgress?.(95);
      return out;
    } finally {
      setProgress?.(100);
      setTimeout(()=>{ setSummaryBusy?.(false); setProgress?.(0); }, 300);
    }
  }, [setSummaryBusy, setProgress]);

  return { summarize: run };
}
