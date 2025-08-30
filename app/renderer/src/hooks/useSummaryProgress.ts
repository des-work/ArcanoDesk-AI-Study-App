import { useUI } from "../store/ui";

/** Imperative helpers to run during summarize calls */
export function useSummaryProgress(){
  const { setSummaryProgress } = useUI();
  return {
    start: (hint?: string)=> setSummaryProgress(true, 3, hint ?? "Preparing…"),
    tick:  (pct: number, hint?: string)=> setSummaryProgress(true, pct, hint ?? ""),
    done:  ()=> setSummaryProgress(false, 100, "Done"),
    fail:  (hint?: string)=> setSummaryProgress(false, 0, hint ?? "Failed")
  };
}
