import * as React from "react";
import { ipc } from "../../core/ipc";

export function DiagnosticsPanel(){
  const [open,setOpen] = React.useState<boolean>(false);
  const [health,setHealth] = React.useState<any>(null);

  React.useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.key === "F1"){ e.preventDefault(); setOpen(v=>!v); }
    };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  },[]);

  React.useEffect(()=>{
    if(!open) return;
    (async()=> setHealth(await ipc.ping()))();
  },[open]);

  if(!open) return null;
  return (
    <div style={{
      position:"fixed", right:12, top:12, zIndex:70,
      background:"#140f23ee", border:"1px solid #2a2142",
      borderRadius:12, padding:12, width:360, color:"#e9e4ff"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <b>Diagnostics (F1 to close)</b>
        <span className="small" style={{opacity:.75}}>Dev tools</span>
      </div>
      <div className="small" style={{opacity:.8, marginBottom:8}}>
        Health: {health?.ok ? "OK" : "Not Ready"} {health ? "" : "(checking…)"}
      </div>
      <div className="small" style={{opacity:.8, marginBottom:8}}>
        Port: {import.meta.env?.ARCANO_PY_PORT || import.meta.env?.VITE_ARCANO_PY_PORT || "5112"}
      </div>
      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
        <button className="button" onClick={async()=> setHealth(await ipc.ping())}>↻ Retry Health</button>
        <button className="button" onClick={()=> window.dispatchEvent(new CustomEvent("arcano-force-enter"))}>🛡 Force Enter</button>
      </div>
    </div>
  );
}
