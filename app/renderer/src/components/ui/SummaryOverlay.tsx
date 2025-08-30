import React from "react";
import { useUI } from "../../providers/UIProvider";

export function SummaryOverlay(){
  const { summary } = useUI();
  if (!summary.active) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{background:"rgba(10, 6, 18, 0.65)", backdropFilter:"blur(2px)"}}>
      <div className="card" style={{minWidth:320, maxWidth:480, background:"#161126", border:"1px solid #2b2047", borderRadius:16, padding:16}}>
        <div style={{fontWeight:800, marginBottom:8}}>Summoning Summary…</div>
        <div style={{height:10, borderRadius:8, background:"#2b2047", overflow:"hidden"}}>
          <div style={{
            width: `${Math.max(0, Math.min(100, summary.percent))}%`,
            height:"100%", background:"#7b5cff", transition:"width 200ms ease"
          }}/>
        </div>
        <div className="small" style={{marginTop:8, color:"#b9b1d6"}}>{summary.message||"Working…"}</div>
      </div>
    </div>
  );
}
