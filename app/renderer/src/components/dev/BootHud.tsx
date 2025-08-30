import * as React from "react";
import { useBootTimings } from "@hooks/useBootTimings";

export default function BootHud(){
  const { marks, flags, errors } = useBootTimings(300);
  if (!import.meta.env.DEV) return null;

  const items = Object.entries(marks).sort((a,b)=> a[1]-b[1]);
  const start = marks["boot:start"] ?? 0;

  return (
    <div style={{
      position:"fixed", right:10, bottom:10, zIndex:9999,
      background:"#120d22cc", border:"1px solid #2b2047", borderRadius:12,
      padding:10, minWidth:240, color:"#e9e4ff", backdropFilter:"blur(4px)"
    }}>
      <div style={{fontWeight:800, marginBottom:6}}>Boot HUD</div>
      <div style={{fontSize:12, opacity:.9}}>
        <div>healthOk: <b>{String(flags.healthOk ?? false)}</b></div>
        <div>modelWarm: <b>{String(flags.modelWarm ?? false)}</b></div>
        <div>cacheHit: <b>{String(flags.cacheHit ?? false)}</b></div>
      </div>
      <div style={{marginTop:6, fontSize:12, maxHeight:120, overflow:"auto"}}>
        {items.map(([k,t])=>(
          <div key={k} style={{display:"flex", justifyContent:"space-between", gap:8}}>
            <span style={{opacity:.8}}>{k}</span>
            <span>{start ? (t-start).toFixed(0) : t.toFixed(0)}ms</span>
          </div>
        ))}
      </div>
      {!!errors?.length && (
        <div style={{marginTop:6, fontSize:12, color:"#ffd166"}}>
          {errors.slice(-3).map((e,i)=>(<div key={i}>⚠ {e}</div>))}
        </div>
      )}
    </div>
  );
}
